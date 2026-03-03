import type { KyInstance } from "ky";
import type { CalendarEvent, GoogleCalendar } from "@seder/shared";
import type { ApiResponse } from "./types";

interface CalendarEventWithStatus extends CalendarEvent {
  alreadyImported: boolean;
}

export function createCalendarApi(client: KyInstance) {
  return {
    list: () =>
      client.get("api/v1/calendar/list").json<ApiResponse<{ connected: boolean; calendars: GoogleCalendar[] }>>(),

    events: (year: number, month: number, calendarIds?: string[]) =>
      client.get("api/v1/calendar/events", {
        searchParams: {
          year: String(year),
          month: String(month),
          ...(calendarIds ? { calendarIds: calendarIds.join(",") } : {}),
        },
      }).json<ApiResponse<CalendarEventWithStatus[]>>(),

    import: (year: number, month: number, calendarIds?: string[]) =>
      client.post("api/v1/calendar/import", {
        json: { year, month, calendarIds },
      }).json<ApiResponse<{ importedCount: number }>>(),
  };
}
