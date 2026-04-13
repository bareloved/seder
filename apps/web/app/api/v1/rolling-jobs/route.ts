// apps/web/app/api/v1/rolling-jobs/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { listRollingJobs, insertRollingJob, rowToMaterializeInput } from "@/lib/rollingJobs/data";
import { materializeRollingJob } from "@/lib/rollingJobs/materialize";
import { createRollingJobSchema } from "@seder/shared";

const HORIZON_DAYS = 90;

function horizonEnd(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + HORIZON_DAYS, 12));
}

function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 12));
}

export async function GET() {
  try {
    const userId = await requireAuth();
    const jobs = await listRollingJobs(userId);
    return apiSuccess(jobs);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = createRollingJobSchema.parse(body);
    const row = await insertRollingJob({
      userId,
      title: parsed.title,
      description: parsed.description,
      clientId: parsed.clientId ?? null,
      clientName: parsed.clientName,
      categoryId: parsed.categoryId ?? null,
      amountGross: parsed.amountGross,
      vatRate: parsed.vatRate,
      includesVat: parsed.includesVat,
      cadence: parsed.cadence,
      startDate: parsed.startDate,
      endDate: parsed.endDate ?? null,
      sourceCalendarRecurringEventId: parsed.sourceCalendarRecurringEventId ?? null,
      sourceCalendarId: parsed.sourceCalendarId ?? null,
      notes: parsed.notes ?? null,
    });
    await materializeRollingJob(rowToMaterializeInput(row), {
      horizonEnd: horizonEnd(),
      today: todayUTC(),
    });
    return apiSuccess(row, 201);
  } catch (error) {
    return apiError(error);
  }
}
