// apps/web/app/api/v1/rolling-jobs/[id]/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { NotFoundError } from "../../_lib/errors";
import {
  getRollingJob,
  updateRollingJobRow,
  deleteRollingJob,
  applyFieldUpdateToFutureRows,
  deleteFutureAttachedRowsNotIn,
  rowToMaterializeInput,
} from "@/lib/rollingJobs/data";
import { materializeRollingJob } from "@/lib/rollingJobs/materialize";
import {
  updateRollingJobSchema,
  deleteRollingJobSchema,
  generateOccurrences,
  type Cadence,
} from "@seder/shared";

const HORIZON_DAYS = 90;

function horizonEnd(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + HORIZON_DAYS, 12));
}
function todayStr(): string {
  const n = new Date();
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, "0")}-${String(n.getUTCDate()).padStart(2, "0")}`;
}
function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 12));
}
function expectedDates(
  row: { cadence: Cadence; startDate: string; endDate: string | null },
  today: string,
): string[] {
  const out = generateOccurrences({
    cadence: row.cadence,
    startDate: new Date(`${row.startDate}T12:00:00Z`),
    endDate: row.endDate ? new Date(`${row.endDate}T12:00:00Z`) : undefined,
    horizonEnd: horizonEnd(),
    skipBefore: new Date(`${today}T12:00:00Z`),
  });
  return out.map(
    (d) =>
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const row = await getRollingJob(userId, id);
    if (!row) throw new NotFoundError("RollingJob");
    return apiSuccess(row);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const patch = updateRollingJobSchema.parse(body);

    const existing = await getRollingJob(userId, id);
    if (!existing) throw new NotFoundError("RollingJob");

    const cadenceChanged = patch.cadence !== undefined;
    const datesChanged = patch.startDate !== undefined || patch.endDate !== undefined;

    const updated = await updateRollingJobRow(userId, id, {
      ...patch,
      clientId: patch.clientId ?? undefined,
      categoryId: patch.categoryId ?? undefined,
      endDate: patch.endDate ?? undefined,
      notes: patch.notes ?? undefined,
    });
    if (!updated) throw new NotFoundError("RollingJob");

    const today = todayStr();
    if (cadenceChanged || datesChanged) {
      const expected = expectedDates(
        { cadence: updated.cadence as Cadence, startDate: updated.startDate, endDate: updated.endDate },
        today,
      );
      await deleteFutureAttachedRowsNotIn(userId, id, today, expected);
      await materializeRollingJob(rowToMaterializeInput(updated), { horizonEnd: horizonEnd(), today: todayUTC() });
    } else {
      await applyFieldUpdateToFutureRows(userId, id, today, {
        description: patch.description,
        clientId: patch.clientId,
        clientName: patch.clientName,
        categoryId: patch.categoryId,
        amountGross: patch.amountGross,
        vatRate: patch.vatRate,
        includesVat: patch.includesVat,
        notes: patch.notes,
      });
    }

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = deleteRollingJobSchema.parse(body);
    await deleteRollingJob(userId, id, {
      deleteFutureDrafts: parsed.deleteFutureDrafts,
      today: todayStr(),
    });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
