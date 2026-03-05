import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { account } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

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

        // Delete the Google account entry
        const result = await db
            .delete(account)
            .where(
                and(
                    eq(account.userId, session.user.id),
                    eq(account.providerId, "google")
                )
            )
            .returning({ id: account.id });

        if (result.length === 0) {
            return NextResponse.json(
                { error: "No Google account found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to disconnect Google account:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
