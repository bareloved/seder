import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { ValidationError } from "../_lib/errors";
import {
  enforceUserRateLimit,
  deviceRegisterRatelimit,
} from "@/lib/ratelimit";
import { withAdminBypass } from "@/db/client";
import { deviceTokens } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    await enforceUserRateLimit(deviceRegisterRatelimit, userId);
    const { token, platform } = await request.json();

    if (!token || !platform) {
      throw new ValidationError("token and platform are required");
    }
    if (!["ios", "android"].includes(platform)) {
      throw new ValidationError("platform must be 'ios' or 'android'");
    }

    // Claim the device token for this user. A physical device only ever
    // belongs to one logged-in user at a time — drop any prior owner so
    // they stop receiving pushes meant for them on this device.
    await withAdminBypass(async (tx) => {
      await tx
        .delete(deviceTokens)
        .where(
          and(eq(deviceTokens.token, token), ne(deviceTokens.userId, userId))
        );
      await tx
        .insert(deviceTokens)
        .values({ userId, token, platform })
        .onConflictDoNothing();
    });

    return apiSuccess({ registered: true }, 201);
  } catch (error) {
    return apiError(error);
  }
}
