import type { InvoiceStatus, PaymentStatus, DisplayStatus } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Centralized Status Mapping Utility
// Maps between Hebrew display statuses and English DB statuses
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert Hebrew display status to DB statuses
 */
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

/**
 * Convert DB statuses to Hebrew display status
 * Returns null for future gigs that haven't happened yet
 */
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
  // Only show "בוצע" for past jobs
  if (!isPast) {
    return null;
  }
  return "בוצע";
}

/**
 * All possible display statuses in order
 */
export const DISPLAY_STATUSES: DisplayStatus[] = ["בוצע", "נשלחה", "שולם"];

/**
 * Check if a transition from one status to another is valid
 */
export function isValidStatusTransition(): boolean {
  // Can always transition to any status (supports reverting)
  return true;
}




