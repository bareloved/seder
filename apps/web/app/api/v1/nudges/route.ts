import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { getNudgesForUser } from "@/app/income/data";
import { dismissNudge } from "@/lib/nudges/queries";

// GET /api/v1/nudges — fetch all active nudges for the user
export async function GET() {
  try {
    const userId = await requireAuth();
    const nudges = await getNudgesForUser(userId);
    return apiSuccess(nudges);
  } catch (error) {
    return apiError(error);
  }
}

// POST /api/v1/nudges — dismiss or snooze a nudge
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const { nudgeType, entryId, periodKey, snooze, snoozeDays } = body as {
      nudgeType: string;
      entryId: string | null;
      periodKey: string | null;
      snooze?: boolean;
      snoozeDays?: number;
    };

    let snoozeUntil: Date | null = null;
    if (snoozeDays && snoozeDays > 0) {
      snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + snoozeDays);
    } else if (snooze) {
      snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + 3);
    }

    await dismissNudge(userId, nudgeType, entryId, periodKey, snoozeUntil);

    return apiSuccess({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
