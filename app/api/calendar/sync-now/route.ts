import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { account, userSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { listEventsForMonth, CalendarEvent } from "@/lib/googleCalendar";
import { importIncomeEntriesFromCalendarForMonth } from "@/app/income/data";
import { classifyByRules, DEFAULT_RULES } from "@/lib/classificationRules";

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

        // Get Google account
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
            return NextResponse.json(
                { error: "Google Calendar not connected" },
                { status: 400 }
            );
        }

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

        // Fetch calendar events
        const events = await listEventsForMonth(year, month, googleAccount.accessToken, calendarIds);

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
            // Update lastAutoSync timestamp
            await updateLastSyncTimestamp(userId, calendarSettings);

            return NextResponse.json({
                imported: 0,
                message: "No work events found to import",
            });
        }

        // Import only work events
        const imported = await importIncomeEntriesFromCalendarForMonth({
            year,
            month,
            userId,
            accessToken: googleAccount.accessToken,
            calendarIds,
        });

        // Update lastAutoSync timestamp
        await updateLastSyncTimestamp(userId, calendarSettings);

        return NextResponse.json({
            imported,
            totalEvents: events.length,
            workEvents: workEvents.length,
        });
    } catch (error) {
        console.error("Sync failed:", error);
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
