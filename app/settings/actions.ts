"use server";

import { db } from "@/db/client";
import { userSettings, incomeEntries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

export async function exportUserData() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        const entries = await db.select().from(incomeEntries).where(eq(incomeEntries.userId, session.user.id));

        // Convert to CSV string
        // Simple implementation
        const headers = ["ID", "Date", "Client", "Description", "Amount Gross", "Amount Paid", "Status", "Notes"];
        const rows = entries.map(e => [
            e.id,
            e.date,
            `"${e.clientName.replace(/"/g, '""')}"`, // Escape quotes
            `"${e.description.replace(/"/g, '""')}"`,
            e.amountGross,
            e.amountPaid,
            e.invoiceStatus,
            `"${(e.notes || "").replace(/"/g, '""')}"`
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        return { success: true, csv: csvContent };

    } catch (error) {
        console.error("Export failed:", error);
        return { success: false, error: "Export failed" };
    }
}

// --- Danger Actions ---

export async function deleteUserAccount() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        // Cascade delete should handle related records if configured in DB, 
        // but Drizzle/Postgres foreign keys need to be set up for ON DELETE CASCADE.
        // If not, we manually delete related data.

        await db.transaction(async (tx) => {
            // Delete income entries
            await tx.delete(incomeEntries).where(eq(incomeEntries.userId, session.user.id));
            // Delete settings
            await tx.delete(userSettings).where(eq(userSettings.userId, session.user.id));
            // Auth data is usually handled by auth provider logic or separate cleanup
            // but we can try to clean up user record if we own it
            // For better-auth, we might need to use its API or delete from auth tables directly

            // Attempt delete from auth tables (if accessible directly via schema)
            // However, auth.api.deleteUser might be safer if available
        });

        // TODO: Call auth provider deletion if necessary

        return { success: true };
    } catch (error) {
        console.error("Account deletion failed:", error);
        return { success: false, error: "Deletion failed" };
    }
}
