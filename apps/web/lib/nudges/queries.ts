import { db } from "@/db/client";
import { incomeEntries, dismissedNudges, userSettings } from "@/db/schema";
import { eq, and, or, ne } from "drizzle-orm";
import { DEFAULT_NUDGE_PUSH_PREFS, DEFAULT_NUDGE_WEEKLY_DAY } from "./types";
import type { NudgePushPreferences } from "./types";

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

export async function fetchDismissedNudges(userId: string) {
  return db
    .select()
    .from(dismissedNudges)
    .where(eq(dismissedNudges.userId, userId));
}

export async function getNudgeSettings(userId: string) {
  const [settings] = await db
    .select({
      nudgeWeeklyDay: userSettings.nudgeWeeklyDay,
      nudgePushEnabled: userSettings.nudgePushEnabled,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return {
    nudgeWeeklyDay: settings?.nudgeWeeklyDay ?? DEFAULT_NUDGE_WEEKLY_DAY,
    nudgePushEnabled: (settings?.nudgePushEnabled ?? DEFAULT_NUDGE_PUSH_PREFS) as NudgePushPreferences,
  };
}

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
