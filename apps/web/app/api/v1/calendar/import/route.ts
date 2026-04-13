import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { ValidationError } from "../../_lib/errors";
import {
  enforceUserRateLimit,
  calendarImportRatelimit,
} from "@/lib/ratelimit";
import { importIncomeEntriesFromCalendarForMonth } from "@/app/income/data";
import { getValidGoogleAccessToken } from "@/lib/googleTokens";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    await enforceUserRateLimit(calendarImportRatelimit, userId);
    const body = await request.json();
    const { year, month, calendarIds } = body;

    if (!year || !month) {
      throw new ValidationError("year and month are required");
    }

    const accessToken = await getValidGoogleAccessToken(userId);
    const importedCount = await importIncomeEntriesFromCalendarForMonth({
      year,
      month,
      userId,
      accessToken,
      calendarIds,
    });

    return apiSuccess({ importedCount }, 201);
  } catch (error) {
    return apiError(error);
  }
}
