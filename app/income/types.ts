import { type InvoiceStatus, type PaymentStatus, type Category as DBCategory } from "@/db/schema";

// Re-export DB types
export { type InvoiceStatus, type PaymentStatus };

// Re-export Category type from DB schema
export type { DBCategory as Category };

// Display Status (Hebrew) - Purely for UI/Display
export type DisplayStatus = "בוצע" | "נשלחה" | "שולם";
export type VatType = "חייב מע״מ" | "ללא מע״מ" | "כולל מע״מ";

// The frontend representation of an Income Entry
// This aligns with the DB schema but uses 'number' for amounts instead of 'string'
export interface IncomeEntry {
  id: string;
  date: string;
  description: string;
  clientName: string; // Aligned with DB column
  clientId?: string | null; // FK to clients table
  userId?: string;
  amountGross: number;
  amountPaid: number;
  vatRate: number;
  includesVat: boolean;
  invoiceStatus: InvoiceStatus;
  paymentStatus: PaymentStatus;
  category?: string | null; // Legacy - kept for migration compatibility
  categoryId?: string | null; // New FK to categories table
  categoryData?: DBCategory | null; // Joined category object
  notes?: string | null;
  invoiceSentDate?: string | null;
  paidDate?: string | null;
  calendarEventId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Filter types
export type FilterType = "all" | "ready-to-invoice" | "invoiced" | "paid" | "overdue";

// Client for autocomplete
export interface Client {
  name: string;
  defaultRate?: number;
  category?: string;
}

// KPI data structure
export interface KPIData {
  outstanding: number; // מחכה לתשלום - invoiced but not paid
  readyToInvoice: number; // ממתין לחשבונית - work done, no invoice
  readyToInvoiceCount: number;
  thisMonth: number; // סה״כ החודש
  thisMonthCount: number;
  trend: number; // % vs last month
  totalPaid: number;
  overdueCount: number;
  invoicedCount: number; // Count of invoices waiting for payment
}

// Status config for UI
export const STATUS_CONFIG: Record<DisplayStatus, { 
  label: string; 
  bgClass: string; 
  textClass: string; 
  borderClass: string;
}> = {
  "בוצע": {
    label: "בוצע",
    bgClass: "bg-blue-50/60 dark:bg-blue-900/20",
    textClass: "text-blue-600 dark:text-blue-400",
    borderClass: "border-blue-200 dark:border-blue-800",
  },
  "נשלחה": {
    label: "נשלחה",
    bgClass: "bg-amber-50/60 dark:bg-amber-900/20",
    textClass: "text-amber-700 dark:text-amber-400",
    borderClass: "border-amber-200 dark:border-amber-800",
  },
  "שולם": {
    label: "שולם",
    bgClass: "bg-emerald-50/60 dark:bg-emerald-900/20",
    textClass: "text-emerald-700 dark:text-emerald-400",
    borderClass: "border-emerald-200 dark:border-emerald-800",
  },
};

// Legacy categories - kept for backward compatibility during migration
// New code should use categories from the database via getUserCategories()
/** @deprecated Use dynamic categories from database instead */
export const CATEGORIES = [
  "הופעות",
  "הפקה",
  "הקלטות",
  "הוראה",
  "עיבודים",
  "אחר",
] as const;

/** @deprecated Use Category type from @/db/schema instead */
export type LegacyCategory = typeof CATEGORIES[number];

export const DEFAULT_VAT_RATE = 18;

// ─────────────────────────────────────────────────────────────────────────────
// Split-Pill Status Types
// ─────────────────────────────────────────────────────────────────────────────

// Work status - derived from date (read-only, no manual override)
export type WorkStatus = "in_progress" | "done";

// Money status - derived from invoiceStatus & paymentStatus
export type MoneyStatus = "no_invoice" | "invoice_sent" | "paid";

// Work status config for UI
export const WORK_STATUS_CONFIG: Record<WorkStatus, {
  label: string;
  tooltip: string;
  icon: "Clock" | "CheckCircle2";
  bgClass: string;
  textClass: string;
}> = {
  in_progress: {
    label: "בהמתנה",
    tooltip: "העבודה טרם בוצעה",
    icon: "Clock",
    bgClass: "bg-transparent",
    textClass: "text-slate-400 dark:text-slate-500",
  },
  done: {
    label: "בוצע",
    tooltip: "העבודה הושלמה",
    icon: "CheckCircle2",
    bgClass: "bg-transparent",
    textClass: "text-slate-400 dark:text-slate-500",
  },
};

// Money status config for UI
export const MONEY_STATUS_CONFIG: Record<MoneyStatus, {
  label: string;
  tooltip: string;
  icon: "FileX" | "Send" | "Banknote";
  bgClass: string;
  textClass: string;
}> = {
  no_invoice: {
    label: "ללא",
    tooltip: "טרם נשלחה חשבונית",
    icon: "FileX",
    bgClass: "bg-slate-100 dark:bg-slate-800",
    textClass: "text-slate-500 dark:text-slate-400",
  },
  invoice_sent: {
    label: "נשלחה",
    tooltip: "חשבונית נשלחה, ממתין לתשלום",
    icon: "Send",
    bgClass: "bg-amber-50 dark:bg-amber-900/30",
    textClass: "text-amber-600 dark:text-amber-400",
  },
  paid: {
    label: "שולם",
    tooltip: "התשלום התקבל",
    icon: "Banknote",
    bgClass: "bg-emerald-50 dark:bg-emerald-900/30",
    textClass: "text-emerald-600 dark:text-emerald-400",
  },
};
