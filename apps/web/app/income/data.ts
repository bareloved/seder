import { db, withUser, type DbTx } from "@/db/client";
import { incomeEntries, account, categories, userSettings, rollingJobs, type IncomeEntry, type NewIncomeEntry, type Category } from "@/db/schema";
import { eq, and, gte, lte, asc, desc, sql, count, lt, inArray } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { Currency, DEFAULT_VAT_RATE } from "@seder/shared";
import { GoogleCalendarAuthError } from "@/lib/googleCalendar";
import { computeNudges } from "@/lib/nudges/compute";
import { fetchNudgeableEntries, fetchDismissedNudges, getNudgeSettings } from "@/lib/nudges/queries";
import type { Nudge } from "@/lib/nudges/types";

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
  return withUser(userId, async (tx) => {
    const { startDate, endDate } = getMonthBounds(year, month);

    const entries = await tx
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
        rollingJobId: incomeEntries.rollingJobId,
        detachedFromTemplate: incomeEntries.detachedFromTemplate,
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
  });
}

/**
 * Get all income entries for a user (for cross-month calculations)
 */
export async function getAllIncomeEntries(userId: string): Promise<IncomeEntryWithCategory[]> {
  return withUser(userId, async (tx) => {
    const entries = await tx
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
        rollingJobId: incomeEntries.rollingJobId,
        detachedFromTemplate: incomeEntries.detachedFromTemplate,
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
  });
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
      return withUser(uid, async (tx) => {
        const startOfYear = `${y}-01-01`;
        const endOfYear = `${y}-12-31`;
        const today = getTodayString();

        const results = await tx
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
      });
    },
    [`month-payment-statuses-${year}-${userId}`],
    { tags: ["income-data"], revalidate: 60 }
  );
  return cachedFn(year, userId);
}

export async function getEnhancedTrends({
  endMonth,
  endYear,
  count = 6,
  userId,
}: {
  endMonth: number;
  endYear: number;
  count?: number;
  userId: string;
}) {
  return withUser(userId, async (tx) => {
    // Build list of (year, month) pairs going backwards from endMonth/endYear
    const months: { year: number; month: number }[] = [];
    let y = endYear;
    let m = endMonth;
    for (let i = 0; i < count; i++) {
      months.unshift({ year: y, month: m });
      m--;
      if (m === 0) {
        m = 12;
        y--;
      }
    }

    const results = await Promise.all(
      months.map(async ({ year, month }) => {
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate =
          month === 12
            ? `${year + 1}-01-01`
            : `${year}-${String(month + 1).padStart(2, "0")}-01`;

        const [row] = await tx
          .select({
            totalGross: sql<string>`COALESCE(SUM(${incomeEntries.amountGross}), 0)`,
            totalPaid: sql<string>`COALESCE(SUM(${incomeEntries.amountPaid}), 0)`,
            jobsCount: sql<number>`COUNT(*)::int`,
            unpaidCount: sql<number>`COUNT(*) FILTER (WHERE ${incomeEntries.paymentStatus} != 'paid' AND ${incomeEntries.date} < CURRENT_DATE)::int`,
          })
          .from(incomeEntries)
          .where(
            and(
              eq(incomeEntries.userId, userId),
              gte(incomeEntries.date, startDate),
              lt(incomeEntries.date, endDate)
            )
          );

        const totalGross = Number(row?.totalGross ?? 0);
        const totalPaid = Number(row?.totalPaid ?? 0);
        const jobsCount = row?.jobsCount ?? 0;
        const unpaidCount = row?.unpaidCount ?? 0;

        let status: "all-paid" | "has-unpaid" | "empty" = "empty";
        if (jobsCount > 0) {
          status = unpaidCount > 0 ? "has-unpaid" : "all-paid";
        }

        return { month, year, status, totalGross, totalPaid, jobsCount };
      })
    );

    return results;
  });
}

