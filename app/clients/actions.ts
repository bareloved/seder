"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getUserClients,
  getAllUserClients,
  getClientById,
  createClient,
  updateClient,
  archiveClient,
  unarchiveClient,
  reorderClients,
  getClientsWithAnalytics,
  findDuplicateClientNames,
  mergeClientNames,
  mergeClients,
  createClientsFromExistingNames,
  linkIncomeEntriesToClients,
} from "./data";
import {
  createClientSchema,
  updateClientSchema,
  mergeClientsSchema,
  reorderClientsSchema,
} from "./schemas";

// Helper to get authenticated user
async function getUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user?.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions for Clients
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get active clients for the current user
 */
export async function getClientsAction() {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", clients: [] };

  try {
    const clients = await getUserClients(userId);
    return { success: true, clients };
  } catch (error) {
    console.error("Failed to get clients:", error);
    return { success: false, error: "Failed to get clients", clients: [] };
  }
}

/**
 * Get all clients including archived
 */
export async function getAllClientsAction() {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", clients: [] };

  try {
    const clients = await getAllUserClients(userId);
    return { success: true, clients };
  } catch (error) {
    console.error("Failed to get all clients:", error);
    return { success: false, error: "Failed to get clients", clients: [] };
  }
}

/**
 * Get clients with analytics data
 */
export async function getClientsWithAnalyticsAction() {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", clients: [] };

  try {
    const clients = await getClientsWithAnalytics(userId);
    return { success: true, clients };
  } catch (error) {
    console.error("Failed to get clients with analytics:", error);
    return { success: false, error: "Failed to get clients", clients: [] };
  }
}

/**
 * Get a single client by ID
 */
export async function getClientAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", client: null };

  if (!id) {
    return { success: false, error: "Missing client ID", client: null };
  }

  try {
    const client = await getClientById(id, userId);
    return { success: true, client };
  } catch (error) {
    console.error("Failed to get client:", error);
    return { success: false, error: "Failed to get client", client: null };
  }
}

/**
 * Create a new client
 */
export async function createClientAction(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  defaultRate?: number | null;
}) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const result = createClientSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const firstError = Object.values(errors).flat()[0] || "Invalid data";
    return { success: false, error: firstError };
  }

  try {
    const client = await createClient({
      userId,
      name: result.data.name,
      email: result.data.email,
      phone: result.data.phone,
      notes: result.data.notes,
      defaultRate: result.data.defaultRate,
    });
    revalidatePath("/clients");
    revalidatePath("/income");
    return { success: true, client };
  } catch (error) {
    console.error("Failed to create client:", error);
    if (error instanceof Error && error.message.includes("unique")) {
      return { success: false, error: "לקוח עם שם זה כבר קיים" };
    }
    return { success: false, error: "Failed to create client" };
  }
}

/**
 * Update an existing client
 */
export async function updateClientAction(data: {
  id: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  defaultRate?: number | null;
}) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const result = updateClientSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const firstError = Object.values(errors).flat()[0] || "Invalid data";
    return { success: false, error: firstError };
  }

  try {
    const client = await updateClient({
      id: result.data.id,
      userId,
      name: result.data.name,
      email: result.data.email,
      phone: result.data.phone,
      notes: result.data.notes,
      defaultRate: result.data.defaultRate,
    });
    revalidatePath("/clients");
    revalidatePath("/income");
    return { success: true, client };
  } catch (error) {
    console.error("Failed to update client:", error);
    if (error instanceof Error && error.message.includes("unique")) {
      return { success: false, error: "לקוח עם שם זה כבר קיים" };
    }
    return { success: false, error: "Failed to update client" };
  }
}

/**
 * Archive a client (soft delete)
 */
export async function archiveClientAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  if (!id) {
    return { success: false, error: "Missing client ID" };
  }

  try {
    const client = await archiveClient(id, userId);
    revalidatePath("/clients");
    revalidatePath("/income");
    return { success: true, client };
  } catch (error) {
    console.error("Failed to archive client:", error);
    return { success: false, error: "Failed to archive client" };
  }
}

/**
 * Unarchive a client
 */
export async function unarchiveClientAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  if (!id) {
    return { success: false, error: "Missing client ID" };
  }

  try {
    const client = await unarchiveClient(id, userId);
    revalidatePath("/clients");
    revalidatePath("/income");
    return { success: true, client };
  } catch (error) {
    console.error("Failed to unarchive client:", error);
    return { success: false, error: "Failed to unarchive client" };
  }
}

/**
 * Reorder clients
 */
export async function reorderClientsAction(
  reorders: { id: string; displayOrder: number }[]
) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const result = reorderClientsSchema.safeParse(reorders);
  if (!result.success) {
    return { success: false, error: "Invalid reorder data" };
  }

  try {
    await reorderClients(userId, result.data);
    revalidatePath("/clients");
    revalidatePath("/income");
    return { success: true };
  } catch (error) {
    console.error("Failed to reorder clients:", error);
    return { success: false, error: "Failed to reorder clients" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate Detection & Merge Actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find potential duplicate client names
 */
export async function findDuplicatesAction() {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", duplicates: [] };

  try {
    const duplicates = await findDuplicateClientNames(userId);
    return { success: true, duplicates };
  } catch (error) {
    console.error("Failed to find duplicates:", error);
    return { success: false, error: "Failed to find duplicates", duplicates: [] };
  }
}

/**
 * Merge client names into one
 */
export async function mergeClientNamesAction(
  targetName: string,
  sourceNames: string[]
) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", updatedCount: 0 };

  if (!targetName || sourceNames.length === 0) {
    return { success: false, error: "Invalid merge data", updatedCount: 0 };
  }

  try {
    const result = await mergeClientNames(userId, targetName, sourceNames);
    revalidatePath("/clients");
    revalidatePath("/income");
    return { success: true, ...result };
  } catch (error) {
    console.error("Failed to merge client names:", error);
    return { success: false, error: "Failed to merge clients", updatedCount: 0 };
  }
}

/**
 * Merge multiple client records into one
 */
export async function mergeClientsAction(data: {
  targetId: string;
  sourceIds: string[];
}) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", updatedCount: 0 };

  const result = mergeClientsSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const firstError = Object.values(errors).flat()[0] || "Invalid data";
    return { success: false, error: firstError, updatedCount: 0 };
  }

  try {
    const mergeResult = await mergeClients(userId, result.data.targetId, result.data.sourceIds);
    revalidatePath("/clients");
    revalidatePath("/income");
    return { success: true, ...mergeResult };
  } catch (error) {
    console.error("Failed to merge clients:", error);
    return { success: false, error: "Failed to merge clients", updatedCount: 0 };
  }
}

/**
 * Create client records from existing income entry names
 */
export async function createClientsFromExistingAction() {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", createdCount: 0 };

  try {
    const createdCount = await createClientsFromExistingNames(userId);
    revalidatePath("/clients");
    return { success: true, createdCount };
  } catch (error) {
    console.error("Failed to create clients from existing:", error);
    return { success: false, error: "Failed to create clients", createdCount: 0 };
  }
}

/**
 * Link income entries to their client records
 */
export async function linkEntriesToClientsAction() {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", linkedCount: 0 };

  try {
    const linkedCount = await linkIncomeEntriesToClients(userId);
    revalidatePath("/clients");
    revalidatePath("/income");
    return { success: true, linkedCount };
  } catch (error) {
    console.error("Failed to link entries to clients:", error);
    return { success: false, error: "Failed to link entries", linkedCount: 0 };
  }
}
