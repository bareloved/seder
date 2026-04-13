// apps/web/app/rolling-jobs/actions.ts
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  createRollingJobSchema,
  updateRollingJobSchema,
  deleteRollingJobSchema,
  generateOccurrences,
  type Cadence,
} from "@seder/shared";
import {
  insertRollingJob,
  listRollingJobs,
  getRollingJob,
  updateRollingJobRow,
  setRollingJobActive,
  deleteRollingJob,
  applyFieldUpdateToFutureRows,
  deleteFutureAttachedRowsNotIn,
  rowToMaterializeInput,
} from "@/lib/rollingJobs/data";
import { materializeRollingJob } from "@/lib/rollingJobs/materialize";

const HORIZON_DAYS = 90;

async function getUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
}

function todayStr(): string {
  const d = todayUTC();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function horizonEnd(): Date {
  const t = todayUTC();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + HORIZON_DAYS, 12));
}

function revalidateIncome() {
  revalidatePath("/income");
  updateTag("income-data");
}

// ─── Read ───────────────────────────────────────────────────────────────────

export async function listRollingJobsAction() {
  const userId = await getUserId();
  if (!userId) return { success: false as const, error: "Unauthorized" };
  const jobs = await listRollingJobs(userId);
  return { success: true as const, jobs };
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createRollingJobAction(input: unknown) {
  const userId = await getUserId();
  if (!userId) return { success: false as const, error: "Unauthorized" };

  const parsed = createRollingJobSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const data = parsed.data;

  try {
    const row = await insertRollingJob({
      userId,
      title: data.title,
      description: data.description,
      clientId: data.clientId ?? null,
      clientName: data.clientName,
      categoryId: data.categoryId ?? null,
      amountGross: data.amountGross,
      vatRate: data.vatRate,
      includesVat: data.includesVat,
      cadence: data.cadence,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      sourceCalendarRecurringEventId: data.sourceCalendarRecurringEventId ?? null,
      sourceCalendarId: data.sourceCalendarId ?? null,
      notes: data.notes ?? null,
    });

    const inserted = await materializeRollingJob(rowToMaterializeInput(row), {
      horizonEnd: horizonEnd(),
      today: todayUTC(),
    });

    revalidateIncome();
    return { success: true as const, job: row, insertedCount: inserted };
  } catch (err) {
    console.error("createRollingJobAction failed", err);
    return { success: false as const, error: "Failed to create rolling job" };
  }
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateRollingJobAction(id: string, input: unknown) {
  const userId = await getUserId();
  if (!userId) return { success: false as const, error: "Unauthorized" };

  const parsed = updateRollingJobSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }
  const patch = parsed.data;

  const existing = await getRollingJob(userId, id);
  if (!existing) return { success: false as const, error: "Not found" };

  const cadenceChanged = patch.cadence !== undefined;
  const datesChanged = patch.startDate !== undefined || patch.endDate !== undefined;

  const updated = await updateRollingJobRow(userId, id, {
    ...patch,
    clientId: patch.clientId ?? undefined,
    categoryId: patch.categoryId ?? undefined,
    endDate: patch.endDate ?? undefined,
    notes: patch.notes ?? undefined,
  });
  if (!updated) return { success: false as const, error: "Update failed" };

  const today = todayStr();

  if (cadenceChanged || datesChanged) {
    const expected = generateOccurrences({
      cadence: updated.cadence as Cadence,
      startDate: new Date(`${updated.startDate}T12:00:00Z`),
      endDate: updated.endDate ? new Date(`${updated.endDate}T12:00:00Z`) : undefined,
      horizonEnd: horizonEnd(),
      skipBefore: new Date(`${today}T12:00:00Z`),
    });
    const expectedDates = expected.map((d) => {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    });
    const { deleted } = await deleteFutureAttachedRowsNotIn(userId, id, today, expectedDates);
    const inserted = await materializeRollingJob(rowToMaterializeInput(updated), {
      horizonEnd: horizonEnd(),
      today: todayUTC(),
    });
    revalidateIncome();
    return { success: true as const, job: updated, futureDeleted: deleted, futureInserted: inserted };
  }

  const { updated: futureUpdated } = await applyFieldUpdateToFutureRows(userId, id, today, {
    description: patch.description,
    clientId: patch.clientId,
    clientName: patch.clientName,
    categoryId: patch.categoryId,
    amountGross: patch.amountGross,
    vatRate: patch.vatRate,
    includesVat: patch.includesVat,
    notes: patch.notes,
  });

  revalidateIncome();
  return { success: true as const, job: updated, futureUpdated };
}

// ─── Pause / Resume ─────────────────────────────────────────────────────────

export async function pauseRollingJobAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { success: false as const, error: "Unauthorized" };
  const row = await setRollingJobActive(userId, id, false);
  if (!row) return { success: false as const, error: "Not found" };
  revalidateIncome();
  return { success: true as const, job: row };
}

export async function resumeRollingJobAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { success: false as const, error: "Unauthorized" };
  const row = await setRollingJobActive(userId, id, true);
  if (!row) return { success: false as const, error: "Not found" };
  const inserted = await materializeRollingJob(rowToMaterializeInput(row), {
    horizonEnd: horizonEnd(),
    today: todayUTC(),
  });
  revalidateIncome();
  return { success: true as const, job: row, insertedCount: inserted };
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteRollingJobAction(id: string, input: unknown) {
  const userId = await getUserId();
  if (!userId) return { success: false as const, error: "Unauthorized" };
  const parsed = deleteRollingJobSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }
  await deleteRollingJob(userId, id, {
    deleteFutureDrafts: parsed.data.deleteFutureDrafts,
    today: todayStr(),
  });
  revalidateIncome();
  return { success: true as const };
}
