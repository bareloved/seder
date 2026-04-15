import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { ValidationError } from "../_lib/errors";
import {
  enforceUserRateLimit,
  deviceRegisterRatelimit,
} from "@/lib/ratelimit";
import { withUser } from "@/db/client";
import { deviceTokens } from "@/db/schema";

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

    await withUser(userId, async (tx) => {
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
