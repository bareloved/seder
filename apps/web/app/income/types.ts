// Re-export shared types and constants as the single source of truth
export type {
  KPIData,
  DisplayStatus,
  VatType,
  FilterType,
  WorkStatus,
  MoneyStatus,
  InvoiceStatus,
  PaymentStatus,
} from "@seder/shared";

export {
  STATUS_CONFIG,
  WORK_STATUS_CONFIG,
  MONEY_STATUS_CONFIG,
  DEFAULT_VAT_RATE,
} from "@seder/shared";

// Re-export Category from DB schema (Drizzle-inferred type for data layer)
import { type Category as DBCategory, type InvoiceStatus, type PaymentStatus } from "@/db/schema";
export type { DBCategory as Category };

// IncomeEntry — uses DB Category for categoryData to match Drizzle query results
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
  categoryData?: DBCategory | null;
  notes?: string | null;
  invoiceSentDate?: string | null;
  paidDate?: string | null;
  calendarEventId?: string | null;
  rollingJobId?: string | null;
  detachedFromTemplate?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Legacy categories — kept for backward compatibility during migration
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

// Client for autocomplete (web-specific, different from shared Client)
export interface Client {
  name: string;
  defaultRate?: number;
  category?: string;
}
