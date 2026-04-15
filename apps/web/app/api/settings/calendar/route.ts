import { auth } from "@/lib/auth";
import { withUser } from "@/db/client";
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

        const userId = session.user.id;
        const settings = await withUser(userId, async (tx) => {
            const [row] = await tx
                .select()
                .from(userSettings)
                .where(eq(userSettings.userId, userId))
                .limit(1);
            return row;
        });

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
