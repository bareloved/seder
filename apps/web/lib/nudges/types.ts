export const nudgeTypes = [
  "uninvoiced",
  "batch_invoice",
  "overdue_payment",
  "way_overdue",
  "partial_stale",
  "unlogged_calendar",
  "month_end",
] as const;

export type NudgeType = (typeof nudgeTypes)[number];

export interface Nudge {
  id: string; // composite key for dedup: `${nudgeType}:${entryId || periodKey}`
  nudgeType: NudgeType;
  entryId: string | null; // null for aggregate nudges
  periodKey: string | null; // e.g. '2026-W11', '2026-03' for aggregate nudges
  priority: number; // lower = higher priority (1=overdue, 2=uninvoiced, 3=suggestion)
  title: string; // Hebrew display title
  description: string; // Hebrew description with amounts/dates
  actionType: "mark_sent" | "mark_paid" | "import_calendar" | "view_entry";
  entryDescription?: string; // entry description for context
  clientName?: string;
  amountGross?: number;
  daysSince?: number; // days since the triggering event
}

export interface NudgePushPreferences {
  uninvoiced: boolean;
  batch_invoice: boolean;
  overdue_payment: boolean;
  way_overdue: boolean;
  partial_stale: boolean;
  unlogged_calendar: boolean;
  month_end: boolean;
}

export const DEFAULT_NUDGE_PUSH_PREFS: NudgePushPreferences = {
  uninvoiced: true,
  batch_invoice: true,
  overdue_payment: true,
  way_overdue: true,
  partial_stale: true,
  unlogged_calendar: false,
  month_end: true,
};

export const DEFAULT_NUDGE_INVOICE_DAYS = 3;
export const DEFAULT_NUDGE_PAYMENT_DAYS = 14;
