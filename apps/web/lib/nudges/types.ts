export const nudgeTypes = [
  "overdue",
  "day_after_gig",
  "weekly_uninvoiced",
  "calendar_sync",
  "unpaid_check",
] as const;

export type NudgeType = (typeof nudgeTypes)[number];

export interface Nudge {
  id: string;
  nudgeType: NudgeType;
  entryId: string | null;
  periodKey: string | null;
  priority: number;
  title: string;
  description: string;
  actionType: "mark_sent" | "mark_paid" | "import_calendar" | "view_entry";
  entryDate?: string;
  entryDescription?: string;
  clientName?: string;
  amountGross?: number;
  daysSince?: number;
}

export interface NudgePushPreferences {
  overdue: boolean;
  day_after_gig: boolean;
  weekly_uninvoiced: boolean;
  calendar_sync: boolean;
  unpaid_check: boolean;
}

export const DEFAULT_NUDGE_PUSH_PREFS: NudgePushPreferences = {
  overdue: true,
  day_after_gig: true,
  weekly_uninvoiced: true,
  calendar_sync: true,
  unpaid_check: true,
};

export const DEFAULT_NUDGE_WEEKLY_DAY = 5; // Friday
