"use server";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { account } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  createIncomeEntry,
  updateIncomeEntry,
  markIncomeEntryAsPaid,
  markInvoiceSent,
  revertToDraft,
  revertToSent,
  deleteIncomeEntry,
  importIncomeEntriesFromCalendarForMonth,
  CalendarImportError,
  type CreateIncomeEntryInput,
  type UpdateIncomeEntryInput,
} from "./data";
import { createIncomeEntrySchema, updateIncomeEntrySchema } from "./schemas";

// Helper to get authenticated user
async function getUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user?.id;
}

// Helper to get Google Access Token
async function getGoogleAccessToken(userId: string) {
  // Find the Google account linked to this user
  const [googleAccount] = await db
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")))
    .limit(1);

  if (!googleAccount || !googleAccount.accessToken) {
    return null;
  }

  return googleAccount.accessToken;
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions for Income Entries
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new income entry
 */
export async function createIncomeEntryAction(formData: FormData) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

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
    categoryId: data.categoryId,
    notes: data.notes,
    vatRate: data.vatRate,
    includesVat: data.includesVat,
    invoiceStatus: data.invoiceStatus,
    paymentStatus: data.paymentStatus,
    invoiceSentDate: data.invoiceSentDate,
    paidDate: data.paidDate,
    userId,
  };

  try {
    const entry = await createIncomeEntry(input);
    revalidatePath("/income");
    updateTag("income-data");
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
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const result = updateIncomeEntrySchema.safeParse(formData);

  if (!result.success) {
    console.error("Validation error:", result.error.flatten());
    return { success: false, error: "Invalid form data" };
  }

  const data = result.data;

  const input: UpdateIncomeEntryInput = {
    id: data.id,
    userId,
    date: data.date,
    description: data.description,
    clientName: data.clientName,
    amountGross: data.amountGross,
    amountPaid: data.amountPaid,
    category: data.category,
    categoryId: data.categoryId,
    notes: data.notes,
    vatRate: data.vatRate,
    includesVat: data.includesVat,
    invoiceStatus: data.invoiceStatus,
    paymentStatus: data.paymentStatus,
    invoiceSentDate: data.invoiceSentDate ?? undefined,
    paidDate: data.paidDate ?? undefined,
  };

  try {
    const entry = await updateIncomeEntry(input);
    revalidatePath("/income");
    updateTag("income-data");
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
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  if (!id) {
    return { success: false, error: "Missing entry ID" };
  }

  try {
    const entry = await markIncomeEntryAsPaid(id, userId);
    revalidatePath("/income");
    updateTag("income-data");
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
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  if (!id) {
    return { success: false, error: "Missing entry ID" };
  }

  try {
    const entry = await markInvoiceSent(id, userId);
    revalidatePath("/income");
    updateTag("income-data");
    return { success: true, entry };
  } catch (error) {
    console.error("Failed to mark invoice as sent:", error);
    return { success: false, error: "Failed to mark invoice sent" };
  }
}

/**
 * Update entry status (invoice status or payment status)
 */
export async function updateEntryStatusAction(
  id: string,
  status: "בוצע" | "נשלחה" | "שולם"
) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  if (!id) {
    return { success: false, error: "Missing entry ID" };
  }

  try {
    let entry;
    if (status === "שולם") {
      entry = await markIncomeEntryAsPaid(id, userId);
    } else if (status === "נשלחה") {
      entry = await revertToSent(id, userId);
    } else if (status === "בוצע") {
      entry = await revertToDraft(id, userId);
    }
    
    revalidatePath("/income");
    updateTag("income-data");
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
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  if (!id) {
    return { success: false, error: "Missing entry ID" };
  }

  try {
    const deleted = await deleteIncomeEntry(id, userId);
    revalidatePath("/income");
    updateTag("income-data");
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
 */
export async function importFromCalendarAction(year: number, month: number) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", count: 0 };

  // Validate inputs
  if (!year || !month || month < 1 || month > 12) {
    return { success: false, error: "Invalid year or month", count: 0 };
  }

  // Get Google Access Token
  const accessToken = await getGoogleAccessToken(userId);
  if (!accessToken) {
    return { 
      success: false, 
      error: "Google Calendar permission missing. Please sign out and sign in again.", 
      count: 0 
    };
  }

  try {
    const count = await importIncomeEntriesFromCalendarForMonth({ 
      year, 
      month, 
      userId,
      accessToken 
    });
    revalidatePath("/income");
    updateTag("income-data");
    return { success: true, count };
  } catch (error) {
    console.error("Failed to import from calendar:", error);
    if (error instanceof CalendarImportError) {
      const message =
        error.type === "tokenExpired"
          ? "חיבור היומן פג תוקף, התחבר מחדש."
          : error.message;
      return {
        success: false,
        error: message,
        count: 0,
        type: error.type,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to import from calendar",
      count: 0,
      type: "unknown",
    };
  }
}

/**
 * Import income entries from Google Calendar - Form action variant.
 */
export async function importFromCalendarFormAction(formData: FormData) {
  const yearStr = formData.get("year");
  const monthStr = formData.get("month");

  const year = yearStr ? parseInt(yearStr.toString(), 10) : 0;
  const month = monthStr ? parseInt(monthStr.toString(), 10) : 0;

  return importFromCalendarAction(year, month);
}
