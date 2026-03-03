// Calendar event from Google Calendar
export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  calendarId: string;
}

// Google Calendar metadata
export interface GoogleCalendar {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor: string;
  accessRole: string;
}
