// Invoice status — matches DB enum
export const invoiceStatusValues = ["draft", "sent", "paid", "cancelled"] as const;
export type InvoiceStatus = (typeof invoiceStatusValues)[number];

// Payment status — matches DB enum
export const paymentStatusValues = ["unpaid", "partial", "paid"] as const;
export type PaymentStatus = (typeof paymentStatusValues)[number];

// Display Status (Hebrew) — purely for UI
export type DisplayStatus = "בוצע" | "נשלחה" | "שולם";
export type VatType = "חייב מע״מ" | "ללא מע״מ" | "כולל מע״מ";

// Filter types
export type FilterType = "all" | "ready-to-invoice" | "invoiced" | "paid" | "overdue";

// Work status — derived from date
export type WorkStatus = "in_progress" | "done";

// Money status — derived from invoiceStatus & paymentStatus
export type MoneyStatus = "no_invoice" | "invoice_sent" | "paid";

// The frontend representation of an Income Entry
export interface IncomeEntry {
  id: string;
  date: string;
  description: string;
  clientName: string;
  clientId?: string | null;
  userId?: string;
  amountGross: number;
  amountPaid: number;
  vatRate: number;
  includesVat: boolean;
  invoiceStatus: InvoiceStatus;
  paymentStatus: PaymentStatus;
  category?: string | null;
  categoryId?: string | null;
  categoryData?: Category | null;
  notes?: string | null;
  invoiceSentDate?: string | null;
  paidDate?: string | null;
  calendarEventId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// Forward reference — imported from category.ts
import type { Category } from "./category";

// KPI data structure
export interface KPIData {
  outstanding: number;
  readyToInvoice: number;
  readyToInvoiceCount: number;
  thisMonth: number;
  thisMonthCount: number;
  trend: number;
  totalPaid: number;
  overdueCount: number;
  invoicedCount: number;
}
