// Platform-agnostic date helpers

// Get today's date as ISO string (YYYY-MM-DD) in local timezone
export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Check if a date is in the past (before today)
export function isPastDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
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

// Check if entry is overdue (invoice sent > N days ago, not paid)
export function isOverdue(
  entry: { invoiceStatus: string; invoiceSentDate?: string | null },
  daysThreshold = 30
): boolean {
  if (entry.invoiceStatus !== "sent" || !entry.invoiceSentDate) return false;
  return daysSince(entry.invoiceSentDate) > daysThreshold;
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
