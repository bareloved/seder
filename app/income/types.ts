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
