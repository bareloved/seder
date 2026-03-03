import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { listEventsForMonth } from "@/lib/googleCalendar";
import { importIncomeEntriesFromCalendarForMonth } from "@/app/income/data";
import { classifyByRules, DEFAULT_RULES } from "@/lib/classificationRules";
import { withGoogleToken, GoogleTokenError } from "@/lib/googleTokens";

const WORK_CONFIDENCE_THRESHOLD = 0.7;

export async function POST() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        // Get user settings for calendar IDs
        const [settings] = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, userId))
            .limit(1);

        const calendarSettings = settings?.calendarSettings || {};
        const calendarIds = calendarSettings.selectedCalendarIds || ["primary"];

        // Get current month
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        // Use withGoogleToken to handle token refresh automatically
        const result = await withGoogleToken(userId, async (accessToken) => {
            // Fetch calendar events
            const events = await listEventsForMonth(year, month, accessToken, calendarIds);

            // Get classification rules from settings or use defaults
            const rules = calendarSettings.rules || DEFAULT_RULES;

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
                return {
                    imported: 0,
                    message: "No work events found to import",
                    totalEvents: events.length,
                    workEvents: 0,
                };
            }

            // Import only work events
            const imported = await importIncomeEntriesFromCalendarForMonth({
                year,
                month,
                userId,
                accessToken,
                calendarIds,
            });

            return {
                imported,
                totalEvents: events.length,
                workEvents: workEvents.length,
            };
        });

        // Update lastAutoSync timestamp
        await updateLastSyncTimestamp(userId, calendarSettings);

        return NextResponse.json(result);
    } catch (error) {
        console.error("Sync failed:", error);

        if (error instanceof GoogleTokenError) {
            return NextResponse.json(
                {
                    error: error.message,
                    requiresReconnect: error.requiresReconnect,
                },
                { status: error.requiresReconnect ? 401 : 500 }
            );
        }

        return NextResponse.json(
            { error: "Sync failed" },
            { status: 500 }
        );
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
