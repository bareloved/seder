// apps/web/app/api/v1/rolling-jobs/[id]/pause/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "../../../_lib/middleware";
import { apiSuccess, apiError } from "../../../_lib/response";
import { NotFoundError } from "../../../_lib/errors";
import { setRollingJobActive } from "@/lib/rollingJobs/data";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const row = await setRollingJobActive(userId, id, false);
    if (!row) throw new NotFoundError("RollingJob");
    return apiSuccess(row);
  } catch (error) {
    return apiError(error);
  }
}
