import type { IncomeEntry, KPIData } from "../types/income";
import { Currency } from "./currency";
import { getMonthYear, isPastDate, isOverdue } from "./date-helpers";

// Filter entries by month and year
export function filterByMonth(
  entries: IncomeEntry[],
  month: number,
  year: number
): IncomeEntry[] {
  return entries.filter((entry) => {
    const { month: entryMonth, year: entryYear } = getMonthYear(entry.date);
    return entryMonth === month && entryYear === year;
  });
}

// Calculate KPI data from entries
export function calculateKPIs(
  entries: IncomeEntry[],
  currentMonth: number,
  currentYear: number,
  previousMonthPaid: number
): KPIData {
  const monthEntries = filterByMonth(entries, currentMonth, currentYear);

  // Outstanding: invoiced but not paid
  const outstanding = entries
    .filter((e) => e.invoiceStatus === "sent" && e.paymentStatus !== "paid")
    .reduce((acc, e) => Currency.add(acc, Currency.subtract(e.amountGross, e.amountPaid)), 0);

  // Ready to invoice: past gigs that haven't been invoiced or paid
  const readyToInvoiceEntries = entries.filter(
    (e) => isPastDate(e.date) && e.invoiceStatus === "draft" && e.paymentStatus !== "paid"
  );
  const readyToInvoice = readyToInvoiceEntries.reduce(
    (acc, e) => Currency.add(acc, e.amountGross),
    0
  );

  // This month total
  const thisMonth = monthEntries.reduce((acc, e) => Currency.add(acc, e.amountGross), 0);

  // Total paid this month
  const totalPaid = monthEntries
    .filter((e) => e.paymentStatus === "paid")
    .reduce((acc, e) => Currency.add(acc, e.amountPaid), 0);

  // Trend vs previous month
  const trend =
    previousMonthPaid > 0
      ? Currency.multiply(Currency.divide(Currency.subtract(totalPaid, previousMonthPaid), previousMonthPaid), 100)
      : 0;

  // Overdue count
  const overdueCount = entries.filter((e) => isOverdue(e)).length;

  // Invoiced count (waiting for payment)
  const invoicedCount = entries.filter((e) => e.invoiceStatus === "sent" && e.paymentStatus !== "paid").length;

  return {
    outstanding,
    readyToInvoice,
    readyToInvoiceCount: readyToInvoiceEntries.length,
    thisMonth,
    thisMonthCount: monthEntries.length,
    trend,
    totalPaid,
    overdueCount,
    invoicedCount,
  };
}
