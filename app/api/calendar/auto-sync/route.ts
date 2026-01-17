import { db } from "@/db/client";
import { account, userSettings, incomeEntries, type NewIncomeEntry } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { listEventsForMonth, GoogleCalendarAuthError } from "@/lib/googleCalendar";
import { classifyByRules, DEFAULT_RULES, type ClassificationRule } from "@/lib/classificationRules";
import { DEFAULT_VAT_RATE } from "@/app/income/types";

const WORK_CONFIDENCE_THRESHOLD = 0.7;
const CRON_SECRET = process.env.CRON_SECRET;

interface SyncResult {
    userId: string;
    imported: number;
    error?: string;
}

export async function GET(request: Request) {
    try {
        // Verify cron secret for security
        const authHeader = request.headers.get("authorization");
        if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Find all users with autoSyncEnabled = true
        const usersWithAutoSync = await db
            .select({
                userId: userSettings.userId,
                calendarSettings: userSettings.calendarSettings,
            })
            .from(userSettings)
            .where(
                sql`${userSettings.calendarSettings}->>'autoSyncEnabled' = 'true'`
            );

        if (usersWithAutoSync.length === 0) {
            return NextResponse.json({
                message: "No users with auto-sync enabled",
                processed: 0,
            });
        }

        const results: SyncResult[] = [];

        // Process each user
        for (const user of usersWithAutoSync) {
            try {
                const result = await syncUserCalendar(user.userId, user.calendarSettings || {});
                results.push(result);
            } catch (error) {
                console.error(`Failed to sync for user ${user.userId}:`, error);
                results.push({
                    userId: user.userId,
                    imported: 0,
                    error: error instanceof Error ? error.message : "Unknown error",
                });
            }

            // Small delay between users to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
        const successful = results.filter((r) => !r.error).length;
        const failed = results.filter((r) => r.error).length;

        return NextResponse.json({
            message: `Auto-sync completed`,
            processed: usersWithAutoSync.length,
            successful,
            failed,
            totalImported,
        });
    } catch (error) {
        console.error("Auto-sync cron failed:", error);
        return NextResponse.json(
            { error: "Auto-sync failed" },
            { status: 500 }
        );
    }
}

async function syncUserCalendar(
    userId: string,
    calendarSettings: Record<string, unknown>
): Promise<SyncResult> {
    // Get user's Google account
    const [googleAccount] = await db
        .select()
        .from(account)
        .where(
            and(
                eq(account.userId, userId),
                eq(account.providerId, "google")
            )
        )
        .limit(1);

    if (!googleAccount?.accessToken) {
        return {
            userId,
            imported: 0,
            error: "No Google account connected",
        };
    }

    const calendarIds = (calendarSettings.selectedCalendarIds as string[]) || ["primary"];
    const rules = (calendarSettings.rules as ClassificationRule[]) || DEFAULT_RULES;

    // Get current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
        // Fetch calendar events
        const events = await listEventsForMonth(year, month, googleAccount.accessToken, calendarIds);

        if (events.length === 0) {
            await updateLastSyncTimestamp(userId, calendarSettings);
            return { userId, imported: 0 };
        }

        // Classify events
        const classifications = classifyByRules(
            events.map((e) => ({ id: e.id, summary: e.summary, calendarId: e.calendarId })),
            rules
        );

        // Filter to only work events above confidence threshold
        const workEventIds = new Set(
            classifications
                .filter((c) => c.isWork && c.confidence >= WORK_CONFIDENCE_THRESHOLD)
                .map((c) => c.eventId)
        );

        const workEvents = events.filter((e) => workEventIds.has(e.id));

        if (workEvents.length === 0) {
            await updateLastSyncTimestamp(userId, calendarSettings);
            return { userId, imported: 0 };
        }

        // Prepare rows to insert
        const rowsToInsert: NewIncomeEntry[] = workEvents.map((event) => {
            const dateString = event.start.toISOString().split("T")[0];
            return {
                date: dateString,
                description: event.summary || "אירוע מהיומן",
                clientName: "",
                amountGross: "0",
                amountPaid: "0",
                vatRate: DEFAULT_VAT_RATE.toString(),
                includesVat: true,
                invoiceStatus: "draft" as const,
                paymentStatus: "unpaid" as const,
                calendarEventId: event.id,
                notes: "יובא אוטומטית מהיומן",
                userId,
            };
        });

        // Insert with deduplication
        const result = await db
            .insert(incomeEntries)
            .values(rowsToInsert)
            .onConflictDoNothing({
                target: [incomeEntries.userId, incomeEntries.calendarEventId],
            })
            .returning({ id: incomeEntries.id });

        const imported = result.length;

        // Update lastAutoSync timestamp
        await updateLastSyncTimestamp(userId, calendarSettings);

        return { userId, imported };
    } catch (error) {
        if (error instanceof GoogleCalendarAuthError) {
            return {
                userId,
                imported: 0,
                error: "Token expired or revoked",
            };
        }
        throw error;
    }
}

async function updateLastSyncTimestamp(
    userId: string,
    currentSettings: Record<string, unknown>
) {
    const updatedSettings = {
        ...currentSettings,
        lastAutoSync: new Date().toISOString(),
    };

    await db
        .update(userSettings)
        .set({
            calendarSettings: updatedSettings,
            updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, userId));
}
