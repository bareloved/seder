import {
  getWorkStatus,
  getMoneyStatus,
  getDisplayStatus,
  getTodayDateString,
} from "@seder/shared";
import type { IncomeEntry } from "./types";

// Re-export shared utilities for backward compatibility
export { Currency } from "@seder/shared";
export {
  getTodayDateString,
  isPastDate,
  daysSince,
  getMonthYear,
  isOverdue,
  MONTH_NAMES,
} from "@seder/shared";
export {
  getDisplayStatus,
  getWorkStatus,
  getMoneyStatus,
  mapMoneyStatusToDb,
  mapStatusToDb,
  mapVatTypeToDb,
  getVatTypeFromEntry,
} from "@seder/shared";
export {
  filterByMonth,
  calculateKPIs,
} from "@seder/shared";

// ─────────────────────────────────────────────────────────────────────────────
// Web-specific formatters (use Intl/DOM APIs)
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

// Export entries to CSV
export function exportToCSV(entries: IncomeEntry[], filename?: string): void {
  const headers = [
    "תאריך",
    "יום",
    "תיאור",
    "סכום",
    "שולם",
    "לקוח",
    "סטטוס עבודה",
    "סטטוס תשלום",
    "סטטוס (ישן)",
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
    getWorkStatus(e) === "done" ? "בוצע" : "בהמתנה",
    getMoneyStatus(e) === "paid" ? "שולם" : getMoneyStatus(e) === "invoice_sent" ? "נשלחה" : "ללא",
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
