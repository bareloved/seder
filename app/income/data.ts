import { db } from "@/db/client";
import { incomeEntries, account, categories, type IncomeEntry, type NewIncomeEntry, type Category } from "@/db/schema";
import { eq, and, gte, lte, asc, desc, sql, count, lt, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { Currency } from "./currency";
import { DEFAULT_VAT_RATE } from "./types";
import { GoogleCalendarAuthError } from "@/lib/googleCalendar";

// ─────────────────────────────────────────────────────────────────────────────
// Types for data helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface MonthFilter {
  year: number;
  month: number; // 1-12
  userId: string;
  limit?: number;
  offset?: number;
}

export interface ImportFilter extends MonthFilter {
  accessToken: string;
  calendarIds?: string[];  // Optional array of calendar IDs to import from
}

export interface IncomeAggregates {
  totalGross: number;
  totalPaid: number;
  totalUnpaid: number;
  vatTotal: number;
  jobsCount: number;
  outstanding: number;        // Invoiced but not paid
  readyToInvoice: number;     // Done but not invoiced
  readyToInvoiceCount: number;
  invoicedCount: number;
  overdueCount: number;
  previousMonthPaid: number;  // For trend calculation
  trend: number;              // % vs previous month
}

export type CalendarImportErrorType = "tokenExpired" | "unknown";

