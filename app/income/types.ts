import { type InvoiceStatus, type PaymentStatus } from "@/db/schema";

// Re-export DB types
export { type InvoiceStatus, type PaymentStatus };

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
  amountGross: number;
  amountPaid: number;
  vatRate: number;
  includesVat: boolean;
  invoiceStatus: InvoiceStatus;
  paymentStatus: PaymentStatus;
  category?: string | null;
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
    bgClass: "bg-slate-100 dark:bg-slate-800",
    textClass: "text-slate-600 dark:text-slate-400",
    borderClass: "border-slate-200 dark:border-slate-700",
  },
  "נשלחה": {
    label: "נשלחה",
    bgClass: "bg-amber-50 dark:bg-amber-900/30",
    textClass: "text-amber-700 dark:text-amber-400",
    borderClass: "border-amber-200 dark:border-amber-800",
  },
  "שולם": {
    label: "שולם",
    bgClass: "bg-emerald-50 dark:bg-emerald-900/30",
    textClass: "text-emerald-700 dark:text-emerald-400",
    borderClass: "border-emerald-200 dark:border-emerald-800",
  },
};

// Categories for musician workflow
export const CATEGORIES = [
  "הופעות",
  "הפקה",
  "הקלטות", 
  "הוראה",
  "עיבודים",
  "אחר",
] as const;

export type Category = typeof CATEGORIES[number];
