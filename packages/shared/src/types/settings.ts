// User settings — platform-agnostic representation
export interface UserSettings {
  userId: string;
  language: string;
  timezone: string;
  theme: string;
  dateFormat: string;
  defaultCurrency: string;
  calendarSettings: CalendarSettings | null;
  onboardingCompleted: boolean;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarSettings {
  rules?: unknown[];
  defaultCalendarId?: string;
  autoSyncEnabled?: boolean;
  lastAutoSync?: string;
  selectedCalendarIds?: string[];
}
