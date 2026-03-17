import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { ValidationError } from "../_lib/errors";
import { db } from "@/db/client";
import { feedback } from "@/db/schema";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const { message, platform, category } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new ValidationError("נא להזין הודעה");
    }

    if (message.length > 5000) {
      throw new ValidationError("ההודעה ארוכה מדי (עד 5000 תווים)");
    }

    await db.insert(feedback).values({
      userId,
      message: message.trim(),
      category: String(category || "general"),
      platform: String(platform || "web"),
    });

    return apiSuccess({ sent: true });
  } catch (error) {
    return apiError(error);
  }
}
