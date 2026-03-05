import { db } from "@/db/client";
import { clients, incomeEntries, type Client, type NewClient } from "@/db/schema";
import { eq, and, asc, desc, sql, count, inArray } from "drizzle-orm";
import type { ClientWithAnalytics, DuplicateGroup } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Query functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all active (non-archived) clients for a user, ordered by displayOrder/name
 */
export async function getUserClients(userId: string): Promise<Client[]> {
  const result = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.userId, userId),
        eq(clients.isArchived, false)
      )
    )
    .orderBy(asc(clients.displayOrder), asc(clients.name));

  return result;
}

/**
 * Get all clients for a user including archived (for historical data display)
 */
export async function getAllUserClients(userId: string): Promise<Client[]> {
  const result = await db
    .select()
    .from(clients)
    .where(eq(clients.userId, userId))
    .orderBy(asc(clients.displayOrder), asc(clients.name));

  return result;
}

/**
 * Get a single client by ID (with user ownership check)
 */
export async function getClientById(
  id: string,
  userId: string
): Promise<Client | null> {
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.userId, userId)))
    .limit(1);

  return client || null;
}

/**
 * Get a client by name for a user (used for lookups)
 */
export async function getClientByName(
  name: string,
  userId: string
): Promise<Client | null> {
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.name, name), eq(clients.userId, userId)))
    .limit(1);

  return client || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD operations
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateClientInput {
  userId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  defaultRate?: number | null;
}

/**
 * Create a new client with auto-calculated displayOrder
 */
export async function createClient(input: CreateClientInput): Promise<Client> {
  // Get the max displayOrder for this user
  const [maxOrderResult] = await db
    .select({ maxOrder: sql<string>`MAX(${clients.displayOrder})` })
    .from(clients)
    .where(eq(clients.userId, input.userId));

  const nextOrder = maxOrderResult?.maxOrder
    ? parseInt(maxOrderResult.maxOrder) + 1
    : 1;

  const [client] = await db
    .insert(clients)
    .values({
      userId: input.userId,
      name: input.name,
      email: input.email,
      phone: input.phone,
      notes: input.notes,
      defaultRate: input.defaultRate?.toFixed(2),
      displayOrder: nextOrder.toString(),
    })
    .returning();

  if (!client) throw new Error("Failed to create client");
  return client;
}

export interface UpdateClientInput {
  id: string;
  userId: string;
  name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  defaultRate?: number | null;
}

/**
 * Update client properties
 */
export async function updateClient(input: UpdateClientInput): Promise<Client> {
  const { id, userId, ...updates } = input;

  const updateData: Partial<NewClient> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.defaultRate !== undefined) {
    updateData.defaultRate = updates.defaultRate?.toFixed(2) ?? null;
  }
  updateData.updatedAt = new Date();

  const [client] = await db
    .update(clients)
    .set(updateData)
    .where(and(eq(clients.id, id), eq(clients.userId, userId)))
    .returning();

  if (!client) throw new Error(`Failed to update client - not found or access denied`);
  return client;
}

/**
 * Archive a client (soft delete)
 */
export async function archiveClient(id: string, userId: string): Promise<Client> {
  const [client] = await db
    .update(clients)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.userId, userId)))
    .returning();

  if (!client) throw new Error(`Failed to archive client - not found or access denied`);
  return client;
}

/**
 * Unarchive a client
 */
export async function unarchiveClient(id: string, userId: string): Promise<Client> {
  const [client] = await db
    .update(clients)
    .set({ isArchived: false, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.userId, userId)))
    .returning();

  if (!client) throw new Error(`Failed to unarchive client - not found or access denied`);
  return client;
}

/**
 * Reorder clients - batch update displayOrder
 */
