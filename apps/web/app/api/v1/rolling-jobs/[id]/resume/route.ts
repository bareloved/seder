// apps/web/app/api/v1/rolling-jobs/[id]/resume/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "../../../_lib/middleware";
import { apiSuccess, apiError } from "../../../_lib/response";
import { NotFoundError } from "../../../_lib/errors";
import { setRollingJobActive, rowToMaterializeInput } from "@/lib/rollingJobs/data";
import { materializeRollingJob } from "@/lib/rollingJobs/materialize";

const HORIZON_DAYS = 90;
function horizonEnd(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + HORIZON_DAYS, 12));
}
function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 12));
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const row = await setRollingJobActive(userId, id, true);
    if (!row) throw new NotFoundError("RollingJob");
    await materializeRollingJob(rowToMaterializeInput(row), {
      horizonEnd: horizonEnd(),
      today: todayUTC(),
    });
    return apiSuccess(row);
  } catch (error) {
    return apiError(error);
  }
}
