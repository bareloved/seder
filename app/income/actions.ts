"use server";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  createIncomeEntry,
  updateIncomeEntry,
  markIncomeEntryAsPaid,
  markInvoiceSent,
  revertToDraft,
  revertToSent,
  deleteIncomeEntry,
  batchUpdateIncomeEntries,
  batchDeleteIncomeEntries,
  type CreateIncomeEntryInput,
  type UpdateIncomeEntryInput,
  type BatchUpdateInput,
} from "./data";
import { createIncomeEntrySchema, updateIncomeEntrySchema } from "./schemas";
import { getValidGoogleAccessToken, GoogleTokenError } from "@/lib/googleTokens";

// Helper to get authenticated user
async function getUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user?.id;
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
    clientId: data.clientId,
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
    clientId: data.clientId,
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

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Import Actions (Preview Flow)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch calendar events without importing (for preview)
 */
export async function fetchCalendarEventsAction(
  year: number,
  month: number,
  calendarIds: string[] = ["primary"]
) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", events: [], importedEventIds: [], requiresReconnect: false };

  try {
    // Get a valid access token (with auto-refresh)
    const accessToken = await getValidGoogleAccessToken(userId);

    const { listEventsForMonth } = await import("@/lib/googleCalendar");
    const events = await listEventsForMonth(year, month, accessToken, calendarIds);

    // Check which events are already imported
    const { getImportedCalendarEventIds } = await import("./data");
    const eventIds = events.map((e) => e.id);
    const importedEventIds = await getImportedCalendarEventIds(userId, eventIds);

    // Serialize dates for client
    const serializedEvents = events.map((e) => ({
      id: e.id,
      summary: e.summary,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      calendarId: e.calendarId,
    }));

    return { success: true, events: serializedEvents, importedEventIds, requiresReconnect: false };
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);

    if (error instanceof GoogleTokenError) {
      return {
        success: false,
        error: error.message,
        events: [],
        importedEventIds: [],
        requiresReconnect: error.requiresReconnect,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch events",
      events: [],
      importedEventIds: [],
      requiresReconnect: false,
    };
  }
}

/**
 * Import selected events with user-provided data
 */
export async function importSelectedEventsAction(
  events: Array<{
    calendarEventId: string;
    summary: string;
    date: string;
    clientName: string;
  }>
) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", count: 0 };

  if (events.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    const { createIncomeEntry } = await import("./data");

    let importedCount = 0;
    for (const event of events) {
      try {
        await createIncomeEntry({
          date: event.date,
          description: event.summary,
          clientName: event.clientName || "",
          amountGross: 0,
          amountPaid: 0,
          vatRate: 18,
          includesVat: true,
          invoiceStatus: "draft",
          paymentStatus: "unpaid",
          calendarEventId: event.calendarEventId,
          notes: "יובא מהיומן",
          userId,
        });
        importedCount++;
      } catch (entryError) {
        // Skip duplicates or errors, continue with others
        console.warn("Failed to import event:", event.summary, entryError);
      }
    }

    revalidatePath("/income");
    updateTag("income-data");

    return { success: true, count: importedCount };
  } catch (error) {
    console.error("Failed to import selected events:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Import failed",
      count: 0
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Update Actions
// ─────────────────────────────────────────────────────────────────────────────

export interface BatchUpdatePayload {
  clientName?: string;
  categoryId?: string | null;
  markAsPaid?: boolean;
  markInvoiceSent?: boolean;
}

/**
 * Batch update multiple income entries
 */
export async function batchUpdateEntriesAction(
  ids: string[],
  updates: BatchUpdatePayload
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  const userId = await getUserId();
  if (!userId) return { success: false, updatedCount: 0, error: "Unauthorized" };

  if (ids.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  try {
    // Transform payload to BatchUpdateInput
    const batchUpdates: BatchUpdateInput = {};

    if (updates.clientName !== undefined) {
      batchUpdates.clientName = updates.clientName;
    }

    if (updates.categoryId !== undefined) {
      batchUpdates.categoryId = updates.categoryId;
    }

    if (updates.markAsPaid) {
      batchUpdates.paymentStatus = "paid";
      batchUpdates.invoiceStatus = "paid";
    }

    if (updates.markInvoiceSent && !updates.markAsPaid) {
      batchUpdates.invoiceStatus = "sent";
    }

    const updatedCount = await batchUpdateIncomeEntries(ids, userId, batchUpdates);

    revalidatePath("/income");
    updateTag("income-data");

    return { success: true, updatedCount };
  } catch (error) {
    console.error("Failed to batch update entries:", error);
    return {
      success: false,
      updatedCount: 0,
      error: error instanceof Error ? error.message : "Batch update failed"
    };
  }
}

/**
 * Batch delete multiple income entries
 */
export async function batchDeleteEntriesAction(
  ids: string[]
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const userId = await getUserId();
  if (!userId) return { success: false, deletedCount: 0, error: "Unauthorized" };

  if (ids.length === 0) {
    return { success: true, deletedCount: 0 };
  }

  try {
    const deletedCount = await batchDeleteIncomeEntries(ids, userId);

    revalidatePath("/income");
    updateTag("income-data");

    return { success: true, deletedCount };
  } catch (error) {
    console.error("Failed to batch delete entries:", error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : "Batch delete failed"
    };
  }
}
