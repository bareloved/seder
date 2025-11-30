import { db } from "@/db/client";
import { incomeEntries, type IncomeEntry, type NewIncomeEntry } from "@/db/schema";
import { eq, and, gte, lte, asc, desc, sql, count, sum, lt } from "drizzle-orm";
import { Currency } from "./currency";
// Note: googleCalendar is imported lazily in importIncomeEntriesFromCalendarForMonth
// to avoid googleapis side effects during module load

// ─────────────────────────────────────────────────────────────────────────────
// Types for data helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface MonthFilter {
  year: number;
  month: number; // 1-12
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

// ─────────────────────────────────────────────────────────────────────────────
// Date utilities
// ─────────────────────────────────────────────────────────────────────────────

function getMonthBounds(year: number, month: number): { startDate: string; endDate: string } {
  // Calculate last day of month without timezone issues
  const lastDay = new Date(year, month, 0).getDate();
  
  // Build date strings directly to avoid timezone conversion issues
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

/**
 * Get all income entries for a specific month
 */
export async function getIncomeEntriesForMonth({ year, month }: MonthFilter): Promise<IncomeEntry[]> {
  const { startDate, endDate } = getMonthBounds(year, month);
  
  const entries = await db
    .select()
    .from(incomeEntries)
    .where(
      and(
        gte(incomeEntries.date, startDate),
        lte(incomeEntries.date, endDate)
      )
    )
    .orderBy(asc(incomeEntries.date), asc(incomeEntries.createdAt));
  
  return entries;
}

/**
 * Get all income entries (for cross-month calculations like outstanding invoices)
 */
export async function getAllIncomeEntries(): Promise<IncomeEntry[]> {
  const entries = await db
    .select()
    .from(incomeEntries)
    .orderBy(desc(incomeEntries.date));
  
  return entries;
}

/**
 * Payment status for each month: 'all-paid' | 'has-unpaid' | 'empty'
 */
export type MonthPaymentStatus = "all-paid" | "has-unpaid" | "empty";

/**
 * Get payment status for all months in a year
 * Returns a map of month (1-12) -> status
 * Only considers PAST jobs (future gigs don't count for payment status)
 */
export async function getMonthPaymentStatuses(year: number): Promise<Record<number, MonthPaymentStatus>> {
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;
  const today = getTodayString();
  
  // Get counts of past entries and unpaid past entries per month
  // We only consider jobs where the date has passed (work was done)
  const results = await db
    .select({
      month: sql<number>`EXTRACT(MONTH FROM ${incomeEntries.date})::int`,
      // Only count past jobs (where date < today)
      pastJobsCount: sql<number>`COUNT(*) FILTER (WHERE ${incomeEntries.date} < ${today})`,
      // Count unpaid past jobs
      unpaidCount: sql<number>`COUNT(*) FILTER (WHERE ${incomeEntries.paymentStatus} != 'paid' AND ${incomeEntries.date} < ${today})`,
    })
    .from(incomeEntries)
    .where(
      and(
        gte(incomeEntries.date, startOfYear),
        lte(incomeEntries.date, endOfYear)
      )
    )
    .groupBy(sql`EXTRACT(MONTH FROM ${incomeEntries.date})`);
  
  // Build the status map
  const statusMap: Record<number, MonthPaymentStatus> = {};
  
  // Initialize all months as empty
  for (let m = 1; m <= 12; m++) {
    statusMap[m] = "empty";
  }
  
  // Update based on query results
  for (const row of results) {
    const month = row.month;
    // Only show status if there are past jobs in this month
    if (row.pastJobsCount === 0) {
      statusMap[month] = "empty";
    } else if (row.unpaidCount > 0) {
      statusMap[month] = "has-unpaid";
    } else {
      statusMap[month] = "all-paid";
    }
  }
  
  return statusMap;
}

/**
 * Calculate aggregates for a given month using optimized SQL queries
 */
export async function getIncomeAggregatesForMonth({ year, month }: MonthFilter): Promise<IncomeAggregates> {
  const { startDate, endDate } = getMonthBounds(year, month);
  const today = getTodayString();
  
  // Prepare previous month bounds
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const { startDate: prevStart, endDate: prevEnd } = getMonthBounds(prevYear, prevMonth);

  // Execute all aggregate queries in parallel
  const [
    monthStatsResult,
    monthVatEntries,
    outstandingStatsResult,
    readyToInvoiceStatsResult,
    overdueStatsResult,
    prevMonthStatsResult
  ] = await Promise.all([
    // 1. Current Month Aggregates
    db
      .select({
        totalGross: sum(incomeEntries.amountGross).mapWith(Number),
        totalPaid: sum(incomeEntries.amountPaid).mapWith(Number),
        jobsCount: count(),
      })
      .from(incomeEntries)
      .where(
        and(
          gte(incomeEntries.date, startDate),
          lte(incomeEntries.date, endDate)
        )
      ),

    // 2. Entries for VAT calculation
    db
      .select({
        amountGross: incomeEntries.amountGross,
        vatRate: incomeEntries.vatRate,
        includesVat: incomeEntries.includesVat,
      })
      .from(incomeEntries)
      .where(
        and(
          gte(incomeEntries.date, startDate),
          lte(incomeEntries.date, endDate)
        )
      ),

    // 3. Outstanding (Invoiced but not paid - across all time)
    db
      .select({
        totalGross: sum(incomeEntries.amountGross).mapWith(Number),
        totalPaid: sum(incomeEntries.amountPaid).mapWith(Number),
        count: count(),
      })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.invoiceStatus, "sent"),
          sql`${incomeEntries.paymentStatus} != 'paid'`
        )
      ),

    // 4. Ready to Invoice (Past work, draft status - across all time)
    db
      .select({
        total: sum(incomeEntries.amountGross).mapWith(Number),
        count: count(),
      })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.invoiceStatus, "draft"),
          lt(incomeEntries.date, today) // strictly less than today
        )
      ),

    // 5. Overdue Count (Invoice sent > 30 days ago)
    db
      .select({ count: count() })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.invoiceStatus, "sent"),
          sql`${incomeEntries.paymentStatus} != 'paid'`,
          sql`${incomeEntries.invoiceSentDate} < CURRENT_DATE - INTERVAL '30 days'`
        )
      ),

    // 6. Previous Month Paid (for trend)
    db
      .select({
        totalPaid: sum(incomeEntries.amountPaid).mapWith(Number),
      })
      .from(incomeEntries)
      .where(
        and(
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

  // Calculate VAT Total
  const vatTotal = monthVatEntries.reduce((acc, e) => {
    const amount = Currency.fromString(e.amountGross);
    const rate = Currency.divide(Currency.fromString(e.vatRate), 100);
    if (e.includesVat) {
      const vat = Currency.divide(Currency.multiply(amount, rate), Currency.add(1, rate));
      return Currency.add(acc, vat);
    }
    const vat = Currency.multiply(amount, rate);
    return Currency.add(acc, vat);
  }, 0);

  const outstanding = Currency.subtract(
    outstandingStats?.totalGross || 0, 
    outstandingStats?.totalPaid || 0
  );
  const invoicedCount = outstandingStats?.count || 0;

  const totalGross = monthStats?.totalGross || 0;
  const totalPaid = monthStats?.totalPaid || 0;
  const totalUnpaid = Currency.subtract(totalGross, totalPaid);
  const previousMonthPaid = prevMonthStats?.totalPaid || 0;

  // Trend calculation
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
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD operations (rest unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateIncomeEntryInput {
  date: string;
  description: string;
  clientName: string;
  amountGross: number;
  amountPaid?: number;
  vatRate?: number;
  includesVat?: boolean;
  invoiceStatus?: "draft" | "sent" | "paid" | "cancelled";
  paymentStatus?: "unpaid" | "partial" | "paid";
  category?: string;
  notes?: string;
  invoiceSentDate?: string;
  paidDate?: string;
}

/**
 * Create a new income entry
 */
export async function createIncomeEntry(input: CreateIncomeEntryInput): Promise<IncomeEntry> {
  const [entry] = await db
    .insert(incomeEntries)
    .values({
      date: input.date,
      description: input.description,
      clientName: input.clientName,
      amountGross: input.amountGross.toFixed(2),
      amountPaid: (input.amountPaid ?? 0).toFixed(2),
      vatRate: (input.vatRate ?? 18).toFixed(2),
      includesVat: input.includesVat ?? true,
      invoiceStatus: input.invoiceStatus ?? "draft",
      paymentStatus: input.paymentStatus ?? "unpaid",
      category: input.category,
      notes: input.notes,
      invoiceSentDate: input.invoiceSentDate,
      paidDate: input.paidDate,
    })
    .returning();
  
  if (!entry) {
    throw new Error("Failed to create income entry - no entry returned");
  }
  
  return entry;
}

export interface UpdateIncomeEntryInput {
  id: string;
  date?: string;
  description?: string;
  clientName?: string;
  amountGross?: number;
  amountPaid?: number;
  vatRate?: number;
  includesVat?: boolean;
  invoiceStatus?: "draft" | "sent" | "paid" | "cancelled";
  paymentStatus?: "unpaid" | "partial" | "paid";
  category?: string;
  notes?: string;
  invoiceSentDate?: string | null;
  paidDate?: string | null;
}

/**
 * Update an existing income entry
 */
export async function updateIncomeEntry(input: UpdateIncomeEntryInput): Promise<IncomeEntry> {
  const { id, ...updates } = input;
  
  // Build the update object with only defined values
  const updateData: Partial<NewIncomeEntry> = {};
  
  if (updates.date !== undefined) updateData.date = updates.date;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.clientName !== undefined) updateData.clientName = updates.clientName;
  if (updates.amountGross !== undefined) updateData.amountGross = updates.amountGross.toFixed(2);
  if (updates.amountPaid !== undefined) updateData.amountPaid = updates.amountPaid.toFixed(2);
  if (updates.vatRate !== undefined) updateData.vatRate = updates.vatRate.toFixed(2);
  if (updates.includesVat !== undefined) updateData.includesVat = updates.includesVat;
  if (updates.invoiceStatus !== undefined) updateData.invoiceStatus = updates.invoiceStatus;
  if (updates.paymentStatus !== undefined) updateData.paymentStatus = updates.paymentStatus;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.invoiceSentDate !== undefined) updateData.invoiceSentDate = updates.invoiceSentDate ?? undefined;
  if (updates.paidDate !== undefined) updateData.paidDate = updates.paidDate ?? undefined;
  
  // Always update updatedAt
  updateData.updatedAt = new Date();
  
  const [entry] = await db
    .update(incomeEntries)
    .set(updateData)
    .where(eq(incomeEntries.id, id))
    .returning();
  
  if (!entry) {
    throw new Error(`Failed to update income entry - entry with id ${id} not found`);
  }
  
  return entry;
}

/**
 * Mark an entry as paid (full payment)
 */
export async function markIncomeEntryAsPaid(id: string): Promise<IncomeEntry> {
  // First get the entry to get amountGross
  const [existing] = await db
    .select()
    .from(incomeEntries)
    .where(eq(incomeEntries.id, id))
    .limit(1);
  
  if (!existing) {
    throw new Error(`Cannot mark as paid - entry with id ${id} not found`);
  }
  
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
    .where(eq(incomeEntries.id, id))
    .returning();
  
  if (!entry) {
    throw new Error(`Failed to mark entry ${id} as paid`);
  }
  
  return entry;
}

/**
 * Mark an entry as invoice sent
 */
export async function markInvoiceSent(id: string): Promise<IncomeEntry> {
  const today = getTodayString();
  
  const [entry] = await db
    .update(incomeEntries)
    .set({
      invoiceStatus: "sent",
      invoiceSentDate: today,
      updatedAt: new Date(),
    })
    .where(eq(incomeEntries.id, id))
    .returning();
  
  if (!entry) {
    throw new Error(`Failed to mark invoice sent - entry with id ${id} not found`);
  }
  
  return entry;
}

/**
 * Revert an entry to draft status (בוצע)
 * Clears invoiceSentDate and paidDate, resets payment status
 */
export async function revertToDraft(id: string): Promise<IncomeEntry> {
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
    .where(eq(incomeEntries.id, id))
    .returning();
  
  if (!entry) {
    throw new Error(`Failed to revert to draft - entry with id ${id} not found`);
  }
  
  return entry;
}

/**
 * Revert an entry to sent status (נשלחה)
 * Clears paidDate, resets payment status but keeps invoiceSentDate
 */
export async function revertToSent(id: string): Promise<IncomeEntry> {
  // First check if it already has an invoiceSentDate
  const [existing] = await db
    .select()
    .from(incomeEntries)
    .where(eq(incomeEntries.id, id))
    .limit(1);
  
  if (!existing) {
    throw new Error(`Cannot revert to sent - entry with id ${id} not found`);
  }
  
  const today = getTodayString();
  
  const [entry] = await db
    .update(incomeEntries)
    .set({
      invoiceStatus: "sent",
      paymentStatus: "unpaid",
      // Keep existing invoiceSentDate or set to today if not set
      invoiceSentDate: existing.invoiceSentDate || today,
      paidDate: null,
      amountPaid: "0",
      updatedAt: new Date(),
    })
    .where(eq(incomeEntries.id, id))
    .returning();
  
  if (!entry) {
    throw new Error(`Failed to revert to sent - entry with id ${id} not found`);
  }
  
  return entry;
}

/**
 * Delete an income entry
 */
export async function deleteIncomeEntry(id: string): Promise<boolean> {
  const result = await db
    .delete(incomeEntries)
    .where(eq(incomeEntries.id, id))
    .returning({ id: incomeEntries.id });
  
  return result.length > 0;
}

/**
 * Get unique client names from all entries
 */
export async function getUniqueClients(): Promise<string[]> {
  const results = await db
    .selectDistinct({ clientName: incomeEntries.clientName })
    .from(incomeEntries)
    .orderBy(asc(incomeEntries.clientName));
  
  return results.map((r) => r.clientName);
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Import
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Import income entries from Google Calendar for a specific month.
 * Creates draft entries for new calendar events that don't already exist in the database.
 * 
 * Uses two layers of duplicate protection:
 * 1. Unique constraint on calendarEventId in the database
 * 2. onConflictDoNothing to gracefully skip duplicate inserts
 * 
 * This makes the import idempotent - calling it multiple times for the same
 * month will not create duplicate entries for the same Google Calendar event.
 * 
 * @param year - The year (e.g., 2024)
 * @param month - The month (1-12)
 * @returns The number of new entries imported
 */
export async function importIncomeEntriesFromCalendarForMonth({
  year,
  month,
}: MonthFilter): Promise<number> {
  // Lazy import to avoid googleapis side effects during module load
  const { listEventsForMonth } = await import("@/lib/googleCalendar");
  
  // Fetch events for the selected month
  const calendarEvents = await listEventsForMonth(year, month);

  if (calendarEvents.length === 0) {
    return 0;
  }

  // Convert all calendar events to income entry inserts
  const rowsToInsert: NewIncomeEntry[] = calendarEvents.map((event) => {
    // Extract date-only string from start date
    const dateString = event.start.toISOString().split("T")[0];

    return {
      date: dateString,
      description: event.summary || "אירוע מהיומן",
      clientName: "", // Empty - user will fill in
      amountGross: "0", // Zero - user will fill in
      amountPaid: "0",
      vatRate: "18", // Default VAT rate (Israel)
      includesVat: true,
      invoiceStatus: "draft" as const,
      paymentStatus: "unpaid" as const,
      calendarEventId: event.id,
      notes: "יובא מהיומן",
    };
  });

  // Bulk insert with onConflictDoNothing - duplicates are silently skipped
  // thanks to the unique index on calendarEventId
  const result = await db
    .insert(incomeEntries)
    .values(rowsToInsert)
    .onConflictDoNothing({
      target: incomeEntries.calendarEventId,
    })
    .returning({ id: incomeEntries.id });

  // Return the actual number of rows inserted
  return result.length;
}
