import type { Nudge, NudgeType } from "./types";

interface NudgeEntry {
  id: string;
  date: string;
  description: string;
  clientName: string;
  amountGross: string;
  invoiceStatus: string;
  paymentStatus: string;
  invoiceSentDate: string | null;
  paidDate: string | null;
  updatedAt: Date;
  calendarEventId: string | null;
  rollingJobId: string | null;
  detachedFromTemplate: boolean;
}

interface DismissedState {
  entryId: string | null;
  nudgeType: string;
  periodKey: string | null;
  dismissedAt: Date;
  snoozeUntil: Date | null;
  lastPushedAt?: Date | null;
}

const PRIORITY: Record<NudgeType, number> = {
  overdue: 1,
  day_after_gig: 2,
  weekly_uninvoiced: 3,
  calendar_sync: 4,
  unpaid_check: 5,
};

function daysBetween(dateStr: string | Date, now: Date): number {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCurrency(amount: string): string {
  return `₪${Number(amount).toLocaleString("he-IL")}`;
}

function isDismissed(
  dismissed: DismissedState[],
  nudgeType: NudgeType,
  entryId: string | null,
  periodKey: string | null,
  now: Date
): boolean {
  return dismissed.some((d) => {
    if (d.nudgeType !== nudgeType) return false;

    // Push-dedup-only rows (created by markNudgePushed, never dismissed by user)
    // should not hide nudges from the in-app view
    if (d.lastPushedAt && !d.snoozeUntil) return false;

    if (entryId && d.entryId === entryId) {
      if (d.snoozeUntil && d.snoozeUntil < now) return false;
      return true;
    }
    if (periodKey && d.periodKey === periodKey) {
      if (d.snoozeUntil && d.snoozeUntil < now) return false;
      return true;
    }
    return false;
  });
}

function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function computeOverdue(entries: NudgeEntry[], dismissed: DismissedState[], now: Date): Nudge[] {
  const nudges: Nudge[] = [];

  for (const entry of entries) {
    if (entry.invoiceStatus !== "sent") continue;
    if (entry.paymentStatus === "paid") continue;

    const sentDate = entry.invoiceSentDate || entry.updatedAt;
    const days = daysBetween(sentDate, now);
    if (days < 30) continue;

    if (!isDismissed(dismissed, "overdue", entry.id, null, now)) {
      nudges.push({
        id: `overdue:${entry.id}`,
        nudgeType: "overdue",
        entryId: entry.id,
        periodKey: null,
        priority: PRIORITY.overdue,
        title: "חשבונית לא שולמה מעל 30 יום",
        description: `${entry.clientName} - ${entry.description} (${formatCurrency(entry.amountGross)})`,
        actionType: "mark_paid",
        entryDate: entry.date,
        entryDescription: entry.description,
        clientName: entry.clientName,
        amountGross: Number(entry.amountGross),
        daysSince: days,
      });
    }
  }

  return nudges;
}

function computeDayAfterGig(entries: NudgeEntry[], dismissed: DismissedState[], now: Date): Nudge[] {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  const nudges: Nudge[] = [];

  for (const entry of entries) {
    if (entry.invoiceStatus !== "draft") continue;
    if (entry.date !== yesterdayStr) continue;
    // Only manually-created entries (not rolling jobs)
    if (entry.rollingJobId) continue;

    if (!isDismissed(dismissed, "day_after_gig", entry.id, null, now)) {
      nudges.push({
        id: `day_after_gig:${entry.id}`,
        nudgeType: "day_after_gig",
        entryId: entry.id,
        periodKey: null,
        priority: PRIORITY.day_after_gig,
        title: "שלחת חשבונית על אתמול?",
        description: entry.description,
        actionType: "mark_sent",
        entryDate: entry.date,
        entryDescription: entry.description,
        clientName: entry.clientName,
        amountGross: Number(entry.amountGross),
      });
    }
  }

  return nudges;
}

function computeWeeklyUninvoiced(
  entries: NudgeEntry[],
  dismissed: DismissedState[],
  now: Date,
  weeklyDay: number
): Nudge[] {
  if (now.getDay() !== weeklyDay) return [];

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 7);
  cutoff.setHours(0, 0, 0, 0);

  const uninvoiced = entries.filter(
    (e) => e.invoiceStatus === "draft" && new Date(e.date) >= cutoff
  );

  if (uninvoiced.length === 0) return [];

  const weekNum = getISOWeek(now);
  const periodKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;

  if (isDismissed(dismissed, "weekly_uninvoiced", null, periodKey, now)) return [];

  const totalAmount = uninvoiced.reduce((sum, e) => sum + Number(e.amountGross), 0);

  return [{
    id: `weekly_uninvoiced:${periodKey}`,
    nudgeType: "weekly_uninvoiced",
    entryId: null,
    periodKey,
    priority: PRIORITY.weekly_uninvoiced,
    title: "עבודות ממתינות לחשבונית",
    description: `יש לך ${uninvoiced.length} עבודות בסך ${formatCurrency(String(totalAmount))} שממתינות לחשבונית`,
    actionType: "view_entry",
    entryDate: now.toISOString().split("T")[0],
  }];
}

export function computeNudges(
  entries: NudgeEntry[],
  dismissed: DismissedState[],
  weeklyDay: number = 5
): Nudge[] {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const filteredEntries = entries.filter((e) => {
    // Skip future unpaid rolling-job rows — they haven't happened yet.
    if (e.rollingJobId && e.date > todayStr) return false;
    return true;
  });

  const filtered = filteredEntries.filter(
    (e) => e.invoiceStatus !== "cancelled" &&
      !(e.invoiceStatus === "paid" && e.paymentStatus === "paid")
  );

  const nudges = [
    ...computeOverdue(filtered, dismissed, now),
    ...computeDayAfterGig(filtered, dismissed, now),
    ...computeWeeklyUninvoiced(filtered, dismissed, now, weeklyDay),
  ];

  nudges.sort((a, b) => a.priority - b.priority);
  return nudges;
}
