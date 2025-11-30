"use server";

import { revalidatePath } from "next/cache";
import {
  createIncomeEntry,
  updateIncomeEntry,
  markIncomeEntryAsPaid,
  markInvoiceSent,
  revertToDraft,
  revertToSent,
  deleteIncomeEntry,
  importIncomeEntriesFromCalendarForMonth,
  type CreateIncomeEntryInput,
  type UpdateIncomeEntryInput,
} from "./data";
import { createIncomeEntrySchema, updateIncomeEntrySchema } from "./schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions for Income Entries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new income entry
 */
export async function createIncomeEntryAction(formData: FormData) {
  const result = createIncomeEntrySchema.safeParse(formData);

  if (!result.success) {
    console.error("Validation error:", result.error.flatten());
    return { success: false, error: "Invalid form data" };
  }

  const data = result.data;

  const input: CreateIncomeEntryInput = {
    date: data.date,
    description: data.description,
    clientName: data.clientName,
    amountGross: data.amountGross,
    amountPaid: data.amountPaid,
    category: data.category,
    notes: data.notes,
    vatRate: data.vatRate,
    includesVat: data.includesVat,
    invoiceStatus: data.invoiceStatus,
    paymentStatus: data.paymentStatus,
    invoiceSentDate: data.invoiceSentDate,
    paidDate: data.paidDate,
  };

  try {
    const entry = await createIncomeEntry(input);
    revalidatePath("/income");
    return { success: true, entry };
  } catch (error) {
    console.error("Failed to create income entry:", error);
    return { success: false, error: "Failed to create entry" };
  }
}

/**
 * Update an existing income entry
 */
export async function updateIncomeEntryAction(formData: FormData) {
  const result = updateIncomeEntrySchema.safeParse(formData);

  if (!result.success) {
    console.error("Validation error:", result.error.flatten());
    return { success: false, error: "Invalid form data" };
  }

  const data = result.data;

  const input: UpdateIncomeEntryInput = {
    id: data.id,
    date: data.date,
    description: data.description,
    clientName: data.clientName,
    amountGross: data.amountGross,
    amountPaid: data.amountPaid,
    category: data.category,
    notes: data.notes,
    vatRate: data.vatRate,
    includesVat: data.includesVat,
    invoiceStatus: data.invoiceStatus,
    paymentStatus: data.paymentStatus,
    invoiceSentDate: data.invoiceSentDate ?? undefined, // Handle null/undefined
    paidDate: data.paidDate ?? undefined,
  };

  try {
    const entry = await updateIncomeEntry(input);
    revalidatePath("/income");
    return { success: true, entry };
  } catch (error) {
    console.error("Failed to update income entry:", error);
    return { success: false, error: "Failed to update entry" };
  }
}

/**
 * Mark an entry as fully paid
 */
export async function markIncomeEntryAsPaidAction(id: string) {
  if (!id) {
    return { success: false, error: "Missing entry ID" };
  }

  try {
    const entry = await markIncomeEntryAsPaid(id);
    revalidatePath("/income");
    return { success: true, entry };
  } catch (error) {
    console.error("Failed to mark entry as paid:", error);
    return { success: false, error: "Failed to mark as paid" };
  }
}

/**
 * Mark an entry as invoice sent
 */
export async function markInvoiceSentAction(id: string) {
  if (!id) {
    return { success: false, error: "Missing entry ID" };
  }

  try {
    const entry = await markInvoiceSent(id);
    revalidatePath("/income");
    return { success: true, entry };
  } catch (error) {
    console.error("Failed to mark invoice as sent:", error);
    return { success: false, error: "Failed to mark invoice sent" };
  }
}

/**
 * Update entry status (invoice status or payment status)
 * Supports both forward progression and reverting to previous statuses
 */
export async function updateEntryStatusAction(
  id: string,
  status: "בוצע" | "נשלחה" | "שולם"
) {
  if (!id) {
    return { success: false, error: "Missing entry ID" };
  }

  try {
    let entry;
    if (status === "שולם") {
      entry = await markIncomeEntryAsPaid(id);
    } else if (status === "נשלחה") {
      entry = await revertToSent(id);
    } else if (status === "בוצע") {
      entry = await revertToDraft(id);
    }
    
    revalidatePath("/income");
    return { success: true, entry };
  } catch (error) {
    console.error("Failed to update entry status:", error);
    return { success: false, error: "Failed to update status" };
  }
}

/**
 * Delete an income entry
 */
export async function deleteIncomeEntryAction(id: string) {
  if (!id) {
    return { success: false, error: "Missing entry ID" };
  }

  try {
    const deleted = await deleteIncomeEntry(id);
    revalidatePath("/income");
    return { success: deleted };
  } catch (error) {
    console.error("Failed to delete income entry:", error);
    return { success: false, error: "Failed to delete entry" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Import Actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Import income entries from Google Calendar for a specific month.
 * Can be called directly with year and month parameters.
 */
export async function importFromCalendarAction(year: number, month: number) {
  // Validate inputs
  if (!year || !month || month < 1 || month > 12) {
    return { success: false, error: "Invalid year or month", count: 0 };
  }

  try {
    const count = await importIncomeEntriesFromCalendarForMonth({ year, month });
    revalidatePath("/income");
    return { success: true, count };
  } catch (error) {
    console.error("Failed to import from calendar:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import from calendar",
      count: 0,
    };
  }
}

/**
 * Import income entries from Google Calendar - Form action variant.
 * Accepts FormData with hidden year and month fields.
 */
export async function importFromCalendarFormAction(formData: FormData) {
  const yearStr = formData.get("year");
  const monthStr = formData.get("month");

  const year = yearStr ? parseInt(yearStr.toString(), 10) : 0;
  const month = monthStr ? parseInt(monthStr.toString(), 10) : 0;

  return importFromCalendarAction(year, month);
}
