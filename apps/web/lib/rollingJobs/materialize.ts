// apps/web/lib/rollingJobs/materialize.ts
import { withUser } from "@/db/client";
import { incomeEntries } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateOccurrences, type Cadence } from "@seder/shared";

export interface RollingJobForMaterialize {
  id: string;
  userId: string;
  description: string;
  clientId: string | null;
  clientName: string;
  categoryId: string | null;
  amountGross: string;
  vatRate: string;
  includesVat: boolean;
  defaultInvoiceStatus: "draft" | "sent" | "paid" | "cancelled";
  cadence: Cadence;
  startDate: string;
  endDate: string | null;
  notes: string | null;
}

export interface MaterializeOptions {
  horizonEnd: Date;
  today: Date;
}

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

function toDateOnly(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export async function materializeRollingJob(
  job: RollingJobForMaterialize,
  opts: MaterializeOptions,
): Promise<number> {
  return withUser(job.userId, async (tx) => {
    const existing = await tx
      .select({ max: sql<string | null>`MAX(${incomeEntries.date})` })
      .from(incomeEntries)
      .where(eq(incomeEntries.rollingJobId, job.id));

    const lastMaterializedStr = existing[0]?.max ?? null;
    const skipBefore = lastMaterializedStr
      ? parseDateOnly(lastMaterializedStr)
      : undefined;

    const skipBeforeAdjusted = skipBefore
      ? new Date(Date.UTC(skipBefore.getUTCFullYear(), skipBefore.getUTCMonth(), skipBefore.getUTCDate() + 1))
      : undefined;

    const dates = generateOccurrences({
      cadence: job.cadence,
      startDate: parseDateOnly(job.startDate),
      endDate: job.endDate ? parseDateOnly(job.endDate) : undefined,
      horizonEnd: opts.horizonEnd,
      skipBefore: skipBeforeAdjusted,
    });

    if (dates.length === 0) return 0;

    const rows = dates.map((d) => ({
      date: toDateOnly(d),
      description: job.description,
      clientName: job.clientName,
      clientId: job.clientId,
      categoryId: job.categoryId,
      amountGross: job.amountGross,
      amountPaid: "0",
      vatRate: job.vatRate,
      includesVat: job.includesVat,
      invoiceStatus: "draft" as const,
      paymentStatus: "unpaid" as const,
      userId: job.userId,
      rollingJobId: job.id,
      detachedFromTemplate: false,
      notes: job.notes,
    }));

    const result = await tx
      .insert(incomeEntries)
      .values(rows)
      .onConflictDoNothing({
        target: [incomeEntries.rollingJobId, incomeEntries.date],
      });

    return (result as any)?.rowCount ?? rows.length;
  });
}