export async function getYearTrends({ year, userId }: { year: number; userId: string }) {
  return withUser(userId, async (tx) => {
    const months = Array.from({ length: 12 }, (_, i) => ({ year, month: i + 1 }));

    const results = await Promise.all(
      months.map(async ({ year: y, month }) => {
        const startDate = `${y}-${String(month).padStart(2, "0")}-01`;
        const endDate =
          month === 12
            ? `${y + 1}-01-01`
            : `${y}-${String(month + 1).padStart(2, "0")}-01`;

        const [row] = await tx
          .select({
            totalGross: sql<string>`COALESCE(SUM(${incomeEntries.amountGross}), 0)`,
            totalPaid: sql<string>`COALESCE(SUM(${incomeEntries.amountPaid}), 0)`,
            jobsCount: sql<number>`COUNT(*)::int`,
            unpaidCount: sql<number>`COUNT(*) FILTER (WHERE ${incomeEntries.paymentStatus} != 'paid' AND ${incomeEntries.date} < CURRENT_DATE)::int`,
          })
          .from(incomeEntries)
          .where(
            and(
              eq(incomeEntries.userId, userId),
              gte(incomeEntries.date, startDate),
              lt(incomeEntries.date, endDate)
            )
          );

        const totalGross = Number(row?.totalGross ?? 0);
        const totalPaid = Number(row?.totalPaid ?? 0);
        const jobsCount = row?.jobsCount ?? 0;
        const unpaidCount = row?.unpaidCount ?? 0;

        let status: "all-paid" | "has-unpaid" | "empty" = "empty";
        if (jobsCount > 0) {
          status = unpaidCount > 0 ? "has-unpaid" : "all-paid";
        }

        return { month, year: y, status, totalGross, totalPaid, jobsCount };
      })
    );

    return results;
  });
}

