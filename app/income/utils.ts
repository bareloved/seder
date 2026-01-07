import { IncomeEntry, KPIData, DisplayStatus, VatType } from "./types";
import { Currency } from "./currency";

// Re-export Currency for convenience if needed, or just use it internally
export { Currency };

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

// Format currency in Hebrew locale
export function formatCurrency(amount: number): string {
  return `₪ ${amount.toLocaleString("he-IL")}`;
}

// Format date as DD.MM
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("he-IL", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

// Format full date with weekday
export function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

// Get Hebrew weekday letter
export function getWeekday(date: Date): string {
  const days = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
  return days[date.getDay()];
}

// ─────────────────────────────────────────────────────────────────────────────
// Date Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Get today's date as ISO string (YYYY-MM-DD) in local timezone
export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Check if a date is in the past (before today)
export function isPastDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  // Set both to start of day for accurate comparison
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return date < today;
}

// Calculate days since a date
export function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const today = new Date();
  const diffTime = today.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Get month and year from date string
export function getMonthYear(dateStr: string): { month: number; year: number } {
  const date = new Date(dateStr);
  return {
    month: date.getMonth() + 1, // 1-indexed
    year: date.getFullYear(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Logic Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Get the effective display status for an entry
export function getDisplayStatus(entry: IncomeEntry): DisplayStatus | null {
  if (entry.paymentStatus === "paid" || entry.invoiceStatus === "paid") {
    return "שולם";
  }
  if (entry.invoiceStatus === "sent") {
    return "נשלחה";
  }
  if (!isPastDate(entry.date)) {
    return null;
  }
  return "בוצע";
}

// Check if entry is overdue (invoice sent > 30 days ago, not paid)
export function isOverdue(entry: IncomeEntry, daysThreshold = 30): boolean {
  if (entry.invoiceStatus !== "sent" || !entry.invoiceSentDate) return false;
  return daysSince(entry.invoiceSentDate) > daysThreshold;
}

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

// Hebrew month names
export const MONTH_NAMES: Record<number, string> = {
  1: "ינואר",
  2: "פברואר",
  3: "מרץ",
  4: "אפריל",
  5: "מאי",
  6: "יוני",
  7: "יולי",
  8: "אוגוסט",
  9: "ספטמבר",
  10: "אוקטובר",
  11: "נובמבר",
  12: "דצמבר",
};

// ─────────────────────────────────────────────────────────────────────────────
// Data Mapping Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function mapStatusToDb(status: DisplayStatus): { invoiceStatus: string; paymentStatus?: string } {
  if (status === "שולם") {
    return { invoiceStatus: "paid", paymentStatus: "paid" };
  } else if (status === "נשלחה") {
    return { invoiceStatus: "sent" };
  } else {
    return { invoiceStatus: "draft" };
  }
}

export function mapVatTypeToDb(vatType: "חייב מע״מ" | "ללא מע״מ" | "כולל מע״מ"): { vatRate?: string; includesVat: string } {
  if (vatType === "ללא מע״מ") {
    return { vatRate: "0", includesVat: "false" };
  } else if (vatType === "כולל מע״מ") {
    return { includesVat: "true" };
  } else {
    return { vatRate: "18", includesVat: "false" };
  }
}

export function getVatTypeFromEntry(entry: { includesVat: boolean; vatRate: number }): VatType {
  if (entry.includesVat) return "כולל מע״מ";
  if (entry.vatRate === 0) return "ללא מע״מ";
  return "חייב מע״מ";
}

// Export entries to CSV
export function exportToCSV(entries: IncomeEntry[], filename?: string): void {
  const headers = [
    "תאריך",
    "יום",
    "תיאור",
    "סכום",
    "שולם",
    "לקוח",
    "סטטוס",
    "תאריך שליחת חשבונית",
    "קטגוריה",
  ];

  const rows = entries.map((e) => [
    e.date,
    getWeekday(new Date(e.date)),
    e.description,
    e.amountGross.toString(),
    e.amountPaid.toString(),
    e.clientName,
    getDisplayStatus(e) || "",
    e.invoiceSentDate || "",
    e.category || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `income-${getTodayDateString()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
