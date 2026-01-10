import { google } from "googleapis";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  calendarId: string;  // Track which calendar this event came from
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor: string;
  accessRole: string;  // 'owner' | 'writer' | 'reader' | 'freeBusyReader'
}

export class GoogleCalendarAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleCalendarAuthError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Calendar client
// ─────────────────────────────────────────────────────────────────────────────

function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  return google.calendar({ version: "v3", auth });
}

// ─────────────────────────────────────────────────────────────────────────────
// Date utilities
// ─────────────────────────────────────────────────────────────────────────────

function getMonthBoundsISO(
  year: number,
  month: number
): { timeMin: string; timeMax: string } {
  // Start of month: first day at 00:00:00
  const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);

  // End of month: last day at 23:59:59
  const lastDay = new Date(year, month, 0).getDate();
  const endOfMonth = new Date(year, month - 1, lastDay, 23, 59, 59, 999);

  return {
    timeMin: startOfMonth.toISOString(),
    timeMax: endOfMonth.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// List user's calendars
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all calendars the user has access to (owned and subscribed).
 *
 * @param accessToken - The user's Google OAuth access token
 * @returns Array of calendars with id, summary, primary flag, and color
 */
export async function listUserCalendars(
  accessToken: string
): Promise<GoogleCalendar[]> {
  const calendar = getCalendarClient(accessToken);

  try {
    const response = await calendar.calendarList.list({
      showHidden: false,
      minAccessRole: "reader",
    });

    const calendars = response.data.items || [];

    return calendars
      .filter((cal) => cal.id && cal.summary)
      .map((cal) => ({
        id: cal.id!,
        summary: cal.summary!,
        primary: cal.primary ?? false,
        backgroundColor: cal.backgroundColor || "#4285f4",
        accessRole: cal.accessRole || "reader",
      }));
  } catch (error) {
    console.error("Failed to fetch Google calendars:", error);
    const status =
      (error as { code?: number; response?: { status?: number } })?.code ??
      (error as { code?: number; response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      throw new GoogleCalendarAuthError("Google access token is expired or revoked");
    }
    throw new Error(
      `Failed to fetch calendars: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// List events for a given month
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all events from the specified Google Calendars for a specific month.
 * If no calendarIds provided, defaults to the primary calendar.
 *
 * @param year - The year (e.g., 2024)
 * @param month - The month (1-12)
 * @param accessToken - The user's Google OAuth access token
 * @param calendarIds - Optional array of calendar IDs to fetch from. Defaults to ["primary"]
 * @returns Array of calendar events with id, summary, start, end dates, and calendarId
 */
export async function listEventsForMonth(
  year: number,
  month: number,
  accessToken: string,
  calendarIds: string[] = ["primary"]
): Promise<CalendarEvent[]> {
  const calendar = getCalendarClient(accessToken);
  const { timeMin, timeMax } = getMonthBoundsISO(year, month);

  try {
    // Fetch events from all requested calendars in parallel
    const eventPromises = calendarIds.map(async (calendarId) => {
      try {
        const response = await calendar.events.list({
          calendarId,
          timeMin,
          timeMax,
          singleEvents: true,
          orderBy: "startTime",
          fields: "items(id,summary,start,end)",
          maxResults: 500,
        });

        const events = response.data.items || [];

        return events
          .filter((event) => {
            return event.id && (event.start?.dateTime || event.start?.date);
          })
          .map((event) => {
            const startDateStr = event.start?.dateTime || event.start?.date;
            const endDateStr = event.end?.dateTime || event.end?.date;

            const start = startDateStr ? new Date(startDateStr) : new Date();
            const end = endDateStr ? new Date(endDateStr) : start;

            return {
              id: event.id!,
              summary: event.summary || "אירוע ללא שם",
              start,
              end,
              calendarId,
            };
          });
      } catch (calError) {
        // Log but don't fail entirely if one calendar fails
        console.warn(`Failed to fetch events from calendar ${calendarId}:`, calError);
        return [];
      }
    });

    const allEventsArrays = await Promise.all(eventPromises);
    const allEvents = allEventsArrays.flat();

    // Deduplicate events that might appear in multiple calendars (by event ID)
    const seenIds = new Set<string>();
    const uniqueEvents = allEvents.filter((event) => {
      if (seenIds.has(event.id)) {
        return false;
      }
      seenIds.add(event.id);
      return true;
    });

    // Sort by start time
    uniqueEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

    return uniqueEvents;
  } catch (error) {
    console.error("Failed to fetch Google Calendar events:", error);
    const status =
      (error as { code?: number; response?: { status?: number } })?.code ??
      (error as { code?: number; response?: { status?: number } })?.response?.status;
    if (status === 401 || status === 403) {
      throw new GoogleCalendarAuthError("Google access token is expired or revoked");
    }
    throw new Error(
      `Failed to fetch calendar events: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
