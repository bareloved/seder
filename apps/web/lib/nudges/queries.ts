import { db } from "@/db/client";
import { incomeEntries, dismissedNudges, userSettings } from "@/db/schema";
import { eq, and, or, ne } from "drizzle-orm";
import { DEFAULT_NUDGE_INVOICE_DAYS, DEFAULT_NUDGE_PAYMENT_DAYS, DEFAULT_NUDGE_PUSH_PREFS } from "./types";
import type { NudgePushPreferences } from "./types";

/**
 * Fetch entries that could generate nudges:
 * - drafts (potential uninvoiced nudges)
 * - sent + not fully paid (potential overdue/partial nudges)
 * Excludes cancelled and fully-paid entries.
 */
export async function fetchNudgeableEntries(userId: string) {
  return db
    .select()
    .from(incomeEntries)
    .where(
      and(
        eq(incomeEntries.userId, userId),
        ne(incomeEntries.invoiceStatus, "cancelled"),
        or(
          eq(incomeEntries.invoiceStatus, "draft"),
          and(
            eq(incomeEntries.invoiceStatus, "sent"),
            ne(incomeEntries.paymentStatus, "paid")
          )
        )
      )
    );
}

/**
 * Fetch all active dismissed/snoozed nudges for a user.
 */
export async function fetchDismissedNudges(userId: string) {
  return db
    .select()
    .from(dismissedNudges)
    .where(eq(dismissedNudges.userId, userId));
}

/**
 * Get user's nudge settings with defaults.
 */
export async function getNudgeSettings(userId: string) {
  const [settings] = await db
    .select({
      nudgeInvoiceDays: userSettings.nudgeInvoiceDays,
      nudgePaymentDays: userSettings.nudgePaymentDays,
      nudgePushEnabled: userSettings.nudgePushEnabled,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return {
    nudgeInvoiceDays: settings?.nudgeInvoiceDays
      ? Number(settings.nudgeInvoiceDays)
      : DEFAULT_NUDGE_INVOICE_DAYS,
    nudgePaymentDays: settings?.nudgePaymentDays
      ? Number(settings.nudgePaymentDays)
      : DEFAULT_NUDGE_PAYMENT_DAYS,
    nudgePushEnabled: (settings?.nudgePushEnabled ?? DEFAULT_NUDGE_PUSH_PREFS) as NudgePushPreferences,
  };
}

/**
 * Dismiss or snooze a nudge.
 * Uses separate paths for per-entry vs aggregate nudges to match the correct unique index.
 */
export async function dismissNudge(
  userId: string,
  nudgeType: string,
  entryId: string | null,
  periodKey: string | null,
  snoozeUntil: Date | null
) {
  if (entryId) {
    await db
      .insert(dismissedNudges)
      .values({ userId, entryId, nudgeType, dismissedAt: new Date(), snoozeUntil })
      .onConflictDoUpdate({
        target: [dismissedNudges.userId, dismissedNudges.entryId, dismissedNudges.nudgeType],
        set: { dismissedAt: new Date(), snoozeUntil },
      });
  } else {
    await db
      .insert(dismissedNudges)
      .values({ userId, nudgeType, periodKey, dismissedAt: new Date(), snoozeUntil })
      .onConflictDoUpdate({
        target: [dismissedNudges.userId, dismissedNudges.nudgeType, dismissedNudges.periodKey],
        set: { dismissedAt: new Date(), snoozeUntil },
      });
  }
}

/**
 * Update lastPushedAt for a nudge (push dedup tracking).
 */
export async function markNudgePushed(
  userId: string,
  nudgeType: string,
  entryId: string | null,
  periodKey: string | null
) {
  const now = new Date();
  if (entryId) {
    await db
      .insert(dismissedNudges)
      .values({ userId, entryId, nudgeType, dismissedAt: now, lastPushedAt: now })
      .onConflictDoUpdate({
        target: [dismissedNudges.userId, dismissedNudges.entryId, dismissedNudges.nudgeType],
        set: { lastPushedAt: now },
      });
  } else {
    await db
      .insert(dismissedNudges)
      .values({ userId, nudgeType, periodKey, dismissedAt: now, lastPushedAt: now })
      .onConflictDoUpdate({
        target: [dismissedNudges.userId, dismissedNudges.nudgeType, dismissedNudges.periodKey],
        set: { lastPushedAt: now },
      });
  }
}