export class CalendarImportError extends Error {
  constructor(public type: CalendarImportErrorType, message: string) {
    super(message);
    this.name = "CalendarImportError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Date utilities
// ─────────────────────────────────────────────────────────────────────────────

function getMonthBounds(year: number, month: number): { startDate: string; endDate: string } {
  const lastDay = new Date(year, month, 0).getDate();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Query functions
// ─────────────────────────────────────────────────────────────────────────────

// Extended type for entries with joined category data
export type IncomeEntryWithCategory = IncomeEntry & {
  categoryData: Category | null;
};

/**
 * Get all income entries for a specific month and user
 */
export async function getIncomeEntriesForMonth({
  year,
  month,
  userId,
  limit = 500,
  offset = 0,
}: MonthFilter): Promise<IncomeEntryWithCategory[]> {
  const { startDate, endDate } = getMonthBounds(year, month);

  const entries = await db
    .select({
      id: incomeEntries.id,
      date: incomeEntries.date,
      description: incomeEntries.description,
      clientName: incomeEntries.clientName,
      clientId: incomeEntries.clientId,
      amountGross: incomeEntries.amountGross,
      amountPaid: incomeEntries.amountPaid,
      vatRate: incomeEntries.vatRate,
      includesVat: incomeEntries.includesVat,
      invoiceStatus: incomeEntries.invoiceStatus,
      paymentStatus: incomeEntries.paymentStatus,
      calendarEventId: incomeEntries.calendarEventId,
      notes: incomeEntries.notes,
      category: incomeEntries.category,
      categoryId: incomeEntries.categoryId,
      invoiceSentDate: incomeEntries.invoiceSentDate,
      paidDate: incomeEntries.paidDate,
      userId: incomeEntries.userId,
      createdAt: incomeEntries.createdAt,
      updatedAt: incomeEntries.updatedAt,
      categoryData: categories,
    })
    .from(incomeEntries)
    .leftJoin(categories, eq(incomeEntries.categoryId, categories.id))
    .where(
      and(
        eq(incomeEntries.userId, userId),
        gte(incomeEntries.date, startDate),
        lte(incomeEntries.date, endDate)
      )
    )
    .orderBy(asc(incomeEntries.date), asc(incomeEntries.createdAt))
    .limit(limit)
    .offset(offset);

  return entries;
}

/**
 * Get all income entries for a user (for cross-month calculations)
 */
export async function getAllIncomeEntries(userId: string): Promise<IncomeEntryWithCategory[]> {
  const entries = await db
    .select({
      id: incomeEntries.id,
      date: incomeEntries.date,
      description: incomeEntries.description,
      clientName: incomeEntries.clientName,
      clientId: incomeEntries.clientId,
      amountGross: incomeEntries.amountGross,
      amountPaid: incomeEntries.amountPaid,
      vatRate: incomeEntries.vatRate,
      includesVat: incomeEntries.includesVat,
      invoiceStatus: incomeEntries.invoiceStatus,
      paymentStatus: incomeEntries.paymentStatus,
      calendarEventId: incomeEntries.calendarEventId,
      notes: incomeEntries.notes,
      category: incomeEntries.category,
      categoryId: incomeEntries.categoryId,
      invoiceSentDate: incomeEntries.invoiceSentDate,
      paidDate: incomeEntries.paidDate,
      userId: incomeEntries.userId,
      createdAt: incomeEntries.createdAt,
      updatedAt: incomeEntries.updatedAt,
      categoryData: categories,
    })
    .from(incomeEntries)
    .leftJoin(categories, eq(incomeEntries.categoryId, categories.id))
    .where(eq(incomeEntries.userId, userId))
    .orderBy(desc(incomeEntries.date));

  return entries;
}

/**
 * Payment status for each month: 'all-paid' | 'has-unpaid' | 'empty'
 */
export type MonthPaymentStatus = "all-paid" | "has-unpaid" | "empty";

/**
 * Get payment status for all months in a year for a specific user
 * Cached with scoped key per year/user for performance
 */
export async function getMonthPaymentStatuses(year: number, userId: string): Promise<Record<number, MonthPaymentStatus>> {
  const cachedFn = unstable_cache(
    async (y: number, uid: string): Promise<Record<number, MonthPaymentStatus>> => {
      const startOfYear = `${y}-01-01`;
      const endOfYear = `${y}-12-31`;
      const today = getTodayString();

      const results = await db
        .select({
          month: sql<number>`EXTRACT(MONTH FROM ${incomeEntries.date})::int`,
          pastJobsCount: sql<number>`COUNT(*) FILTER (WHERE ${incomeEntries.date} < ${today})`,
          unpaidCount: sql<number>`COUNT(*) FILTER (WHERE ${incomeEntries.paymentStatus} != 'paid' AND ${incomeEntries.date} < ${today})`,
        })
        .from(incomeEntries)
        .where(
          and(
            eq(incomeEntries.userId, uid),
            gte(incomeEntries.date, startOfYear),
            lte(incomeEntries.date, endOfYear)
          )
        )
        .groupBy(sql`EXTRACT(MONTH FROM ${incomeEntries.date})`);

      const statusMap: Record<number, MonthPaymentStatus> = {};

      for (let m = 1; m <= 12; m++) {
        statusMap[m] = "empty";
      }

      for (const row of results) {
        const month = row.month;
        if (row.pastJobsCount === 0) {
          statusMap[month] = "empty";
        } else if (row.unpaidCount > 0) {
          statusMap[month] = "has-unpaid";
        } else {
          statusMap[month] = "all-paid";
        }
      }

      return statusMap;
    },
    [`month-payment-statuses-${year}-${userId}`],
    { tags: ["income-data"], revalidate: 60 }
  );
  return cachedFn(year, userId);
}

/**
 * Calculate aggregates for a given month and user
 * Cached with scoped key per year/month/user for performance
 */
export async function getIncomeAggregatesForMonth({ year, month, userId }: MonthFilter): Promise<IncomeAggregates> {
  const cachedFn = unstable_cache(
    async (y: number, m: number, uid: string): Promise<IncomeAggregates> => {
      const { startDate, endDate } = getMonthBounds(y, m);
      const today = getTodayString();

      const prevMonth = m === 1 ? 12 : m - 1;
      const prevYear = m === 1 ? y - 1 : y;
      const { startDate: prevStart, endDate: prevEnd } = getMonthBounds(prevYear, prevMonth);

      const [
        monthStatsResult,
        vatTotalResult,
        outstandingStatsResult,
        readyToInvoiceStatsResult,
        overdueStatsResult,
        prevMonthStatsResult
      ] = await Promise.all([
        // 1. Current Month Aggregates
        db
          .select({
            totalGross: sql<string>`sum(${incomeEntries.amountGross})`.mapWith(Number),
            totalPaid: sql<string>`sum(${incomeEntries.amountPaid})`.mapWith(Number),
            jobsCount: count(),
          })
          .from(incomeEntries)
          .where(
            and(
              eq(incomeEntries.userId, uid),
              gte(incomeEntries.date, startDate),
              lte(incomeEntries.date, endDate)
            )
          ),

        // 2. VAT Total
        db
          .select({
            vatTotal: sql<string>`sum(
              CASE 
                WHEN ${incomeEntries.includesVat} THEN 
                  (${incomeEntries.amountGross} - (${incomeEntries.amountGross} / (1 + ${incomeEntries.vatRate} / 100)))
                ELSE 
                  (${incomeEntries.amountGross} * (${incomeEntries.vatRate} / 100))
              END
            )`.mapWith(Number)
          })
          .from(incomeEntries)
          .where(
            and(
              eq(incomeEntries.userId, uid),
              gte(incomeEntries.date, startDate),
              lte(incomeEntries.date, endDate)
            )
          ),

        // 3. Outstanding (scoped to current month)
        db
          .select({
            totalGross: sql<string>`sum(${incomeEntries.amountGross})`.mapWith(Number),
            totalPaid: sql<string>`sum(${incomeEntries.amountPaid})`.mapWith(Number),
            count: count(),
          })
          .from(incomeEntries)
          .where(
            and(
              eq(incomeEntries.userId, uid),
              gte(incomeEntries.date, startDate),
              lte(incomeEntries.date, endDate),
              eq(incomeEntries.invoiceStatus, "sent"),
              sql`${incomeEntries.paymentStatus} != 'paid'`
            )
          ),

        // 4. Ready to Invoice (scoped to current month)
        db
          .select({
            total: sql<string>`sum(${incomeEntries.amountGross})`.mapWith(Number),
            count: count(),
          })
          .from(incomeEntries)
          .where(
            and(
              eq(incomeEntries.userId, uid),
              gte(incomeEntries.date, startDate),
              lte(incomeEntries.date, endDate),
              eq(incomeEntries.invoiceStatus, "draft"),
              lt(incomeEntries.date, today)
            )
          ),

        // 5. Overdue Count (scoped to current month)
        db
          .select({ count: count() })
          .from(incomeEntries)
          .where(
            and(
              eq(incomeEntries.userId, uid),
              gte(incomeEntries.date, startDate),
              lte(incomeEntries.date, endDate),
              eq(incomeEntries.invoiceStatus, "sent"),
              sql`${incomeEntries.paymentStatus} != 'paid'`,
              sql`${incomeEntries.invoiceSentDate} < CURRENT_DATE - INTERVAL '30 days'`
            )
          ),

        // 6. Previous Month Paid
        db
          .select({
            totalPaid: sql<string>`sum(${incomeEntries.amountPaid})`.mapWith(Number),
          })
          .from(incomeEntries)
          .where(
            and(
              eq(incomeEntries.userId, uid),
              gte(incomeEntries.date, prevStart),
              lte(incomeEntries.date, prevEnd),
              eq(incomeEntries.paymentStatus, "paid")
            )
          )
      ]);

      const monthStats = monthStatsResult[0];
      const outstandingStats = outstandingStatsResult[0];
      const readyToInvoiceStats = readyToInvoiceStatsResult[0];
      const overdueStats = overdueStatsResult[0];
      const prevMonthStats = prevMonthStatsResult[0];
      const vatTotal = vatTotalResult[0]?.vatTotal || 0;

      const outstanding = Currency.subtract(
        outstandingStats?.totalGross || 0,
        outstandingStats?.totalPaid || 0
      );
      const invoicedCount = outstandingStats?.count || 0;
      const totalGross = monthStats?.totalGross || 0;
      const totalPaid = monthStats?.totalPaid || 0;
      const totalUnpaid = Currency.subtract(totalGross, totalPaid);
      const previousMonthPaid = prevMonthStats?.totalPaid || 0;

      const trend = previousMonthPaid > 0
        ? Currency.multiply(Currency.divide(Currency.subtract(totalPaid, previousMonthPaid), previousMonthPaid), 100)
        : 0;

      return {
        totalGross,
        totalPaid,
        totalUnpaid,
        vatTotal,
        jobsCount: monthStats?.jobsCount || 0,
        outstanding,
        readyToInvoice: readyToInvoiceStats?.total || 0,
        readyToInvoiceCount: readyToInvoiceStats?.count || 0,
        invoicedCount,
        overdueCount: overdueStats?.count || 0,
        previousMonthPaid,
        trend,
      };
    },
    [`income-aggregates-${year}-${month}-${userId}`],
    { tags: ["income-data"], revalidate: 30 }
  );
  return cachedFn(year, month, userId);
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD operations
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateIncomeEntryInput {
  date: string;
  description: string;
  clientName: string;
  clientId?: string; // FK to clients table
  amountGross: number;
  amountPaid?: number;
  vatRate?: number;
  includesVat?: boolean;
  invoiceStatus?: "draft" | "sent" | "paid" | "cancelled";
  paymentStatus?: "unpaid" | "partial" | "paid";
  category?: string; // Legacy - kept for backward compatibility
  categoryId?: string; // New FK to categories table
  calendarEventId?: string; // Google Calendar event ID for deduplication
  notes?: string;
  invoiceSentDate?: string;
  paidDate?: string;
  userId: string; // Mandatory now
}

export async function createIncomeEntry(input: CreateIncomeEntryInput): Promise<IncomeEntry> {
  const [entry] = await db
    .insert(incomeEntries)
    .values({
      date: input.date,
      description: input.description,
      clientName: input.clientName,
      clientId: input.clientId,
      amountGross: input.amountGross.toFixed(2),
      amountPaid: (input.amountPaid ?? 0).toFixed(2),
      vatRate: (input.vatRate ?? DEFAULT_VAT_RATE).toFixed(2),
      includesVat: input.includesVat ?? true,
      invoiceStatus: input.invoiceStatus ?? "draft",
      paymentStatus: input.paymentStatus ?? "unpaid",
      category: input.category, // Legacy
      categoryId: input.categoryId, // New FK
      calendarEventId: input.calendarEventId,
      notes: input.notes,
      invoiceSentDate: input.invoiceSentDate,
      paidDate: input.paidDate,
      userId: input.userId,
    })
    .returning();

  if (!entry) throw new Error("Failed to create income entry");
  return entry;
}

export interface UpdateIncomeEntryInput {
  id: string;
  userId: string; // For ownership check
  date?: string;
  description?: string;
  clientName?: string;
  clientId?: string | null; // FK to clients table
  amountGross?: number;
  amountPaid?: number;
  vatRate?: number;
  includesVat?: boolean;
  invoiceStatus?: "draft" | "sent" | "paid" | "cancelled";
  paymentStatus?: "unpaid" | "partial" | "paid";
  category?: string; // Legacy
  categoryId?: string | null; // New FK
  notes?: string;
  invoiceSentDate?: string | null;
  paidDate?: string | null;
}

export async function updateIncomeEntry(input: UpdateIncomeEntryInput): Promise<IncomeEntry> {
  const { id, userId, ...updates } = input;

  const updateData: Partial<NewIncomeEntry> = {};
  if (updates.date !== undefined) updateData.date = updates.date;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.clientName !== undefined) updateData.clientName = updates.clientName;
  if (updates.clientId !== undefined) updateData.clientId = updates.clientId ?? undefined;
  if (updates.amountGross !== undefined) updateData.amountGross = updates.amountGross.toFixed(2);
  if (updates.amountPaid !== undefined) updateData.amountPaid = updates.amountPaid.toFixed(2);
  if (updates.vatRate !== undefined) updateData.vatRate = updates.vatRate.toFixed(2);
  if (updates.includesVat !== undefined) updateData.includesVat = updates.includesVat;
  if (updates.invoiceStatus !== undefined) updateData.invoiceStatus = updates.invoiceStatus;
  if (updates.paymentStatus !== undefined) updateData.paymentStatus = updates.paymentStatus;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.categoryId !== undefined) updateData.categoryId = updates.categoryId ?? undefined;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.invoiceSentDate !== undefined) updateData.invoiceSentDate = updates.invoiceSentDate ?? undefined;
  if (updates.paidDate !== undefined) updateData.paidDate = updates.paidDate ?? undefined;

  updateData.updatedAt = new Date();

  const [entry] = await db
    .update(incomeEntries)
    .set(updateData)
    .where(and(eq(incomeEntries.id, id), eq(incomeEntries.userId, userId)))
    .returning();

  if (!entry) throw new Error(`Failed to update income entry - entry with id ${id} not found or access denied`);
  return entry;
}

export async function markIncomeEntryAsPaid(id: string, userId: string): Promise<IncomeEntry> {
  const [existing] = await db
    .select()
    .from(incomeEntries)
    .where(and(eq(incomeEntries.id, id), eq(incomeEntries.userId, userId)))
    .limit(1);

  if (!existing) throw new Error(`Cannot mark as paid - entry with id ${id} not found or access denied`);

  const today = getTodayString();
  const [entry] = await db
    .update(incomeEntries)
    .set({
      paymentStatus: "paid",
      invoiceStatus: "paid",
      amountPaid: existing.amountGross,
      paidDate: today,
      updatedAt: new Date(),
    })
    .where(and(eq(incomeEntries.id, id), eq(incomeEntries.userId, userId)))
    .returning();

  if (!entry) throw new Error(`Failed to mark entry ${id} as paid`);
  return entry;
}

export async function markInvoiceSent(id: string, userId: string): Promise<IncomeEntry> {
  const today = getTodayString();
  const [entry] = await db
    .update(incomeEntries)
    .set({
      invoiceStatus: "sent",
      invoiceSentDate: today,
      updatedAt: new Date(),
    })
    .where(and(eq(incomeEntries.id, id), eq(incomeEntries.userId, userId)))
    .returning();

  if (!entry) throw new Error(`Failed to mark invoice sent - entry with id ${id} not found or access denied`);
  return entry;
}

export async function revertToDraft(id: string, userId: string): Promise<IncomeEntry> {
  const [entry] = await db
    .update(incomeEntries)
    .set({
      invoiceStatus: "draft",
      paymentStatus: "unpaid",
      invoiceSentDate: null,
      paidDate: null,
      amountPaid: "0",
      updatedAt: new Date(),
    })
    .where(and(eq(incomeEntries.id, id), eq(incomeEntries.userId, userId)))
    .returning();

  if (!entry) throw new Error(`Failed to revert to draft - entry with id ${id} not found or access denied`);
  return entry;
}

export async function revertToSent(id: string, userId: string): Promise<IncomeEntry> {
  const [existing] = await db
    .select()
    .from(incomeEntries)
    .where(and(eq(incomeEntries.id, id), eq(incomeEntries.userId, userId)))
    .limit(1);

  if (!existing) throw new Error(`Cannot revert to sent - entry with id ${id} not found or access denied`);

  const today = getTodayString();
  const [entry] = await db
    .update(incomeEntries)
    .set({
      invoiceStatus: "sent",
      paymentStatus: "unpaid",
      invoiceSentDate: existing.invoiceSentDate || today,
      paidDate: null,
      amountPaid: "0",
      updatedAt: new Date(),
    })
    .where(and(eq(incomeEntries.id, id), eq(incomeEntries.userId, userId)))
    .returning();

  if (!entry) throw new Error(`Failed to revert to sent - entry with id ${id} not found or access denied`);
  return entry;
}

export async function deleteIncomeEntry(id: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(incomeEntries)
    .where(and(eq(incomeEntries.id, id), eq(incomeEntries.userId, userId)))
    .returning({ id: incomeEntries.id });

  return result.length > 0;
}

export async function getUniqueClients(userId: string): Promise<string[]> {
  const results = await db
    .select({ clientName: incomeEntries.clientName })
    .from(incomeEntries)
    .where(eq(incomeEntries.userId, userId))
    .groupBy(incomeEntries.clientName)
    .orderBy(asc(incomeEntries.clientName));

  return results.map((r) => r.clientName);
}

export async function hasGoogleCalendarConnection(userId: string): Promise<boolean> {
  const accounts = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .limit(1);

  return accounts.length > 0;
}

export async function importIncomeEntriesFromCalendarForMonth({
  year,
  month,
  userId,
  accessToken,
  calendarIds,
}: ImportFilter): Promise<number> {
  const { listEventsForMonth } = await import("@/lib/googleCalendar");
  try {
    // Pass calendarIds to fetch from multiple calendars (defaults to primary if not provided)
    const calendarEvents = await listEventsForMonth(year, month, accessToken, calendarIds);

    if (calendarEvents.length === 0) return 0;

    const rowsToInsert: NewIncomeEntry[] = calendarEvents.map((event) => {
      const dateString = event.start.toISOString().split("T")[0];
      return {
        date: dateString,
        description: event.summary || "אירוע מהיומן",
        clientName: "",
        amountGross: "0",
        amountPaid: "0",
        vatRate: DEFAULT_VAT_RATE.toString(),
        includesVat: true,
        invoiceStatus: "draft" as const,
        paymentStatus: "unpaid" as const,
        calendarEventId: event.id,
        notes: "יובא מהיומן",
        userId: userId,
      };
    });

    const result = await db
      .insert(incomeEntries)
      .values(rowsToInsert)
      .onConflictDoNothing({
        target: [incomeEntries.userId, incomeEntries.calendarEventId],
      })
      .returning({ id: incomeEntries.id });

    return result.length;
  } catch (error) {
    if (error instanceof GoogleCalendarAuthError) {
      throw new CalendarImportError("tokenExpired", "Google token expired or revoked");
    }
    throw new CalendarImportError(
      "unknown",
      error instanceof Error ? error.message : "Unknown error during calendar import"
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Operations
// ─────────────────────────────────────────────────────────────────────────────

export interface BatchUpdateInput {
  clientName?: string;
  categoryId?: string | null;
  invoiceStatus?: "sent" | "paid";
  paymentStatus?: "paid";
  invoiceSentDate?: string | null;
  paidDate?: string | null;
}

/**
 * Batch update multiple income entries
 * Returns the count of updated rows
 */
export async function batchUpdateIncomeEntries(
  ids: string[],
  userId: string,
  updates: BatchUpdateInput
): Promise<number> {
  if (ids.length === 0) return 0;

  const today = getTodayString();
  const updateData: Partial<NewIncomeEntry> = {};

  // Apply updates based on what's provided
  if (updates.clientName !== undefined) {
    updateData.clientName = updates.clientName;
  }

  if (updates.categoryId !== undefined) {
    updateData.categoryId = updates.categoryId ?? undefined;
  }

  if (updates.invoiceStatus !== undefined) {
    updateData.invoiceStatus = updates.invoiceStatus;

    // If marking as sent, set invoiceSentDate
    if (updates.invoiceStatus === "sent" && updates.invoiceSentDate === undefined) {
      updateData.invoiceSentDate = today;
    }
  }

  if (updates.paymentStatus !== undefined) {
    updateData.paymentStatus = updates.paymentStatus;
  }

  if (updates.invoiceSentDate !== undefined) {
    updateData.invoiceSentDate = updates.invoiceSentDate ?? undefined;
  }

  if (updates.paidDate !== undefined) {
    updateData.paidDate = updates.paidDate ?? undefined;
  }

  updateData.updatedAt = new Date();

  // For "mark as paid", we need special handling to set amountPaid = amountGross
  // This requires fetching entries first if paymentStatus is being set to "paid"
  if (updates.paymentStatus === "paid") {
    // Fetch the entries to get their amountGross values
    const entries = await db
      .select({ id: incomeEntries.id, amountGross: incomeEntries.amountGross })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.userId, userId),
          inArray(incomeEntries.id, ids)
        )
      );

    // Update each entry individually to set amountPaid = amountGross
    let updatedCount = 0;
    for (const entry of entries) {
      const result = await db
        .update(incomeEntries)
        .set({
          ...updateData,
          amountPaid: entry.amountGross,
          invoiceStatus: "paid",
          paidDate: today,
        })
        .where(
          and(
            eq(incomeEntries.id, entry.id),
            eq(incomeEntries.userId, userId)
          )
        )
        .returning({ id: incomeEntries.id });

      if (result.length > 0) updatedCount++;
    }

    return updatedCount;
  }

  // Standard batch update (no amountPaid changes)
  const result = await db
    .update(incomeEntries)
    .set(updateData)
    .where(
      and(
        eq(incomeEntries.userId, userId),
        inArray(incomeEntries.id, ids)
      )
    )
    .returning({ id: incomeEntries.id });

  return result.length;
}

/**
 * Batch delete multiple income entries
 * Returns the count of deleted rows
 */
export async function batchDeleteIncomeEntries(
  ids: string[],
  userId: string
): Promise<number> {
  if (ids.length === 0) return 0;

  const result = await db
    .delete(incomeEntries)
    .where(
      and(
        eq(incomeEntries.userId, userId),
        inArray(incomeEntries.id, ids)
      )
    )
    .returning({ id: incomeEntries.id });

  return result.length;
}
