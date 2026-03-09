import type { IncomeEntry, DisplayStatus, WorkStatus, MoneyStatus, VatType, InvoiceStatus, PaymentStatus } from "../types/income";
import { isPastDate } from "./date-helpers";

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

// Get work status from entry (read-only, derived from date)
export function getWorkStatus(entry: IncomeEntry): WorkStatus {
  return isPastDate(entry.date) ? "done" : "in_progress";
}

// Get money status from entry (derived from invoiceStatus & paymentStatus)
export function getMoneyStatus(entry: IncomeEntry): MoneyStatus {
  if (entry.invoiceStatus === "cancelled") {
    return "no_invoice";
  }
  if (entry.paymentStatus === "paid" || entry.invoiceStatus === "paid") {
    return "paid";
  }
  if (entry.invoiceStatus === "sent") {
    return "invoice_sent";
  }
  return "no_invoice";
}

// Convert Hebrew display status to DB statuses
export function displayStatusToDb(status: DisplayStatus): {
  invoiceStatus: InvoiceStatus;
  paymentStatus: PaymentStatus;
} {
  switch (status) {
    case "שולם":
      return { invoiceStatus: "paid", paymentStatus: "paid" };
    case "נשלחה":
      return { invoiceStatus: "sent", paymentStatus: "unpaid" };
    case "בוצע":
    default:
      return { invoiceStatus: "draft", paymentStatus: "unpaid" };
  }
}

// Convert DB statuses to Hebrew display status
export function dbStatusToDisplay(
  invoiceStatus: InvoiceStatus,
  paymentStatus: PaymentStatus,
  isPast: boolean
): DisplayStatus | null {
  if (paymentStatus === "paid" || invoiceStatus === "paid") {
    return "שולם";
  }
  if (invoiceStatus === "sent") {
    return "נשלחה";
  }
  if (!isPast) {
    return null;
  }
  return "בוצע";
}

// All possible display statuses in order
export const DISPLAY_STATUSES: DisplayStatus[] = ["בוצע", "נשלחה", "שולם"];

// Check if a transition from one status to another is valid
export function isValidStatusTransition(): boolean {
  return true;
}

// Map display status to DB fields
export function mapStatusToDb(status: DisplayStatus): { invoiceStatus: string; paymentStatus?: string } {
  if (status === "שולם") {
    return { invoiceStatus: "paid", paymentStatus: "paid" };
  } else if (status === "נשלחה") {
    return { invoiceStatus: "sent" };
  } else {
    return { invoiceStatus: "draft" };
  }
}

// Map money status change to DB field updates
export function mapMoneyStatusToDb(moneyStatus: MoneyStatus): {
  invoiceStatus: string;
  paymentStatus?: string;
} {
  switch (moneyStatus) {
    case "paid":
      return { invoiceStatus: "paid", paymentStatus: "paid" };
    case "invoice_sent":
      return { invoiceStatus: "sent" };
    case "no_invoice":
    default:
      return { invoiceStatus: "draft", paymentStatus: "unpaid" };
  }
}

// Map VAT type to DB fields
export function mapVatTypeToDb(vatType: VatType): { vatRate?: string; includesVat: string } {
  if (vatType === "ללא מע״מ") {
    return { vatRate: "0", includesVat: "false" };
  } else if (vatType === "כולל מע״מ") {
    return { includesVat: "true" };
  } else {
    return { vatRate: "18", includesVat: "false" };
  }
}

// Get VAT type from entry
export function getVatTypeFromEntry(entry: { includesVat: boolean; vatRate: number }): VatType {
  if (entry.includesVat) return "כולל מע״מ";
  if (entry.vatRate === 0) return "ללא מע״מ";
  return "חייב מע״מ";
}
