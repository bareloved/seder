import { google } from "googleapis";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Environment validation
// ─────────────────────────────────────────────────────────────────────────────

function validateEnvVars() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!email) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL environment variable"
    );
  }
  if (!privateKey) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY environment variable"
    );
  }
  if (!calendarId) {
    throw new Error("Missing GOOGLE_CALENDAR_ID environment variable");
  }

  return { email, privateKey, calendarId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Calendar client
// ─────────────────────────────────────────────────────────────────────────────

function getCalendarClient() {
  const { email, privateKey } = validateEnvVars();

  // Handle the case where the key contains literal "\n" characters
  // (common when stored in .env files)
  const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: formattedPrivateKey,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

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

/**
 * Calculate date range: from N months before to M months after a given month.
 */
function getExtendedDateRangeISO(
  year: number,
  month: number,
  monthsBefore: number,
  monthsAfter: number
): { timeMin: string; timeMax: string } {
  // Calculate start date (N months before)
  const startDate = new Date(year, month - 1 - monthsBefore, 1, 0, 0, 0, 0);

  // Calculate end date (M months after, last day of that month)
  const endYear = month + monthsAfter > 12 ? year + Math.floor((month + monthsAfter - 1) / 12) : year;
  const endMonth = ((month + monthsAfter - 1) % 12) + 1;
  const lastDay = new Date(endYear, endMonth, 0).getDate();
  const endDate = new Date(endYear, endMonth - 1, lastDay, 23, 59, 59, 999);

  return {
    timeMin: startDate.toISOString(),
    timeMax: endDate.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main function: List events for a given month
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches all events from the configured Google Calendar for a specific month.
 *
 * @param year - The year (e.g., 2024)
 * @param month - The month (1-12)
 * @returns Array of calendar events with id, summary, start, and end dates
 */
export async function listEventsForMonth(
  year: number,
  month: number
): Promise<CalendarEvent[]> {
  const { calendarId } = validateEnvVars();
  const calendar = getCalendarClient();
  const { timeMin, timeMax } = getMonthBoundsISO(year, month);

  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];

    // Map to our simplified CalendarEvent type
    return events
      .filter((event) => {
        // Only include events that have an id and some form of start/end
        return event.id && (event.start?.dateTime || event.start?.date);
      })
      .map((event) => {
        // Handle both dateTime (regular events) and date (all-day events)
        const startDateStr = event.start?.dateTime || event.start?.date;
        const endDateStr = event.end?.dateTime || event.end?.date;

        // For all-day events (date only), parse at midnight
        const start = startDateStr
          ? new Date(startDateStr)
          : new Date();
        const end = endDateStr
          ? new Date(endDateStr)
          : start;

        return {
          id: event.id!,
          summary: event.summary || "אירוע ללא שם",
          start,
          end,
        };
      });
  } catch (error) {
    console.error("Failed to fetch Google Calendar events:", error);
    throw new Error(
      `Failed to fetch calendar events: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Fetches all events from the configured Google Calendar for an extended date range.
 * Useful for importing events around a given month (e.g., ±2 months).
 *
 * @param year - The center year
 * @param month - The center month (1-12)
 * @param monthsBefore - Number of months before to include (default: 2)
 * @param monthsAfter - Number of months after to include (default: 2)
 * @returns Array of calendar events with id, summary, start, and end dates
 */
export async function listEventsForDateRange(
  year: number,
  month: number,
  monthsBefore: number = 2,
  monthsAfter: number = 2
): Promise<CalendarEvent[]> {
  const { calendarId } = validateEnvVars();
  const calendar = getCalendarClient();
  const { timeMin, timeMax } = getExtendedDateRangeISO(year, month, monthsBefore, monthsAfter);

  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250, // Increase limit for larger date range
    });

    const events = response.data.items || [];

    // Map to our simplified CalendarEvent type
    return events
      .filter((event) => {
        // Only include events that have an id and some form of start/end
        return event.id && (event.start?.dateTime || event.start?.date);
      })
      .map((event) => {
        // Handle both dateTime (regular events) and date (all-day events)
        const startDateStr = event.start?.dateTime || event.start?.date;
        const endDateStr = event.end?.dateTime || event.end?.date;

        // For all-day events (date only), parse at midnight
        const start = startDateStr
          ? new Date(startDateStr)
          : new Date();
        const end = endDateStr
          ? new Date(endDateStr)
          : start;

        return {
          id: event.id!,
          summary: event.summary || "אירוע ללא שם",
          start,
          end,
        };
      });
  } catch (error) {
    console.error("Failed to fetch Google Calendar events:", error);
    throw new Error(
      `Failed to fetch calendar events: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

