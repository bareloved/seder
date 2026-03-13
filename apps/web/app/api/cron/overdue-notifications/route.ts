import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { sendPushToUser } from "@/lib/pushNotifications";
import { apiSuccess, apiError } from "../../v1/_lib/response";
import { fetchNudgeableEntries, fetchDismissedNudges, getNudgeSettings, markNudgePushed } from "@/lib/nudges/queries";
import { computeNudges } from "@/lib/nudges/compute";
import type { NudgeType } from "@/lib/nudges/types";

// Push thresholds: only push for high-priority nudges
const PUSH_NUDGE_TYPES: NudgeType[] = [
  "overdue_payment",
  "way_overdue",
  "uninvoiced",
  "batch_invoice",
  "month_end",
];

// Only push uninvoiced at 7+ days (higher than in-app 3-day threshold)
const PUSH_UNINVOICED_MIN_DAYS = 7;

const MAX_PUSH_PER_USER = 2;

const nudgeMessages: Record<NudgeType, { title: string; bodyFn: (count: number) => string }> = {
  way_overdue: {
    title: "תשלומים באיחור חמור",
    bodyFn: (c) => `יש לך ${c} חשבוניות שלא שולמו מעל 30 יום`,
  },
  overdue_payment: {
    title: "ממתין לתשלום",
    bodyFn: (c) => `יש לך ${c} חשבוניות שממתינות לתשלום`,
  },
  uninvoiced: {
    title: "עבודות ללא חשבונית",
    bodyFn: (c) => `יש לך ${c} עבודות בלי חשבונית כבר מעל שבוע`,
  },
  batch_invoice: {
    title: "עבודות ממתינות לחשבונית",
    bodyFn: (c) => `יש לך ${c} עבודות שממתינות לחשבונית השבוע`,
  },
  month_end: {
    title: "סוף חודש מתקרב",
    bodyFn: (c) => `יש ${c} עבודות בלי חשבונית לפני סוף החודש`,
  },
  partial_stale: {
    title: "תשלום חלקי תקוע",
    bodyFn: (c) => `יש לך ${c} תשלומים חלקיים תקועים`,
  },
  unlogged_calendar: {
    title: "אירועים לא מיובאים",
    bodyFn: (c) => `יש ${c} אירועים מהיומן שלא יובאו`,
  },
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get all users
    const users = await db.select({ id: user.id }).from(user);

    let notificationsSent = 0;

    for (const u of users) {
      const settings = await getNudgeSettings(u.id);
      const [entries, dismissed] = await Promise.all([
        fetchNudgeableEntries(u.id),
        fetchDismissedNudges(u.id),
      ]);

      const nudges = computeNudges(entries, dismissed, settings);

      // Filter to push-eligible nudges
      const pushable = nudges.filter((n) => {
        if (!PUSH_NUDGE_TYPES.includes(n.nudgeType)) return false;
        if (!settings.nudgePushEnabled[n.nudgeType]) return false;
        // Uninvoiced only at 7+ days for push
        if (n.nudgeType === "uninvoiced" && (n.daysSince ?? 0) < PUSH_UNINVOICED_MIN_DAYS) return false;
        return true;
      });

      if (pushable.length === 0) continue;

      // Group by nudge type and send max MAX_PUSH_PER_USER notifications
      const byType = new Map<NudgeType, typeof pushable>();
      for (const n of pushable) {
        const arr = byType.get(n.nudgeType) || [];
        arr.push(n);
        byType.set(n.nudgeType, arr);
      }

      let sent = 0;
      for (const [type, typeNudges] of byType) {
        if (sent >= MAX_PUSH_PER_USER) break;

        // Check lastPushedAt dedup — skip if already pushed today
        const alreadyPushed = dismissed.some(
          (d) => d.nudgeType === type && d.lastPushedAt &&
            new Date().getTime() - new Date(d.lastPushedAt).getTime() < 24 * 60 * 60 * 1000
        );
        if (alreadyPushed) continue;

        const msg = nudgeMessages[type];
        await sendPushToUser(u.id, msg.title, msg.bodyFn(typeNudges.length), {
          type: "nudge",
          nudgeType: type,
        });

        // Mark as pushed for dedup
        for (const n of typeNudges) {
          await markNudgePushed(u.id, n.nudgeType, n.entryId, n.periodKey);
        }

        sent++;
        notificationsSent++;
      }
    }

    return apiSuccess({ notificationsSent });
  } catch (error) {
    return apiError(error);
  }
}
