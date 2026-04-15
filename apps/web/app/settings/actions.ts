"use server";

import { withUser, withAdminBypass } from "@/db/client";
import { userSettings, incomeEntries, categories, clients, session, account, user } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

import type { NudgePushPreferences } from "@/lib/nudges/types";

// --- Settings Actions ---

export async function updateUserSettings(data: any) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    try {
        return await withUser(userId, async (tx) => {
            const existingSettings = await tx.select().from(userSettings).where(eq(userSettings.userId, userId));

            if (existingSettings.length > 0) {
                await tx.update(userSettings)
                    .set({
                        language: data.language,
                        timezone: data.timezone,
                        defaultCurrency: data.defaultCurrency,
                        calendarSettings: data.calendarSettings, // Careful with merging vs overwriting
                        updatedAt: new Date()
                    })
                    .where(eq(userSettings.userId, userId));
            } else {
                await tx.insert(userSettings).values({
                    userId: userId,
                    language: data.language || "he",
                    timezone: data.timezone || "Asia/Jerusalem",
                    defaultCurrency: data.defaultCurrency || "ILS",
                    calendarSettings: data.calendarSettings || {},
                });
            }

            revalidatePath("/settings");
            return { success: true };
        });
    } catch (error) {
        console.error("Failed to update settings:", error);
        return { success: false, error: "Failed to update settings" };
    }
}

// --- Nudge Settings Actions ---

export async function getNudgeSettingsAction() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");

  const { getNudgeSettings } = await import("@/lib/nudges/queries");
  const { DEFAULT_NUDGE_PUSH_PREFS } = await import("@/lib/nudges/types");
  const settings = await getNudgeSettings(session.user.id);
  return settings;
}

export async function updateNudgeSettings(data: {
  nudgeWeeklyDay: number;
  nudgePushEnabled: NudgePushPreferences;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  await withUser(userId, async (tx) => {
    await tx
      .update(userSettings)
      .set({
        nudgeWeeklyDay: data.nudgeWeeklyDay,
        nudgePushEnabled: data.nudgePushEnabled,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId));
  });

  revalidatePath("/settings");
}

// --- Calendar Settings Actions ---

export async function updateCalendarSettings(data: {
    autoSyncEnabled?: boolean;
    selectedCalendarIds?: string[];
    rules?: any[];
}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    try {
        return await withUser(userId, async (tx) => {
            const existingSettings = await tx
                .select()
                .from(userSettings)
                .where(eq(userSettings.userId, userId));

            const currentCalendarSettings = existingSettings[0]?.calendarSettings || {};

            // Merge new settings with existing ones
            const mergedCalendarSettings = {
                ...currentCalendarSettings,
                ...(data.autoSyncEnabled !== undefined && { autoSyncEnabled: data.autoSyncEnabled }),
                ...(data.selectedCalendarIds !== undefined && { selectedCalendarIds: data.selectedCalendarIds }),
                ...(data.rules !== undefined && { rules: data.rules }),
            };

            if (existingSettings.length > 0) {
                await tx.update(userSettings)
                    .set({
                        calendarSettings: mergedCalendarSettings,
                        updatedAt: new Date()
                    })
                    .where(eq(userSettings.userId, userId));
            } else {
                await tx.insert(userSettings).values({
                    userId: userId,
                    calendarSettings: mergedCalendarSettings,
                });
            }

            revalidatePath("/settings");
            return { success: true };
        });
    } catch (error) {
        console.error("Failed to update calendar settings:", error);
        return { success: false, error: "Failed to update calendar settings" };
    }
}

// --- Data Actions ---

export type ExportOptions = {
    includeIncomeEntries: boolean;
    includeCategories: boolean;
    dateRange: "all" | "thisYear" | "thisMonth" | "custom";
    customStartDate?: string;
    customEndDate?: string;
};

type ExportResult =
    | { success: true; csv: string }
    | { success: false; error: string };

export async function exportUserData(options: ExportOptions): Promise<ExportResult> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    try {
        return await withUser(userId, async (tx) => {
            const csvParts: string[] = [];

            // Export income entries
            if (options.includeIncomeEntries) {
                let dateConditions = [eq(incomeEntries.userId, userId)];

                // Apply date filters
                if (options.dateRange === "thisYear") {
                    const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
                    dateConditions.push(gte(incomeEntries.date, startOfYear));
                } else if (options.dateRange === "thisMonth") {
                    const now = new Date();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
                    dateConditions.push(gte(incomeEntries.date, startOfMonth));
                } else if (options.dateRange === "custom" && options.customStartDate && options.customEndDate) {
                    dateConditions.push(gte(incomeEntries.date, options.customStartDate));
                    dateConditions.push(lte(incomeEntries.date, options.customEndDate));
                }

                const entries = await tx
                    .select()
                    .from(incomeEntries)
                    .where(and(...dateConditions));

                if (entries.length > 0) {
                    const incomeHeaders = [
                        "תאריך",
                        "תיאור",
                        "לקוח",
                        "סכום ברוטו",
                        "סכום ששולם",
                        "אחוז מעמ",
                        "כולל מעמ",
                        "סטטוס חשבונית",
                        "סטטוס תשלום",
                        "הערות",
                    ];
                    const incomeRows = entries.map((e) => [
                        e.date,
                        `"${e.description.replace(/"/g, '""')}"`,
                        `"${e.clientName.replace(/"/g, '""')}"`,
                        e.amountGross,
                        e.amountPaid,
                        e.vatRate,
                        e.includesVat ? "כן" : "לא",
                        e.invoiceStatus,
                        e.paymentStatus,
                        `"${(e.notes || "").replace(/"/g, '""')}"`,
                    ]);

                    csvParts.push("# הכנסות");
                    csvParts.push(incomeHeaders.join(","));
                    csvParts.push(...incomeRows.map((r) => r.join(",")));
                }
            }

            // Export categories
            if (options.includeCategories) {
                const userCategories = await tx
                    .select()
                    .from(categories)
                    .where(eq(categories.userId, userId));

                if (userCategories.length > 0) {
                    if (csvParts.length > 0) csvParts.push(""); // Empty line separator

                    const categoryHeaders = ["שם", "צבע", "אייקון", "מאורכב"];
                    const categoryRows = userCategories.map((c) => [
                        `"${c.name.replace(/"/g, '""')}"`,
                        c.color,
                        c.icon,
                        c.isArchived ? "כן" : "לא",
                    ]);

                    csvParts.push("# קטגוריות");
                    csvParts.push(categoryHeaders.join(","));
                    csvParts.push(...categoryRows.map((r) => r.join(",")));
                }
            }

            if (csvParts.length === 0) {
                return { success: false, error: "אין נתונים לייצוא" };
            }

            // Add BOM for Excel Hebrew support
            const bom = "\uFEFF";
            const csvContent = bom + csvParts.join("\n");

            return { success: true, csv: csvContent };
        });
    } catch (error) {
        console.error("Export failed:", error);
        return { success: false, error: "הייצוא נכשל" };
    }
}