export async function getCategoryBreakdown({
  year,
  month,
  userId,
}: MonthFilter) {
  return withUser(userId, async (tx) => {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const rows = await tx
      .select({
        categoryId: incomeEntries.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        amount: sql<string>`COALESCE(SUM(${incomeEntries.amountGross}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(incomeEntries)
      .leftJoin(categories, eq(incomeEntries.categoryId, categories.id))
      .where(
        and(
          eq(incomeEntries.userId, userId),
          gte(incomeEntries.date, startDate),
          lt(incomeEntries.date, endDate)
        )
      )
      .groupBy(incomeEntries.categoryId, categories.name, categories.color)
      .orderBy(sql`SUM(${incomeEntries.amountGross}) DESC`);

    const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount), 0);

    // Top 5 + "other" grouping
    const top5 = rows.slice(0, 5).map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName ?? "ללא קטגוריה",
      categoryColor: r.categoryColor ?? "#9ca3af",
      amount: Number(r.amount),
      count: r.count,
      percentage: totalAmount > 0 ? Math.round((Number(r.amount) / totalAmount) * 100 * 10) / 10 : 0,
    }));

    if (rows.length > 5) {
      const otherRows = rows.slice(5);
      const otherAmount = otherRows.reduce((sum, r) => sum + Number(r.amount), 0);
      const otherCount = otherRows.reduce((sum, r) => sum + r.count, 0);
      top5.push({
        categoryId: null,
        categoryName: "אחר",
        categoryColor: "#9ca3af",
        amount: otherAmount,
        count: otherCount,
        percentage: totalAmount > 0 ? Math.round((otherAmount / totalAmount) * 100 * 10) / 10 : 0,
      });
    }

    return top5;
  });
}

export async function getCategoryBreakdownYearly({ year, userId }: { year: number; userId: string }) {
  return withUser(userId, async (tx) => {
    const startDate = `${year}-01-01`;
    const endDate = `${year + 1}-01-01`;

    const rows = await tx
      .select({
        categoryId: incomeEntries.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        month: sql<number>`EXTRACT(MONTH FROM ${incomeEntries.date}::date)::int`,
        amount: sql<string>`COALESCE(SUM(${incomeEntries.amountGross}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(incomeEntries)
      .leftJoin(categories, eq(incomeEntries.categoryId, categories.id))
      .where(
        and(
          eq(incomeEntries.userId, userId),
          gte(incomeEntries.date, startDate),
          lt(incomeEntries.date, endDate)
        )
      )
      .groupBy(incomeEntries.categoryId, categories.name, categories.color, sql`EXTRACT(MONTH FROM ${incomeEntries.date}::date)`)
      .orderBy(sql`SUM(${incomeEntries.amountGross}) DESC`);

    const catMap = new Map<string | null, {
      categoryId: string | null;
      categoryName: string;
      categoryColor: string;
      totalAmount: number;
      totalCount: number;
      monthlyAmounts: number[];
    }>();

    for (const row of rows) {
      const key = row.categoryId;
      if (!catMap.has(key)) {
        catMap.set(key, {
          categoryId: row.categoryId,
          categoryName: row.categoryName ?? "ללא קטגוריה",
          categoryColor: row.categoryColor ?? "#9ca3af",
          totalAmount: 0,
          totalCount: 0,
          monthlyAmounts: new Array(12).fill(0),
        });
      }
      const entry = catMap.get(key)!;
      const amt = Number(row.amount);
      entry.totalAmount += amt;
      entry.totalCount += row.count;
      entry.monthlyAmounts[row.month - 1] += amt;
    }

    const sorted = Array.from(catMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
    const totalAmount = sorted.reduce((sum, c) => sum + c.totalAmount, 0);

    const top5 = sorted.slice(0, 5).map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      categoryColor: c.categoryColor,
      amount: c.totalAmount,
      count: c.totalCount,
      percentage: totalAmount > 0 ? Math.round((c.totalAmount / totalAmount) * 100 * 10) / 10 : 0,
      monthlyAmounts: c.monthlyAmounts,
    }));

    if (sorted.length > 5) {
      const others = sorted.slice(5);
      const otherAmount = others.reduce((sum, c) => sum + c.totalAmount, 0);
      const otherCount = others.reduce((sum, c) => sum + c.totalCount, 0);
      const otherMonthly = new Array(12).fill(0);
      for (const c of others) {
        for (let i = 0; i < 12; i++) {
          otherMonthly[i] += c.monthlyAmounts[i];
        }
      }
      top5.push({
        categoryId: null,
        categoryName: "אחר",
        categoryColor: "#9ca3af",
        amount: otherAmount,
        count: otherCount,
        percentage: totalAmount > 0 ? Math.round((otherAmount / totalAmount) * 100 * 10) / 10 : 0,
        monthlyAmounts: otherMonthly,
      });
    }

    return top5;
  });
}

export async function getClientBreakdown({
  year,
  month,
  userId,
}: MonthFilter) {
  return withUser(userId, async (tx) => {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const rows = await tx
      .select({
        clientName: incomeEntries.clientName,
        amount: sql<string>`COALESCE(SUM(${incomeEntries.amountGross}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.userId, userId),
          gte(incomeEntries.date, startDate),
          lt(incomeEntries.date, endDate)
        )
      )
      .groupBy(incomeEntries.clientName)
      .orderBy(sql`SUM(${incomeEntries.amountGross}) DESC`);

    const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount), 0);

    const top5 = rows.slice(0, 5).map((r) => ({
      clientName: r.clientName || "ללא לקוח",
      amount: Number(r.amount),
      count: r.count,
      percentage: totalAmount > 0 ? Math.round((Number(r.amount) / totalAmount) * 100 * 10) / 10 : 0,
    }));

    if (rows.length > 5) {
      const otherRows = rows.slice(5);
      const otherAmount = otherRows.reduce((sum, r) => sum + Number(r.amount), 0);
      const otherCount = otherRows.reduce((sum, r) => sum + r.count, 0);
      top5.push({
        clientName: "אחר",
        amount: otherAmount,
        count: otherCount,
        percentage: totalAmount > 0 ? Math.round((otherAmount / totalAmount) * 100 * 10) / 10 : 0,
      });
    }

    return top5;
  });
}

export async function getClientBreakdownYearly({ year, userId }: { year: number; userId: string }) {
  return withUser(userId, async (tx) => {
    const startDate = `${year}-01-01`;
    const endDate = `${year + 1}-01-01`;

    const rows = await tx
      .select({
        clientName: incomeEntries.clientName,
        month: sql<number>`EXTRACT(MONTH FROM ${incomeEntries.date}::date)::int`,
        amount: sql<string>`COALESCE(SUM(${incomeEntries.amountGross}), 0)`,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.userId, userId),
          gte(incomeEntries.date, startDate),
          lt(incomeEntries.date, endDate)
        )
      )
      .groupBy(incomeEntries.clientName, sql`EXTRACT(MONTH FROM ${incomeEntries.date}::date)`)
      .orderBy(sql`SUM(${incomeEntries.amountGross}) DESC`);

    const clientMap = new Map<string, {
      clientName: string;
      totalAmount: number;
      totalCount: number;
      monthlyAmounts: number[];
    }>();

    for (const row of rows) {
      const key = row.clientName || "ללא לקוח";
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          clientName: key,
          totalAmount: 0,
          totalCount: 0,
          monthlyAmounts: new Array(12).fill(0),
        });
      }
      const entry = clientMap.get(key)!;
      const amt = Number(row.amount);
      entry.totalAmount += amt;
      entry.totalCount += row.count;
      entry.monthlyAmounts[row.month - 1] += amt;
    }

    const sorted = Array.from(clientMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
    const totalAmount = sorted.reduce((sum, c) => sum + c.totalAmount, 0);

    const top5 = sorted.slice(0, 5).map((c) => ({
      clientName: c.clientName,
      amount: c.totalAmount,
      count: c.totalCount,
      percentage: totalAmount > 0 ? Math.round((c.totalAmount / totalAmount) * 100 * 10) / 10 : 0,
      monthlyAmounts: c.monthlyAmounts,
    }));

    if (sorted.length > 5) {
      const others = sorted.slice(5);
      const otherAmount = others.reduce((sum, c) => sum + c.totalAmount, 0);
      const otherCount = others.reduce((sum, c) => sum + c.totalCount, 0);
      const otherMonthly = new Array(12).fill(0);
      for (const c of others) {
        for (let i = 0; i < 12; i++) {
          otherMonthly[i] += c.monthlyAmounts[i];
        }
      }
      top5.push({
        clientName: "אחר",
        amount: otherAmount,
        count: otherCount,
        percentage: totalAmount > 0 ? Math.round((otherAmount / totalAmount) * 100 * 10) / 10 : 0,
        monthlyAmounts: otherMonthly,
      });
    }

    return top5;
  });
}

export async function getAttentionItems({
  year,
  month,
  userId,
}: MonthFilter) {
  return withUser(userId, async (tx) => {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate =
      month === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(month + 1).padStart(2, "0")}-01`;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    const baseWhere = and(
      eq(incomeEntries.userId, userId),
      gte(incomeEntries.date, startDate),
      lt(incomeEntries.date, endDate),
      sql`${incomeEntries.paymentStatus} != 'paid'`,
      sql`${incomeEntries.invoiceStatus} != 'cancelled'`
    );

    // Fetch ALL matching rows for accurate summary counts (no LIMIT)
    const allRows = await tx
      .select({
        id: incomeEntries.id,
        clientName: incomeEntries.clientName,
        description: incomeEntries.description,
        date: incomeEntries.date,
        amountGross: incomeEntries.amountGross,
        invoiceStatus: incomeEntries.invoiceStatus,
        paymentStatus: incomeEntries.paymentStatus,
        invoiceSentDate: incomeEntries.invoiceSentDate,
      })
      .from(incomeEntries)
      .where(baseWhere)
      .orderBy(sql`${incomeEntries.amountGross} DESC`);

    // Classify each item into buckets
    const summary = {
      drafts: { count: 0, amount: 0 },
      sent: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
    };

    const classifiedItems = allRows.map((row) => {
      const amount = Number(row.amountGross);
      let status: "draft" | "sent" | "overdue";

      if (row.invoiceStatus === "draft") {
        status = "draft";
        summary.drafts.count++;
        summary.drafts.amount += amount;
      } else if (
        row.invoiceStatus === "sent" &&
        row.invoiceSentDate &&
        String(row.invoiceSentDate) < thirtyDaysAgoStr
      ) {
        status = "overdue";
        summary.overdue.count++;
        summary.overdue.amount += amount;
      } else {
        status = "sent";
        summary.sent.count++;
        summary.sent.amount += amount;
      }

      return {
        id: row.id,
        clientName: row.clientName,
        description: row.description,
        date: String(row.date),
        amountGross: amount,
        status,
        invoiceStatus: row.invoiceStatus,
        paymentStatus: row.paymentStatus,
      };
    });

    // Return full summary but limit items list to 20
    return { summary, items: classifiedItems.slice(0, 20) };
  });
}

/**
 * Calculate aggregates for a given month and user
 * Cached with scoped key per year/month/user for performance
 */
export async function getIncomeAggregatesForMonth({ year, month, userId }: MonthFilter): Promise<IncomeAggregates> {
  const cachedFn = unstable_cache(
    async (y: number, m: number, uid: string): Promise<IncomeAggregates> => {
      return withUser(uid, async (tx) => {
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
        tx
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
        tx
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
        tx
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
        tx
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
        tx
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
        tx
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
      });
    },
    [`income-aggregates-${year}-${month}-${userId}`],
    { tags: ["income-data"], revalidate: 30 }
  );
  return cachedFn(year, month, userId);
}

export async function getIncomeAggregatesForYear({ year, userId }: { year: number; userId: string }): Promise<IncomeAggregates> {
  return withUser(userId, async (tx) => {
    const startDate = `${year}-01-01`;
    const endDate = `${year + 1}-01-01`;
    const today = getTodayString();

    // Determine comparison period
    const now = new Date();
    const currentYear = now.getFullYear();
    const isCurrentYear = year === currentYear;
    const compMonth = isCurrentYear ? now.getMonth() + 1 : 12;

    // Comparison period: same months of previous year
    const prevStart = `${year - 1}-01-01`;
    const prevEnd = isCurrentYear
      ? `${year - 1}-${String(compMonth + 1).padStart(2, "0")}-01`
      : `${year}-01-01`;

    const [
      yearStatsResult,
      vatTotalResult,
      outstandingStatsResult,
      readyToInvoiceStatsResult,
      overdueStatsResult,
      prevPeriodStatsResult
    ] = await Promise.all([
      // 1. Year Aggregates
      tx
        .select({
          totalGross: sql<string>`sum(${incomeEntries.amountGross})`.mapWith(Number),
          totalPaid: sql<string>`sum(${incomeEntries.amountPaid})`.mapWith(Number),
          jobsCount: count(),
        })
        .from(incomeEntries)
        .where(
          and(
            eq(incomeEntries.userId, userId),
            gte(incomeEntries.date, startDate),
            lt(incomeEntries.date, endDate)
          )
        ),

      // 2. VAT Total
      tx
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
            eq(incomeEntries.userId, userId),
            gte(incomeEntries.date, startDate),
            lt(incomeEntries.date, endDate)
          )
        ),

      // 3. Outstanding (invoiced but not paid)
      tx
        .select({
          totalGross: sql<string>`sum(${incomeEntries.amountGross})`.mapWith(Number),
          totalPaid: sql<string>`sum(${incomeEntries.amountPaid})`.mapWith(Number),
          count: count(),
        })
        .from(incomeEntries)
        .where(
          and(
            eq(incomeEntries.userId, userId),
            gte(incomeEntries.date, startDate),
            lt(incomeEntries.date, endDate),
            eq(incomeEntries.invoiceStatus, "sent"),
            sql`${incomeEntries.paymentStatus} != 'paid'`
          )
        ),

      // 4. Ready to Invoice
      tx
        .select({
          total: sql<string>`sum(${incomeEntries.amountGross})`.mapWith(Number),
          count: count(),
        })
        .from(incomeEntries)
        .where(
          and(
            eq(incomeEntries.userId, userId),
            gte(incomeEntries.date, startDate),
            lt(incomeEntries.date, endDate),
            eq(incomeEntries.invoiceStatus, "draft"),
            lt(incomeEntries.date, today)
          )
        ),

      // 5. Overdue Count
      tx
        .select({ count: count() })
        .from(incomeEntries)
        .where(
          and(
            eq(incomeEntries.userId, userId),
            gte(incomeEntries.date, startDate),
            lt(incomeEntries.date, endDate),
            eq(incomeEntries.invoiceStatus, "sent"),
            sql`${incomeEntries.paymentStatus} != 'paid'`,
            sql`${incomeEntries.invoiceSentDate} < CURRENT_DATE - INTERVAL '30 days'`
          )
        ),

      // 6. Previous period paid (for trend)
      tx
        .select({
          totalPaid: sql<string>`sum(${incomeEntries.amountPaid})`.mapWith(Number),
        })
        .from(incomeEntries)
        .where(
          and(
            eq(incomeEntries.userId, userId),
            gte(incomeEntries.date, prevStart),
            lt(incomeEntries.date, prevEnd),
            eq(incomeEntries.paymentStatus, "paid")
          )
        )
    ]);

    const yearStats = yearStatsResult[0];
    const outstandingStats = outstandingStatsResult[0];
    const readyToInvoiceStats = readyToInvoiceStatsResult[0];
    const overdueStats = overdueStatsResult[0];
    const prevPeriodStats = prevPeriodStatsResult[0];
    const vatTotal = vatTotalResult[0]?.vatTotal || 0;

    const outstanding = Currency.subtract(
      outstandingStats?.totalGross || 0,
      outstandingStats?.totalPaid || 0
    );
    const totalGross = yearStats?.totalGross || 0;
    const totalPaid = yearStats?.totalPaid || 0;
    const totalUnpaid = Currency.subtract(totalGross, totalPaid);
    const previousMonthPaid = prevPeriodStats?.totalPaid || 0;

    const trend = previousMonthPaid > 0
      ? Currency.multiply(Currency.divide(Currency.subtract(totalPaid, previousMonthPaid), previousMonthPaid), 100)
      : 0;

    return {
      totalGross,
      totalPaid,
      totalUnpaid,
      vatTotal,
      jobsCount: yearStats?.jobsCount || 0,
      outstanding,
      readyToInvoice: readyToInvoiceStats?.total || 0,
      readyToInvoiceCount: readyToInvoiceStats?.count || 0,
      invoicedCount: outstandingStats?.count || 0,
      overdueCount: overdueStats?.count || 0,
      previousMonthPaid,
      trend,
    };
  });
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
  return withUser(input.userId, async (tx) => {
    const [entry] = await tx
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
  });
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

const TEMPLATE_TRACKED_FIELDS = [
  "description",
  "amountGross",
  "vatRate",
  "includesVat",
  "date",
  "clientId",
  "categoryId",
] as const;

export async function updateIncomeEntry(input: UpdateIncomeEntryInput): Promise<IncomeEntry> {
  const { id, userId, ...updates } = input;
  return withUser(userId, async (tx) => {
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

    const touchesTemplateField = TEMPLATE_TRACKED_FIELDS.some(
      (k) => (updates as Record<string, unknown>)[k] !== undefined,
    );
    if (touchesTemplateField) {
      updateData.detachedFromTemplate = true;
    }

    updateData.updatedAt = new Date();

    const [entry] = await tx
      .update(incomeEntries)
      .set(updateData)
      .where(and(eq(incomeEntries.id, id), eq(incomeEntries.userId, userId)))
      .returning();

    if (!entry) throw new Error(`Failed to update income entry - entry with id ${id} not found or access denied`);
    return entry;
  });
}

export async function markIncomeEntryAsPaid(id: string, userId: string): Promise<IncomeEntry> {
  return withUser(userId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(incomeEntries)
      .where(and(eq(incomeEntries.id, id), eq(incomeEntries.userId, userId)))
      .limit(1);

    if (!existing) throw new Error(`Cannot mark as paid - entry with id ${id} not found or access denied`);

    const today = getTodayString();
    const [entry] = await tx
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
  });
}

export async function markInvoiceSent(id: string, userId: string): Promise<IncomeEntry> {
  return withUser(userId, async (tx) => {
    const today = getTodayString();
    const [entry] = await tx
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
  });
}

export async function revertToDraft(id: string, userId: string): Promise<IncomeEntry> {
  return withUser(userId, async (tx) => {
    const [entry] = await tx
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
  });
}

export async function revertToSent(id: string, userId: string): Promise<IncomeEntry> {
  return withUser(userId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(incomeEntries)
      .where(and(eq(incomeEntries.id, id), eq(incomeEntries.userId, userId)))
      .limit(1);

    if (!existing) throw new Error(`Cannot revert to sent - entry with id ${id} not found or access denied`);

    const today = getTodayString();
    const [entry] = await tx
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
  });
}

export async function deleteIncomeEntry(id: string, userId: string): Promise<boolean> {
  return withUser(userId, async (tx) => {
    const result = await tx
      .delete(incomeEntries)
      .where(and(eq(incomeEntries.id, id), eq(incomeEntries.userId, userId)))
      .returning({ id: incomeEntries.id });

    return result.length > 0;
  });
}

export async function getRecentEntriesForClient({
  clientId,
  userId,
  limit = 5,
}: {
  clientId: string;
  userId: string;
  limit?: number;
}) {
  return withUser(userId, async (tx) => {
    return tx
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
        categoryId: incomeEntries.categoryId,
        notes: incomeEntries.notes,
        invoiceSentDate: incomeEntries.invoiceSentDate,
        paidDate: incomeEntries.paidDate,
        calendarEventId: incomeEntries.calendarEventId,
        createdAt: incomeEntries.createdAt,
        updatedAt: incomeEntries.updatedAt,
      })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.userId, userId),
          eq(incomeEntries.clientId, clientId)
        )
      )
      .orderBy(desc(incomeEntries.date))
      .limit(limit);
  });
}

