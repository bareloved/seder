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
}

interface DismissedState {
  entryId: string | null;
  nudgeType: string;
  periodKey: string | null;
  dismissedAt: Date;
  snoozeUntil: Date | null;
}

interface NudgeSettings {
  nudgeInvoiceDays: number;
  nudgePaymentDays: number;
}

const PRIORITY: Record<NudgeType, number> = {
  way_overdue: 1,
  overdue_payment: 2,
  partial_stale: 3,
  uninvoiced: 4,
  batch_invoice: 5,
  month_end: 6,
  unlogged_calendar: 7,
};

function daysBetween(dateStr: string | Date, now: Date): number {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function isLastDaysOfMonth(now: Date, days: number): boolean {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return now.getDate() > lastDay - days;
}

function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getMonthEndPeriodKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
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

    // Match by entryId for per-entry nudges
    if (entryId && d.entryId === entryId) {
      if (d.snoozeUntil && d.snoozeUntil < now) return false;
      return true;
    }

    // Match by periodKey for aggregate nudges
    if (periodKey && d.periodKey === periodKey) {
      if (d.snoozeUntil && d.snoozeUntil < now) return false;
      return true;
    }

    return false;
  });
}

function formatCurrency(amount: string): string {
  return `₪${Number(amount).toLocaleString("he-IL")}`;
}

export function computeNudges(
  entries: NudgeEntry[],
  dismissed: DismissedState[],
  settings: NudgeSettings
): Nudge[] {
  const now = new Date();
  const nudges: Nudge[] = [];
  let hasUninvoicedGigs = false;
  const uninvoicedEntries: NudgeEntry[] = [];

  for (const entry of entries) {
    if (entry.invoiceStatus === "cancelled") continue;
    if (entry.invoiceStatus === "paid" && entry.paymentStatus === "paid") continue;

    // --- Uninvoiced gig ---
    if (entry.invoiceStatus === "draft") {
      const days = daysBetween(entry.date, now);
      if (days >= settings.nudgeInvoiceDays) {
        hasUninvoicedGigs = true;
        uninvoicedEntries.push(entry);
        if (!isDismissed(dismissed, "uninvoiced", entry.id, null, now)) {
          nudges.push({
            id: `uninvoiced:${entry.id}`,
            nudgeType: "uninvoiced",
            entryId: entry.id,
            periodKey: null,
            priority: PRIORITY.uninvoiced,
            title: "עבודה ללא חשבונית",
            description: `${entry.description} (${formatCurrency(entry.amountGross)}) · ${days} ימים בלי חשבונית`,
            actionType: "mark_sent",
            entryDescription: entry.description,
            clientName: entry.clientName,
            amountGross: Number(entry.amountGross),
            daysSince: days,
          });
        }
      }
    }

    // --- Overdue payment / Way overdue ---
    if (entry.invoiceStatus === "sent" && entry.paymentStatus !== "paid") {
      const sentDate = entry.invoiceSentDate || entry.updatedAt;
      const days = daysBetween(sentDate, now);

      // Way overdue (30+ days)
      if (days >= 30) {
        if (!isDismissed(dismissed, "way_overdue", entry.id, null, now)) {
          nudges.push({
            id: `way_overdue:${entry.id}`,
            nudgeType: "way_overdue",
            entryId: entry.id,
            periodKey: null,
            priority: PRIORITY.way_overdue,
            title: "תשלום באיחור חמור",
            description: `${entry.clientName} · ${formatCurrency(entry.amountGross)} · ${days} יום מאז שליחת החשבונית`,
            actionType: "mark_paid",
            entryDescription: entry.description,
            clientName: entry.clientName,
            amountGross: Number(entry.amountGross),
            daysSince: days,
          });
        }
      }
      // Overdue payment (14+ days, but not way_overdue)
      else if (days >= settings.nudgePaymentDays) {
        if (!isDismissed(dismissed, "overdue_payment", entry.id, null, now)) {
          nudges.push({
            id: `overdue_payment:${entry.id}`,
            nudgeType: "overdue_payment",
            entryId: entry.id,
            periodKey: null,
            priority: PRIORITY.overdue_payment,
            title: "ממתין לתשלום",
            description: `${entry.clientName} · ${formatCurrency(entry.amountGross)} · ${days} יום מאז שליחת החשבונית`,
            actionType: "mark_paid",
            entryDescription: entry.description,
            clientName: entry.clientName,
            amountGross: Number(entry.amountGross),
            daysSince: days,
          });
        }
      }

      // Partial payment stale
      if (entry.paymentStatus === "partial") {
        const lastActivity = daysBetween(entry.updatedAt, now);
        if (lastActivity >= settings.nudgePaymentDays) {
          if (!isDismissed(dismissed, "partial_stale", entry.id, null, now)) {
            nudges.push({
              id: `partial_stale:${entry.id}`,
              nudgeType: "partial_stale",
              entryId: entry.id,
              periodKey: null,
              priority: PRIORITY.partial_stale,
              title: "תשלום חלקי תקוע",
              description: `${entry.clientName} · שולם חלקית, ${lastActivity} יום בלי פעילות`,
              actionType: "mark_paid",
              entryDescription: entry.description,
              clientName: entry.clientName,
              amountGross: Number(entry.amountGross),
              daysSince: lastActivity,
            });
          }
        }
      }
    }
  }

  // --- Batch invoice reminder (weekly aggregate) ---
  const weekDay = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
  if ((weekDay === 0 || weekDay === 5) && uninvoicedEntries.length >= 2) {
    const weekNum = getISOWeek(now);
    const periodKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
    if (!isDismissed(dismissed, "batch_invoice", null, periodKey, now)) {
      const totalAmount = uninvoicedEntries.reduce((sum, e) => sum + Number(e.amountGross), 0);
      nudges.push({
        id: `batch_invoice:${periodKey}`,
        nudgeType: "batch_invoice",
        entryId: null,
        periodKey,
        priority: PRIORITY.batch_invoice,
        title: "עבודות ממתינות לחשבונית",
        description: `יש ${uninvoicedEntries.length} עבודות בסך ${formatCurrency(String(totalAmount))} שממתינות לחשבונית`,
        actionType: "view_entry",
      });
    }
  }

  // --- Month-end closing nudge (aggregate) ---
  if (isLastDaysOfMonth(now, 3) && hasUninvoicedGigs) {
    const periodKey = getMonthEndPeriodKey(now);
    if (!isDismissed(dismissed, "month_end", null, periodKey, now)) {
      nudges.push({
        id: `month_end:${periodKey}`,
        nudgeType: "month_end",
        entryId: null,
        periodKey,
        priority: PRIORITY.month_end,
        title: "סוף חודש מתקרב",
        description: `יש ${uninvoicedEntries.length} עבודות בלי חשבונית לפני סוף החודש`,
        actionType: "view_entry",
      });
    }
  }

  // Sort by priority (lower number = higher priority)
  nudges.sort((a, b) => a.priority - b.priority);

  return nudges;
}
