import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

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

        const [settings] = await db
            .select()
            .from(userSettings)
            .where(eq(userSettings.userId, session.user.id))
            .limit(1);

        const calendarSettings = settings?.calendarSettings || {};

        return NextResponse.json(calendarSettings);
    } catch (error) {
        console.error("Failed to fetch calendar settings:", error);
        return NextResponse.json(
            { error: "Failed to fetch calendar settings" },
            { status: 500 }
        );
    }
}