export async function getUniqueClients(userId: string): Promise<string[]> {
  return withUser(userId, async (tx) => {
    const results = await tx
      .select({ clientName: incomeEntries.clientName })
      .from(incomeEntries)
      .where(eq(incomeEntries.userId, userId))
      .groupBy(incomeEntries.clientName)
      .orderBy(asc(incomeEntries.clientName));

    return results.map((r) => r.clientName);
  });
}

export async function hasGoogleCalendarConnection(userId: string): Promise<boolean> {
  return withUser(userId, async (tx) => {
    const accounts = await tx
      .select()
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
      .limit(1);

    return accounts.length > 0;
  });
}

export async function getImportedCalendarEventIds(userId: string, eventIds: string[]): Promise<string[]> {
  if (eventIds.length === 0) return [];

  return withUser(userId, async (tx) => {
    const imported = await tx
      .select({ calendarEventId: incomeEntries.calendarEventId })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.userId, userId),
          inArray(incomeEntries.calendarEventId, eventIds)
        )
      );

    return imported
      .map((row) => row.calendarEventId)
      .filter((id): id is string => id !== null);
  });
}

async function getOwnedRecurringEventIds(
  tx: DbTx,
  userId: string,
  recurringEventIds: string[]
): Promise<Set<string>> {
  if (recurringEventIds.length === 0) return new Set();
  const rows = await tx
    .select({ id: rollingJobs.sourceCalendarRecurringEventId })
    .from(rollingJobs)
    .where(
      and(
        eq(rollingJobs.userId, userId),
        inArray(rollingJobs.sourceCalendarRecurringEventId, recurringEventIds)
      )
    );
  return new Set(rows.map((r) => r.id).filter((v): v is string => v !== null));
}

