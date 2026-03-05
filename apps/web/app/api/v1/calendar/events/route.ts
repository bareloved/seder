import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { ValidationError } from "../../_lib/errors";
import { listEventsForMonth } from "@/lib/googleCalendar";
import { getValidGoogleAccessToken } from "@/lib/googleTokens";
import { getImportedCalendarEventIds } from "@/app/income/data";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = request.nextUrl;
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));
    const calendarIds = searchParams.get("calendarIds")?.split(",").filter(Boolean);

    if (!year || !month) {
      throw new ValidationError("year and month are required");
    }

    const accessToken = await getValidGoogleAccessToken(userId);
    const events = await listEventsForMonth(year, month, accessToken, calendarIds);

    // Mark already-imported events
    const eventIds = events.map((e) => e.id);
    const importedIds = eventIds.length > 0
      ? await getImportedCalendarEventIds(userId, eventIds)
      : [];
    const importedSet = new Set(importedIds);

    const eventsWithStatus = events.map((event) => ({
      ...event,
      alreadyImported: importedSet.has(event.id),
    }));

    return apiSuccess(eventsWithStatus);
  } catch (error) {
    return apiError(error);
  }
}
