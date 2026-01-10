import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { account } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { listUserCalendars } from "@/lib/googleCalendar";

export async function GET() {
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

        // Get the user's Google account
        const [googleAccount] = await db
            .select()
            .from(account)
            .where(
                and(
                    eq(account.userId, session.user.id),
                    eq(account.providerId, "google")
                )
            )
            .limit(1);

        if (!googleAccount?.accessToken) {
            return NextResponse.json(
                { error: "Google Calendar not connected" },
                { status: 404 }
            );
        }

        const calendars = await listUserCalendars(googleAccount.accessToken);

        return NextResponse.json({ calendars });
    } catch (error) {
        console.error("Failed to fetch calendars:", error);
        return NextResponse.json(
            { error: "Failed to fetch calendars" },
            { status: 500 }
        );
    }
}