export async function importIncomeEntriesFromCalendarForMonth({
  year,
  month,
  userId,
  accessToken,
  calendarIds,
}: ImportFilter): Promise<number> {
  return withUser(userId, async (tx) => {
    const { listEventsForMonth } = await import("@/lib/googleCalendar");
    try {
      // Pass calendarIds to fetch from multiple calendars (defaults to primary if not provided)
      const calendarEvents = await listEventsForMonth(year, month, accessToken, calendarIds);

      if (calendarEvents.length === 0) return 0;

      // Skip events whose parent recurring series is already owned by a rolling job
      const recurringIds = calendarEvents
        .map((e) => e.recurringEventId)
        .filter((id): id is string => typeof id === "string" && id.length > 0);
      const ownedRecurringIds = await getOwnedRecurringEventIds(tx, userId, recurringIds);
      const eventsForInsert = calendarEvents.filter((e) => {
        if (e.recurringEventId && ownedRecurringIds.has(e.recurringEventId)) return false;
        return true;
      });

      if (eventsForInsert.length === 0) return 0;

      const rowsToInsert: NewIncomeEntry[] = eventsForInsert.map((event) => {
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

      const result = await tx
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
  });
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

  return withUser(userId, async (tx) => {
    const today = getTodayString();
    const updateData: Partial<NewIncomeEntry> = {};

    // Apply updates based on what's provided
    if (updates.clientName !== undefined) {
      updateData.clientName = updates.clientName;
    }

    if (updates.categoryId !== undefined) {
      updateData.categoryId = updates.categoryId ?? undefined;
    }

    const batchTouchesTemplateField = TEMPLATE_TRACKED_FIELDS.some(
      (k) => (updates as Record<string, unknown>)[k] !== undefined,
    );
    if (batchTouchesTemplateField) {
      updateData.detachedFromTemplate = true;
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
      const entries = await tx
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
        const result = await tx
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
    const result = await tx
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
  });
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

  return withUser(userId, async (tx) => {
    const result = await tx
      .delete(incomeEntries)
      .where(
        and(
          eq(incomeEntries.userId, userId),
          inArray(incomeEntries.id, ids)
        )
      )
      .returning({ id: incomeEntries.id });

    return result.length;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if user has completed onboarding
 * Returns true if onboarding is complete, false if user should see onboarding
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  return withUser(userId, async (tx) => {
    const settings = await tx
      .select({ onboardingCompleted: userSettings.onboardingCompleted })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    // If no settings exist or onboardingCompleted is false, show onboarding
    return settings.length > 0 && settings[0].onboardingCompleted === true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Smart Nudges
// ─────────────────────────────────────────────────────────────────────────────

export async function getNudgesForUser(userId: string): Promise<Nudge[]> {
  return withUser(userId, async () => {
    const [entries, dismissed, settings] = await Promise.all([
      fetchNudgeableEntries(userId),
      fetchDismissedNudges(userId),
      getNudgeSettings(userId),
    ]);
    return computeNudges(entries, dismissed, settings.nudgeWeeklyDay);
  });
}