export async function reorderClients(
  userId: string,
  reorders: { id: string; displayOrder: number }[]
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const { id, displayOrder } of reorders) {
      await tx
        .update(clients)
        .set({ displayOrder: displayOrder.toString(), updatedAt: new Date() })
        .where(and(eq(clients.id, id), eq(clients.userId, userId)));
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get clients with analytics data
 */
export async function getClientsWithAnalytics(userId: string): Promise<ClientWithAnalytics[]> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const yearStart = `${currentYear}-01-01`;
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Get all clients
  const allClients = await getUserClients(userId);

  // Get aggregated analytics for all clients
  const analytics = await db
    .select({
      clientId: incomeEntries.clientId,
      totalEarned: sql<string>`COALESCE(SUM(${incomeEntries.amountPaid}), 0)`.mapWith(Number),
      thisMonthRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${incomeEntries.date} >= ${monthStart} THEN ${incomeEntries.amountPaid} ELSE 0 END), 0)`.mapWith(Number),
      thisYearRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${incomeEntries.date} >= ${yearStart} THEN ${incomeEntries.amountPaid} ELSE 0 END), 0)`.mapWith(Number),
      jobCount: count(),
      outstandingAmount: sql<string>`COALESCE(SUM(CASE WHEN ${incomeEntries.invoiceStatus} = 'sent' AND ${incomeEntries.paymentStatus} != 'paid' THEN (${incomeEntries.amountGross} - ${incomeEntries.amountPaid}) ELSE 0 END), 0)`.mapWith(Number),
      overdueInvoices: sql<number>`COUNT(CASE WHEN ${incomeEntries.invoiceStatus} = 'sent' AND ${incomeEntries.paymentStatus} != 'paid' AND ${incomeEntries.invoiceSentDate} < ${thirtyDaysAgo} THEN 1 END)`.mapWith(Number),
      avgDaysToPayment: sql<number | null>`AVG(CASE WHEN ${incomeEntries.paidDate} IS NOT NULL AND ${incomeEntries.invoiceSentDate} IS NOT NULL THEN EXTRACT(DAY FROM (${incomeEntries.paidDate}::timestamp - ${incomeEntries.invoiceSentDate}::timestamp)) END)`.mapWith(Number),
    })
    .from(incomeEntries)
    .where(
      and(
        eq(incomeEntries.userId, userId),
        sql`${incomeEntries.clientId} IS NOT NULL`
      )
    )
    .groupBy(incomeEntries.clientId);

  // Map analytics to clients
  const analyticsMap = new Map(analytics.map((a) => [a.clientId, a]));

  return allClients.map((client) => {
    const clientAnalytics = analyticsMap.get(client.id);
    const jobCount = clientAnalytics?.jobCount ?? 0;
    const totalEarned = clientAnalytics?.totalEarned ?? 0;

    return {
      ...client,
      totalEarned,
      thisMonthRevenue: clientAnalytics?.thisMonthRevenue ?? 0,
      thisYearRevenue: clientAnalytics?.thisYearRevenue ?? 0,
      averagePerJob: jobCount > 0 ? totalEarned / jobCount : 0,
      jobCount,
      outstandingAmount: clientAnalytics?.outstandingAmount ?? 0,
      avgDaysToPayment: clientAnalytics?.avgDaysToPayment ?? null,
      overdueInvoices: clientAnalytics?.overdueInvoices ?? 0,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Duplicate Detection & Merge
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize client name for duplicate detection
 */
function normalizeClientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,\-_'"`]/g, "")
    .replace(/\bבע״מ\b/g, "")
    .replace(/\bבעמ\b/g, "")
    .replace(/\bltd\b/i, "")
    .replace(/\binc\b/i, "")
    .replace(/\bllc\b/i, "")
    .trim();
}

/**
 * Find potential duplicate client names from existing income entries
 * Returns groups of similar names for user to review
 */
export async function findDuplicateClientNames(userId: string): Promise<DuplicateGroup[]> {
  // Get all unique client names with their usage counts and last used date
  const clientNames = await db
    .select({
      clientName: incomeEntries.clientName,
      count: count(),
      lastUsed: sql<string>`MAX(${incomeEntries.date})`,
    })
    .from(incomeEntries)
    .where(eq(incomeEntries.userId, userId))
    .groupBy(incomeEntries.clientName)
    .orderBy(desc(count()));

  // Group by normalized name
  const groups = new Map<string, DuplicateGroup["clients"]>();

  for (const { clientName, count: cnt, lastUsed } of clientNames) {
    if (!clientName) continue;
    const normalized = normalizeClientName(clientName);
    if (!normalized) continue;

    const existing = groups.get(normalized) || [];
    existing.push({
      name: clientName,
      count: cnt,
      lastUsed,
    });
    groups.set(normalized, existing);
  }

  // Filter to only groups with multiple variants (potential duplicates)
  const duplicates: DuplicateGroup[] = [];
  for (const [normalizedName, clients] of groups) {
    if (clients.length > 1) {
      duplicates.push({ normalizedName, clients });
    }
  }

  return duplicates.sort((a, b) => {
    const totalA = a.clients.reduce((sum, c) => sum + c.count, 0);
    const totalB = b.clients.reduce((sum, c) => sum + c.count, 0);
    return totalB - totalA;
  });
}

/**
 * Merge multiple client names into one
 * - Updates all income entries to use the target name
 * - Creates a client record if needed
 * Returns the number of updated entries
 */
export async function mergeClientNames(
  userId: string,
  targetName: string,
  sourceNames: string[]
): Promise<{ updatedCount: number; clientId: string }> {
  // First, ensure a client record exists for the target name
  let targetClient = await getClientByName(targetName, userId);
  if (!targetClient) {
    targetClient = await createClient({ userId, name: targetName });
  }

  // Update all income entries with source names to use target name and client
  const allNames = [...sourceNames, targetName];
  const result = await db
    .update(incomeEntries)
    .set({
      clientName: targetName,
      clientId: targetClient.id,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(incomeEntries.userId, userId),
        inArray(incomeEntries.clientName, allNames)
      )
    )
    .returning({ id: incomeEntries.id });

  return { updatedCount: result.length, clientId: targetClient.id };
}

/**
 * Merge multiple client records into one
 * - Updates all income entries to point to target client
 * - Archives source clients
 */
export async function mergeClients(
  userId: string,
  targetId: string,
  sourceIds: string[]
): Promise<{ updatedCount: number }> {
  // Get the target client
  const targetClient = await getClientById(targetId, userId);
  if (!targetClient) {
    throw new Error("Target client not found");
  }

  // Update all income entries from source clients to target client
  let totalUpdated = 0;
  await db.transaction(async (tx) => {
    // Update income entries
    const result = await tx
      .update(incomeEntries)
      .set({
        clientId: targetId,
        clientName: targetClient.name,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(incomeEntries.userId, userId),
          inArray(incomeEntries.clientId, sourceIds)
        )
      )
      .returning({ id: incomeEntries.id });

    totalUpdated = result.length;

    // Archive source clients
    for (const sourceId of sourceIds) {
      await tx
        .update(clients)
        .set({ isArchived: true, updatedAt: new Date() })
        .where(and(eq(clients.id, sourceId), eq(clients.userId, userId)));
    }
  });

  return { updatedCount: totalUpdated };
}

/**
 * Create clients from existing unique client names in income entries
 * Useful for initial migration
 */
export async function createClientsFromExistingNames(userId: string): Promise<number> {
  // Get all unique client names that don't have a corresponding client record
  const existingClients = await getUserClients(userId);
  const existingNames = new Set(existingClients.map((c) => c.name.toLowerCase()));

  const uniqueNames = await db
    .select({
      clientName: incomeEntries.clientName,
    })
    .from(incomeEntries)
    .where(eq(incomeEntries.userId, userId))
    .groupBy(incomeEntries.clientName);

  let created = 0;
  for (const { clientName } of uniqueNames) {
    if (!clientName || existingNames.has(clientName.toLowerCase())) continue;

    try {
      await createClient({ userId, name: clientName });
      existingNames.add(clientName.toLowerCase());
      created++;
    } catch {
      // Skip duplicates (race condition or case mismatch)
    }
  }

  return created;
}

/**
 * Link income entries to their corresponding client records
 * Updates clientId based on clientName match
 */
export async function linkIncomeEntriesToClients(userId: string): Promise<number> {
  const allClients = await getAllUserClients(userId);
  const clientMap = new Map(allClients.map((c) => [c.name.toLowerCase(), c.id]));

  // Find entries without clientId but with clientName
  const unlinkedEntries = await db
    .select({
      id: incomeEntries.id,
      clientName: incomeEntries.clientName,
    })
    .from(incomeEntries)
    .where(
      and(
        eq(incomeEntries.userId, userId),
        sql`${incomeEntries.clientId} IS NULL`,
        sql`${incomeEntries.clientName} IS NOT NULL AND ${incomeEntries.clientName} != ''`
      )
    );

  let linked = 0;
  for (const entry of unlinkedEntries) {
    const clientId = clientMap.get(entry.clientName.toLowerCase());
    if (clientId) {
      await db
        .update(incomeEntries)
        .set({ clientId, updatedAt: new Date() })
        .where(eq(incomeEntries.id, entry.id));
      linked++;
    }
  }

  return linked;
}
