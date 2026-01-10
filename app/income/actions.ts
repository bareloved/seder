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
  if (!userId) return { success: false, error: "Unauthorized", events: [] };

  const accessToken = await getGoogleAccessToken(userId);
  if (!accessToken) {
    return { success: false, error: "Google Calendar not connected", events: [] };
  }

  try {
    const { listEventsForMonth } = await import("@/lib/googleCalendar");
    const events = await listEventsForMonth(year, month, accessToken, calendarIds);

    // Serialize dates for client
    const serializedEvents = events.map((e) => ({
      id: e.id,
      summary: e.summary,
      start: e.start.toISOString(),
      end: e.end.toISOString(),
      calendarId: e.calendarId,
    }));

    return { success: true, events: serializedEvents };
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch events",
      events: []
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
