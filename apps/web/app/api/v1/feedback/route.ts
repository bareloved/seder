import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { ValidationError } from "../_lib/errors";
import { enforceUserRateLimit, feedbackRatelimit } from "@/lib/ratelimit";
import { withUser } from "@/db/client";
import { feedback } from "@/db/schema";

const FeedbackInput = z.object({
  message: z
    .string()
    .trim()
    .min(1, "נא להזין הודעה")
    .max(5000, "ההודעה ארוכה מדי (עד 5000 תווים)"),
  category: z.enum(["general", "bug", "feature"]).default("general"),
  platform: z.enum(["web", "ios"]).default("web"),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    await enforceUserRateLimit(feedbackRatelimit, userId);
    const body = await request.json();

    let parsed: z.infer<typeof FeedbackInput>;
    try {
      parsed = FeedbackInput.parse(body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const first = err.issues[0];
        throw new ValidationError(first?.message || "קלט לא תקין", err.issues);
      }
      throw err;
    }

    await withUser(userId, async (tx) => {
      await tx.insert(feedback).values({
        userId,
        message: parsed.message,
        category: parsed.category,
        platform: parsed.platform,
      });
    });

    return apiSuccess({ sent: true });
  } catch (error) {
    return apiError(error);
  }
}
