"use server";

import { db } from "@/db/client";
import { userSettings, incomeEntries, categories, clients, session, account, user } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { verifyPassword } from "better-auth/crypto";

// --- Settings Actions ---

export async function updateUserSettings(data: any) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const existingSettings = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id));

        if (existingSettings.length > 0) {
            await db.update(userSettings)
                .set({
                    language: data.language,
                    timezone: data.timezone,
                    defaultCurrency: data.defaultCurrency,
                    calendarSettings: data.calendarSettings, // Careful with merging vs overwriting
                    updatedAt: new Date()
                })
                .where(eq(userSettings.userId, session.user.id));
        } else {
            await db.insert(userSettings).values({
                userId: session.user.id,
                language: data.language || "he",
                timezone: data.timezone || "Asia/Jerusalem",
                defaultCurrency: data.defaultCurrency || "ILS",
                calendarSettings: data.calendarSettings || {},
            });
        }

        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        console.error("Failed to update settings:", error);
        return { success: false, error: "Failed to update settings" };
    }
}

// --- Calendar Settings Actions ---

export async function updateCalendarSettings(data: {
    autoSyncEnabled?: boolean;
    selectedCalendarIds?: string[];
}) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const existingSettings = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, session.user.id));

        const currentCalendarSettings = existingSettings[0]?.calendarSettings || {};

        // Merge new settings with existing ones
        const mergedCalendarSettings = {
            ...currentCalendarSettings,
            ...(data.autoSyncEnabled !== undefined && { autoSyncEnabled: data.autoSyncEnabled }),
            ...(data.selectedCalendarIds !== undefined && { selectedCalendarIds: data.selectedCalendarIds }),
        };

        if (existingSettings.length > 0) {
            await db.update(userSettings)
                .set({
                    calendarSettings: mergedCalendarSettings,
                    updatedAt: new Date()
                })
                .where(eq(userSettings.userId, session.user.id));
        } else {
            await db.insert(userSettings).values({
                userId: session.user.id,
                calendarSettings: mergedCalendarSettings,
            });
        }

        revalidatePath("/settings");
        return { success: true };
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

export async function exportUserData(options: ExportOptions) {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const csvParts: string[] = [];

        // Export income entries
        if (options.includeIncomeEntries) {
            let dateConditions = [eq(incomeEntries.userId, session.user.id)];

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

            const entries = await db
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
            const userCategories = await db
                .select()
                .from(categories)
                .where(eq(categories.userId, session.user.id));

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

    try {
        const existingSettings = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, session.user.id));

        if (existingSettings.length > 0) {
            await db.update(userSettings)
                .set({
                    onboardingCompleted: true,
                    onboardingCompletedAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(userSettings.userId, session.user.id));
        } else {
            await db.insert(userSettings).values({
                userId: session.user.id,
                onboardingCompleted: true,
                onboardingCompletedAt: new Date(),
            });
        }

        revalidatePath("/income");
        return { success: true };
    } catch (error) {
        console.error("Failed to complete onboarding:", error);
        return { success: false, error: "Failed to complete onboarding" };
    }
}

// --- Danger Actions ---

export async function deleteUserAccountWithPassword(password: string) {
    const currentSession = await auth.api.getSession({
        headers: await headers(),
    });

    if (!currentSession) {
        return { success: false, error: "לא מחובר" };
    }

    const userId = currentSession.user.id;

    try {
        // Get the credential account to verify password
        const credentialAccount = await db
            .select()
            .from(account)
            .where(
                and(
                    eq(account.userId, userId),
                    eq(account.providerId, "credential")
                )
            )
            .limit(1);

        if (credentialAccount.length === 0 || !credentialAccount[0].password) {
            return { success: false, error: "לא ניתן לאמת סיסמה עבור חשבון זה" };
        }

        // Verify password
        const passwordMatch = await verifyPassword({
            hash: credentialAccount[0].password,
            password: password,
        });

        if (!passwordMatch) {
            return { success: false, error: "סיסמה שגויה" };
        }

        // Delete all user data in correct order (respecting foreign keys)
        await db.transaction(async (tx) => {
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
