import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { listUserCalendars } from "@/lib/googleCalendar";
import { withGoogleToken, GoogleTokenError } from "@/lib/googleTokens";

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

        const calendars = await withGoogleToken(
            session.user.id,
            (accessToken) => listUserCalendars(accessToken)
        );

        return NextResponse.json({ calendars });
    } catch (error) {
        console.error("Failed to fetch calendars:", error);

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
            { error: "Failed to fetch calendars" },
            { status: 500 }
        );
    }
}
