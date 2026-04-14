// apps/web/app/api/cron/rolling-jobs/route.ts
import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/db/client";
import { rollingJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { materializeRollingJob } from "@/lib/rollingJobs/materialize";
import { rowToMaterializeInput } from "@/lib/rollingJobs/data";

const HORIZON_DAYS = 90;

function horizonEnd(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + HORIZON_DAYS, 12));
}
function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 12));
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const jobs = await db
    .select()
    .from(rollingJobs)
    .where(eq(rollingJobs.isActive, true));

  let processed = 0;
  let inserted = 0;
  let failed = 0;

  for (const row of jobs) {
    try {
      const n = await materializeRollingJob(rowToMaterializeInput(row), {
        horizonEnd: horizonEnd(),
        today: todayUTC(),
      });
      processed++;
      inserted += n;
    } catch (err) {
      failed++;
      Sentry.captureException(err, {
        tags: { cron: "rolling-jobs", jobId: row.id, userId: row.userId },
      });
    }
  }

  const summary = { processed, inserted, failed, totalJobs: jobs.length };
  console.log("[cron/rolling-jobs]", summary);
  return Response.json(summary);
}
