import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { sendPushToUser } from "@/lib/pushNotifications";
import { apiSuccess, apiError } from "../../v1/_lib/response";
import { fetchNudgeableEntries, fetchDismissedNudges, getNudgeSettings, markNudgePushed } from "@/lib/nudges/queries";
import { computeNudges } from "@/lib/nudges/compute";
import type { NudgeType } from "@/lib/nudges/types";

const MAX_PUSH_PER_USER = 2;

const DEDUP_MS: Record<NudgeType, number> = {
  overdue: 7 * 24 * 60 * 60 * 1000,
  day_after_gig: 1 * 24 * 60 * 60 * 1000,
  weekly_uninvoiced: 7 * 24 * 60 * 60 * 1000,
  calendar_sync: 28 * 24 * 60 * 60 * 1000,
  unpaid_check: 28 * 24 * 60 * 60 * 1000,
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const isFirstOfMonth = dayOfMonth === 1;
    const isLastOfMonth = dayOfMonth === lastDayOfMonth;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const users = await db.select({ id: user.id }).from(user);
    let notificationsSent = 0;

    for (const u of users) {
      const settings = await getNudgeSettings(u.id);
      let sent = 0;

      // --- 1. Overdue (daily) ---
      if (settings.nudgePushEnabled.overdue) {
        const [entries, dismissed] = await Promise.all([
          fetchNudgeableEntries(u.id),
          fetchDismissedNudges(u.id),
        ]);

        const nudges = computeNudges(entries, dismissed, settings.nudgeWeeklyDay);
        const overdueNudges = nudges.filter((n) => n.nudgeType === "overdue");

        for (const n of overdueNudges) {
          if (sent >= MAX_PUSH_PER_USER) break;

          const alreadyPushed = dismissed.some(
            (d) => d.nudgeType === "overdue" && d.entryId === n.entryId &&
              d.lastPushedAt && now.getTime() - new Date(d.lastPushedAt).getTime() < DEDUP_MS.overdue
          );
          if (alreadyPushed) continue;

          await sendPushToUser(u.id,
            "יש לך חשבונית שלא שולמה מעל 30 יום",
            `${n.clientName} - ${n.entryDescription} (₪${n.amountGross?.toLocaleString("he-IL")})`,
            { type: "nudge", nudgeType: "overdue" }
          );
          await markNudgePushed(u.id, "overdue", n.entryId, null);
          sent++;
          notificationsSent++;
        }
      }

      // --- 2. Day after gig (daily) ---
      if (settings.nudgePushEnabled.day_after_gig) {
        if (sent < MAX_PUSH_PER_USER) {
          const [entries, dismissed] = await Promise.all([
            fetchNudgeableEntries(u.id),
            fetchDismissedNudges(u.id),
          ]);

          const nudges = computeNudges(entries, dismissed, settings.nudgeWeeklyDay);
          const dayAfterNudges = nudges.filter((n) => n.nudgeType === "day_after_gig");

          for (const n of dayAfterNudges) {
            if (sent >= MAX_PUSH_PER_USER) break;

            const alreadyPushed = dismissed.some(
              (d) => d.nudgeType === "day_after_gig" && d.entryId === n.entryId &&
                d.lastPushedAt && now.getTime() - new Date(d.lastPushedAt).getTime() < DEDUP_MS.day_after_gig
            );
            if (alreadyPushed) continue;

            await sendPushToUser(u.id,
              "שלחת חשבונית על אתמול?",
              n.entryDescription || n.description,
              { type: "nudge", nudgeType: "day_after_gig" }
            );
            await markNudgePushed(u.id, "day_after_gig", n.entryId, null);
            sent++;
            notificationsSent++;
          }
        }
      }

      // --- 3. Weekly uninvoiced (user's chosen day) ---
      if (settings.nudgePushEnabled.weekly_uninvoiced && dayOfWeek === settings.nudgeWeeklyDay) {
        if (sent < MAX_PUSH_PER_USER) {
          const [entries, dismissed] = await Promise.all([
            fetchNudgeableEntries(u.id),
            fetchDismissedNudges(u.id),
          ]);

          const nudges = computeNudges(entries, dismissed, settings.nudgeWeeklyDay);
          const weeklyNudge = nudges.find((n) => n.nudgeType === "weekly_uninvoiced");

          if (weeklyNudge) {
            const alreadyPushed = dismissed.some(
              (d) => d.nudgeType === "weekly_uninvoiced" && d.periodKey === weeklyNudge.periodKey &&
                d.lastPushedAt && now.getTime() - new Date(d.lastPushedAt).getTime() < DEDUP_MS.weekly_uninvoiced
            );

            if (!alreadyPushed) {
              await sendPushToUser(u.id,
                "עבודות ממתינות לחשבונית",
                weeklyNudge.description,
                { type: "nudge", nudgeType: "weekly_uninvoiced" }
              );
              await markNudgePushed(u.id, "weekly_uninvoiced", null, weeklyNudge.periodKey);
              sent++;
              notificationsSent++;
            }
          }
        }
      }

      // --- 4. Calendar sync (1st of month) ---
      if (settings.nudgePushEnabled.calendar_sync && isFirstOfMonth) {
        if (sent < MAX_PUSH_PER_USER) {
          const dismissed = await fetchDismissedNudges(u.id);
          const alreadyPushed = dismissed.some(
            (d) => d.nudgeType === "calendar_sync" && d.periodKey === monthKey &&
              d.lastPushedAt && now.getTime() - new Date(d.lastPushedAt).getTime() < DEDUP_MS.calendar_sync
          );

          if (!alreadyPushed) {
            await sendPushToUser(u.id,
              "חודש חדש!",
              "יש ביומן עבודות לסנכרן עם סדר?",
              { type: "nudge", nudgeType: "calendar_sync" }
            );
            await markNudgePushed(u.id, "calendar_sync", null, monthKey);
            sent++;
            notificationsSent++;
          }
        }
      }

      // --- 5. Unpaid check (last day of month) ---
      if (settings.nudgePushEnabled.unpaid_check && isLastOfMonth) {
        if (sent < MAX_PUSH_PER_USER) {
          const dismissed = await fetchDismissedNudges(u.id);
          const alreadyPushed = dismissed.some(
            (d) => d.nudgeType === "unpaid_check" && d.periodKey === monthKey &&
              d.lastPushedAt && now.getTime() - new Date(d.lastPushedAt).getTime() < DEDUP_MS.unpaid_check
          );

          if (!alreadyPushed) {
            await sendPushToUser(u.id,
              "סוף חודש!",
              "יש עבודות ששולמו כבר ולא סומנו?",
              { type: "nudge", nudgeType: "unpaid_check" }
            );
            await markNudgePushed(u.id, "unpaid_check", null, monthKey);
            sent++;
            notificationsSent++;
          }
        }
      }
    }

    return apiSuccess({ notificationsSent });
  } catch (error) {
    return apiError(error);
  }
}
