// apps/web/lib/rollingJobs/data.ts
import { db } from "@/db/client";
import { rollingJobs, incomeEntries } from "@/db/schema";
import { and, eq, gte, gt, inArray } from "drizzle-orm";
import type { Cadence } from "@seder/shared";
import { type RollingJobForMaterialize } from "./materialize";

export interface CreateRollingJobRow {
  userId: string;
  title: string;
  description: string;
  clientId: string | null;
  clientName: string;
  categoryId: string | null;
  amountGross: string;
  vatRate: string;
  includesVat: boolean;
  cadence: Cadence;
  startDate: string;
  endDate: string | null;
  sourceCalendarRecurringEventId: string | null;
  sourceCalendarId: string | null;
  notes: string | null;
}

export async function listRollingJobs(userId: string) {
  return db
    .select()
    .from(rollingJobs)
    .where(eq(rollingJobs.userId, userId))
    .orderBy(rollingJobs.createdAt);
}

export async function getRollingJob(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(rollingJobs)
    .where(and(eq(rollingJobs.userId, userId), eq(rollingJobs.id, id)))
    .limit(1);
  return row ?? null;
}

export async function insertRollingJob(input: CreateRollingJobRow) {
  const [row] = await db
    .insert(rollingJobs)
    .values({
      userId: input.userId,
      title: input.title,
      description: input.description,
      clientId: input.clientId,
      clientName: input.clientName,
      categoryId: input.categoryId,
      amountGross: input.amountGross,
      vatRate: input.vatRate,
      includesVat: input.includesVat,
      cadence: input.cadence as unknown as object,
      startDate: input.startDate,
      endDate: input.endDate,
      sourceCalendarRecurringEventId: input.sourceCalendarRecurringEventId,
      sourceCalendarId: input.sourceCalendarId,
      notes: input.notes,
    })
    .returning();
  return row;
}

/**
 * Apply a field-only template update (no cadence/startDate/endDate change).
 * Rewrites attached future rows (from `today` onward) whose `detachedFromTemplate` is false.
 */
export async function applyFieldUpdateToFutureRows(
  userId: string,
  jobId: string,
  today: string,
  patch: {
    description?: string;
    clientId?: string | null;
    clientName?: string;
    categoryId?: string | null;
    amountGross?: string;
    vatRate?: string;
    includesVat?: boolean;
    notes?: string | null;
  },
) {
  if (Object.keys(patch).length === 0) return { updated: 0 };
  const result = await db
    .update(incomeEntries)
    .set(patch)
    .where(
      and(
        eq(incomeEntries.userId, userId),
        eq(incomeEntries.rollingJobId, jobId),
        gte(incomeEntries.date, today),
        eq(incomeEntries.detachedFromTemplate, false),
      ),
    );
  return { updated: (result as any)?.rowCount ?? 0 };
}

/**
 * Find attached future rows (from today onward) that are NOT in the expectedDates set, and delete them.
 * The caller should then call materializeRollingJob to insert newly-expected rows.
 */
export async function deleteFutureAttachedRowsNotIn(
  userId: string,
  jobId: string,
  today: string,
  expectedDates: string[],
) {
  const attached = await db
    .select({ id: incomeEntries.id, date: incomeEntries.date })
    .from(incomeEntries)
    .where(
      and(
        eq(incomeEntries.userId, userId),
        eq(incomeEntries.rollingJobId, jobId),
        gte(incomeEntries.date, today),
        eq(incomeEntries.detachedFromTemplate, false),
      ),
    );

  const expectedSet = new Set(expectedDates);
  const idsToDelete = attached
    .filter((r) => !expectedSet.has(r.date))
    .map((r) => r.id);

  if (idsToDelete.length === 0) return { deleted: 0 };

  await db
    .delete(incomeEntries)
    .where(inArray(incomeEntries.id, idsToDelete));

  return { deleted: idsToDelete.length };
}

export async function updateRollingJobRow(
  userId: string,
  id: string,
  patch: Partial<CreateRollingJobRow>,
) {
  const values: Record<string, unknown> = { ...patch, updatedAt: new Date() };
  if (patch.cadence !== undefined) values.cadence = patch.cadence as unknown as object;
  const [row] = await db
    .update(rollingJobs)
    .set(values)
    .where(and(eq(rollingJobs.userId, userId), eq(rollingJobs.id, id)))
    .returning();
  return row ?? null;
}

export async function setRollingJobActive(userId: string, id: string, isActive: boolean) {
  const [row] = await db
    .update(rollingJobs)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(rollingJobs.userId, userId), eq(rollingJobs.id, id)))
    .returning();
  return row ?? null;
}

/**
 * Delete a rolling job. If deleteFutureDrafts=true, also delete unpaid draft future rows.
 */
export async function deleteRollingJob(
  userId: string,
  id: string,
  opts: { deleteFutureDrafts: boolean; today: string },
) {
  await db
    .update(incomeEntries)
    .set({ detachedFromTemplate: true })
    .where(
      and(
        eq(incomeEntries.userId, userId),
        eq(incomeEntries.rollingJobId, id),
      ),
    );

  if (opts.deleteFutureDrafts) {
    await db
      .delete(incomeEntries)
      .where(
        and(
          eq(incomeEntries.userId, userId),
          eq(incomeEntries.rollingJobId, id),
          gt(incomeEntries.date, opts.today),
          eq(incomeEntries.invoiceStatus, "draft"),
          eq(incomeEntries.paymentStatus, "unpaid"),
        ),
      );
  }

  await db
    .delete(rollingJobs)
    .where(and(eq(rollingJobs.userId, userId), eq(rollingJobs.id, id)));
}

export function rowToMaterializeInput(row: typeof rollingJobs.$inferSelect): RollingJobForMaterialize {
  return {
    id: row.id,
    userId: row.userId,
    description: row.description,
    clientId: row.clientId,
    clientName: row.clientName,
    categoryId: row.categoryId,
    amountGross: row.amountGross,
    vatRate: row.vatRate,
    includesVat: row.includesVat,
    defaultInvoiceStatus: row.defaultInvoiceStatus,
    cadence: row.cadence as Cadence,
    startDate: row.startDate,
    endDate: row.endDate,
    notes: row.notes,
  };
}