// --- Onboarding Actions ---

export async function completeOnboarding() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    try {
        return await withUser(userId, async (tx) => {
            const existingSettings = await tx
                .select()
                .from(userSettings)
                .where(eq(userSettings.userId, userId));

            if (existingSettings.length > 0) {
                await tx.update(userSettings)
                    .set({
                        onboardingCompleted: true,
                        onboardingCompletedAt: new Date(),
                        updatedAt: new Date()
                    })
                    .where(eq(userSettings.userId, userId));
            } else {
                await tx.insert(userSettings).values({
                    userId: userId,
                    onboardingCompleted: true,
                    onboardingCompletedAt: new Date(),
                });
            }

            revalidatePath("/income");
            return { success: true };
        });
    } catch (error) {
        console.error("Failed to complete onboarding:", error);
        return { success: false, error: "Failed to complete onboarding" };
    }
}

// --- Password Actions ---

export async function setPasswordForOAuthUser(newPassword: string) {
    const currentSession = await auth.api.getSession({
        headers: await headers(),
    });

    if (!currentSession) {
        return { success: false, error: "לא מחובר" };
    }

    try {
        await auth.api.setPassword({
            body: { newPassword },
            headers: await headers(),
        });

        return { success: true };
    } catch (error: any) {
        console.error("Failed to set password:", error);
        return { success: false, error: error?.message || "שגיאה בהגדרת הסיסמה" };
    }
}

export async function hasCredentialAccount() {
    const currentSession = await auth.api.getSession({
        headers: await headers(),
    });

    if (!currentSession) {
        return false;
    }

    const userId = currentSession.user.id;

    return await withUser(userId, async (tx) => {
        const accounts = await tx
            .select({ providerId: account.providerId })
            .from(account)
            .where(eq(account.userId, userId));

        return accounts.some((a) => a.providerId === "credential");
    });
}

// --- Danger Actions ---

export async function deleteUserAccount() {
    const currentSession = await auth.api.getSession({
        headers: await headers(),
    });

    if (!currentSession) {
        return { success: false, error: "לא מחובר" };
    }

    const userId = currentSession.user.id;

    try {
        // Delete all user data in correct order (respecting foreign keys).
        // Use withAdminBypass because this spans user-scoped tables AND
        // Better Auth tables (session, account, user). The eq(X.userId, userId)
        // filters on each delete are critical — with bypass on, they're the
        // only thing scoping the deletes to the target user.
        await withAdminBypass(async (tx) => {
            // 1. Delete income entries (has FKs to categories, clients, user)
            await tx.delete(incomeEntries).where(eq(incomeEntries.userId, userId));

            // 2. Delete categories (FK to user)
            await tx.delete(categories).where(eq(categories.userId, userId));

            // 3. Delete clients (FK to user)
            await tx.delete(clients).where(eq(clients.userId, userId));

            // 4. Delete sessions (FK to user)
            await tx.delete(session).where(eq(session.userId, userId));

            // 5. Delete accounts (FK to user)
            await tx.delete(account).where(eq(account.userId, userId));

            // 6. Delete user settings (FK to user, is PK)
            await tx.delete(userSettings).where(eq(userSettings.userId, userId));

            // 7. Delete user (parent - delete last)
            await tx.delete(user).where(eq(user.id, userId));
        });

        return { success: true };
    } catch (error) {
        console.error("Account deletion failed:", error);
        return { success: false, error: "מחיקת החשבון נכשלה" };
    }
}
