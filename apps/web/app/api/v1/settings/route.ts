import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { withUser } from "@/db/client";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const userId = await requireAuth();
    const settings = await withUser(userId, async (tx) => {
      const [row] = await tx
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId));
      return row || null;
    });

    return apiSuccess(settings);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const result = await withUser(userId, async (tx) => {
      const [settings] = await tx
        .update(userSettings)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(userSettings.userId, userId))
        .returning();

      if (!settings) {
        // Create settings if they don't exist
        const [created] = await tx
          .insert(userSettings)
          .values({ userId, ...body })
          .returning();
        return { settings: created, created: true };
      }

      return { settings, created: false };
    });

    if (result.created) {
      return apiSuccess(result.settings, 201);
    }
    return apiSuccess(result.settings);
  } catch (error) {
    return apiError(error);
  }
}
