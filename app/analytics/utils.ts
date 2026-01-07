import { startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, parseISO, format, startOfWeek, endOfWeek, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { he } from "date-fns/locale";
import type { DateRange, DateRangePreset, TimeSeriesDataPoint, CategoryDataPoint, AnalyticsKPI, NeedsAttentionJob } from "./types";
import type { IncomeEntry } from "../income/types";
import { Currency } from "../income/currency";

/**
 * Get date range based on preset
 */
export function getDateRangeFromPreset(preset: DateRangePreset, customRange?: DateRange): DateRange {
  const now = new Date();

  switch (preset) {
    case "this-month":
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };

    case "last-3-months":
      const threeMonthsAgo = subMonths(now, 2); // Current month + 2 previous = 3 months
      return {
        start: startOfMonth(threeMonthsAgo),
        end: endOfMonth(now),
      };

    case "this-year":
      return {
        start: startOfYear(now),
        end: endOfYear(now),
      };

    case "custom":
      if (!customRange) {
        // Fallback to current month
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
      }
      return customRange;

    default:
      return {
        start: startOfMonth(now),
        end: endOfMonth(now),
      };
  }
}

/**
 * Group entries by time period (week or month)
 */
export function groupEntriesByTime(
  entries: IncomeEntry[],
  dateRange: DateRange
): TimeSeriesDataPoint[] {
  const { start, end } = dateRange;

  // Determine if we should group by week or month
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const groupByMonth = daysDiff > 60; // More than 2 months: group by month

  if (groupByMonth) {
    return groupByMonth_internal(entries, start, end);
  } else {
    return groupByWeek_internal(entries, start, end);
  }
}

function groupByWeek_internal(
  entries: IncomeEntry[],
  start: Date,
  end: Date
): TimeSeriesDataPoint[] {
  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 0, locale: he });

  return weeks.map((weekStart) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0, locale: he });
    const weekEntries = entries.filter((entry) => {
      const entryDate = parseISO(entry.date);
      return entryDate >= weekStart && entryDate <= weekEnd;
    });

    const totalAmount = weekEntries.reduce((sum, entry) => {
      return Currency.add(sum, entry.amountGross);
    }, 0);

    return {
      date: format(weekStart, "d/M", { locale: he }),
      amount: totalAmount,
      count: weekEntries.length,
    };
  });
}

function groupByMonth_internal(
  entries: IncomeEntry[],
  start: Date,
  end: Date
): TimeSeriesDataPoint[] {
  const months = eachMonthOfInterval({ start, end });

  return months.map((monthStart) => {
    const monthEnd = endOfMonth(monthStart);
    const monthEntries = entries.filter((entry) => {
      const entryDate = parseISO(entry.date);
      return entryDate >= monthStart && entryDate <= monthEnd;
    });

    const totalAmount = monthEntries.reduce((sum, entry) => {
      return Currency.add(sum, entry.amountGross);
    }, 0);

    return {
      date: format(monthStart, "MMM yy", { locale: he }),
      amount: totalAmount,
      count: monthEntries.length,
    };
  });
}

/**
 * Group entries by category (top 5 + other)
 */
export function groupEntriesByCategory(entries: IncomeEntry[]): CategoryDataPoint[] {
  const categoryMap = new Map<string, { amount: number; count: number }>();

  entries.forEach((entry) => {
    const categoryName = entry.categoryData?.name || "ללא קטגוריה";
    const existing = categoryMap.get(categoryName) || { amount: 0, count: 0 };

    categoryMap.set(categoryName, {
      amount: Currency.add(existing.amount, entry.amountGross),
      count: existing.count + 1,
    });
  });

  // Convert to array and sort by amount descending
  const categoryArray = Array.from(categoryMap.entries()).map(([name, data]) => ({
    categoryName: name,
    amount: data.amount,
    count: data.count,
  })).sort((a, b) => b.amount - a.amount);

  // Take top 5 and group rest as "אחר"
  if (categoryArray.length <= 5) {
    return categoryArray;
  }

  const top5 = categoryArray.slice(0, 5);
  const others = categoryArray.slice(5);

  const otherTotal = others.reduce((sum, cat) => ({
    amount: Currency.add(sum.amount, cat.amount),
    count: sum.count + cat.count,
  }), { amount: 0, count: 0 });

  return [
    ...top5,
    {
      categoryName: "אחר",
      amount: otherTotal.amount,
      count: otherTotal.count,
    },
  ];
}

/**
 * Format date range for display
 */
export function formatDateRangeLabel(preset: DateRangePreset, customRange?: DateRange): string {
  switch (preset) {
    case "this-month":
      return "החודש";
    case "last-3-months":
      return "3 חודשים אחרונים";
    case "this-year":
      return "השנה";
    case "custom":
      if (!customRange) return "תקופה מותאמת";
      return `${format(customRange.start, "d/M/yy", { locale: he })} - ${format(customRange.end, "d/M/yy", { locale: he })}`;
    default:
      return "החודש";
  }
}

/**
 * Calculate KPI metrics from entries
 */
export function calculateKPIMetrics(entries: IncomeEntry[]): AnalyticsKPI {
  let totalIncome = 0;
  let unpaidAmount = 0;
  const jobsCount = entries.length;

  entries.forEach((entry) => {
    // Total income: sum all gross amounts
    totalIncome = Currency.add(totalIncome, entry.amountGross);

    // Unpaid: jobs that are either:
    // - Invoice sent but not fully paid
    // - Draft (no invoice sent)
    const isUnpaid =
      (entry.invoiceStatus === "sent" && entry.paymentStatus !== "paid") ||
      (entry.invoiceStatus === "draft");

    if (isUnpaid) {
      const remainingAmount = Currency.subtract(entry.amountGross, entry.amountPaid);
      unpaidAmount = Currency.add(unpaidAmount, remainingAmount);
    }
  });

  return {
    totalIncome,
    jobsCount,
    unpaidAmount,
  };
}

/**
 * Get jobs that need attention (no invoice or unpaid)
 */
export function getNeedsAttentionJobs(entries: IncomeEntry[]): NeedsAttentionJob[] {
  const needsAttention = entries.filter((entry) => {
    // Include if:
    // - No invoice (draft status)
    // - Invoice sent but not paid
    return (
      entry.invoiceStatus === "draft" ||
      (entry.invoiceStatus === "sent" && entry.paymentStatus !== "paid")
    );
  });

  // Sort by amount descending
  needsAttention.sort((a, b) => b.amountGross - a.amountGross);

  return needsAttention.map((entry) => {
    let status = "";
    if (entry.invoiceStatus === "draft") {
      status = "ללא חשבונית";
    } else if (entry.invoiceStatus === "sent" && entry.paymentStatus === "unpaid") {
      status = "נשלחה - ממתין לתשלום";
    } else if (entry.invoiceStatus === "sent" && entry.paymentStatus === "partial") {
      status = "נשלחה - תשלום חלקי";
    }

    return {
      id: entry.id,
      clientName: entry.clientName,
      description: entry.description,
      amount: entry.amountGross,
      status,
      date: entry.date,
    };
  });
}
