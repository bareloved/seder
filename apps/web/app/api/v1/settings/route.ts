import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { db } from "@/db/client";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const userId = await requireAuth();
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));

    return apiSuccess(settings || null);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const [settings] = await db
      .update(userSettings)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();

    if (!settings) {
      // Create settings if they don't exist
      const [created] = await db
        .insert(userSettings)
        .values({ userId, ...body })
        .returning();
      return apiSuccess(created, 201);
    }

    return apiSuccess(settings);
  } catch (error) {
    return apiError(error);
  }
}
