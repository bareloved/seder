import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { db } from "@/db/client";
import { deviceTokens } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const userId = await requireAuth();
    const { token } = await params;

    await db
      .delete(deviceTokens)
      .where(and(eq(deviceTokens.userId, userId), eq(deviceTokens.token, token)));

    return apiSuccess({ unregistered: true });
  } catch (error) {
    return apiError(error);
  }
}
