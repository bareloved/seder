import { db } from "@/db/client";
import { categories, type Category, type NewCategory } from "@/db/schema";
import { eq, and, asc, sql } from "drizzle-orm";
import { DEFAULT_CATEGORIES } from "./schemas";

// ─────────────────────────────────────────────────────────────────────────────
// Query functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all active (non-archived) categories for a user, ordered by displayOrder
 */
export async function getUserCategories(userId: string): Promise<Category[]> {
  const result = await db
    .select()
    .from(categories)
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.isArchived, false)
      )
    )
    .orderBy(asc(categories.displayOrder));

  return result;
}

/**
 * Get all categories for a user including archived (for historical data display)
 */
export async function getAllUserCategories(userId: string): Promise<Category[]> {
  const result = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(asc(categories.displayOrder));

  return result;
}

/**
 * Get a single category by ID (with user ownership check)
 */
export async function getCategoryById(
  id: string,
  userId: string
): Promise<Category | null> {
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);

  return category || null;
}

/**
 * Get a category by name for a user (used for lookups)
 */
export async function getCategoryByName(
  name: string,
  userId: string
): Promise<Category | null> {
  const [category] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.name, name), eq(categories.userId, userId)))
    .limit(1);

  return category || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD operations
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateCategoryInput {
  userId: string;
  name: string;
  color: string;
  icon: string;
}

/**
 * Create a new category with auto-calculated displayOrder
 */
export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  // Get the max displayOrder for this user
  const [maxOrderResult] = await db
    .select({ maxOrder: sql<string>`MAX(${categories.displayOrder})` })
    .from(categories)
    .where(eq(categories.userId, input.userId));

  const nextOrder = maxOrderResult?.maxOrder
    ? parseInt(maxOrderResult.maxOrder) + 1
    : 1;

  const [category] = await db
    .insert(categories)
    .values({
      userId: input.userId,
      name: input.name,
      color: input.color,
      icon: input.icon,
      displayOrder: nextOrder.toString(),
    })
    .returning();

  if (!category) throw new Error("Failed to create category");
  return category;
}

export interface UpdateCategoryInput {
  id: string;
  userId: string;
  name?: string;
  color?: string;
  icon?: string;
}

/**
 * Update category properties (name, color, icon)
 */
export async function updateCategory(input: UpdateCategoryInput): Promise<Category> {
  const { id, userId, ...updates } = input;

  const updateData: Partial<NewCategory> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.icon !== undefined) updateData.icon = updates.icon;
  updateData.updatedAt = new Date();

  const [category] = await db
    .update(categories)
    .set(updateData)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();

  if (!category) throw new Error(`Failed to update category - not found or access denied`);
  return category;
}

/**
 * Archive a category (soft delete)
 */
export async function archiveCategory(id: string, userId: string): Promise<Category> {
  const [category] = await db
    .update(categories)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();

  if (!category) throw new Error(`Failed to archive category - not found or access denied`);
  return category;
}

/**
 * Unarchive a category
 */
export async function unarchiveCategory(id: string, userId: string): Promise<Category> {
  const [category] = await db
    .update(categories)
    .set({ isArchived: false, updatedAt: new Date() })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();

  if (!category) throw new Error(`Failed to unarchive category - not found or access denied`);
  return category;
}

/**
 * Reorder categories - batch update displayOrder
 */
export async function reorderCategories(
  userId: string,
  reorders: { id: string; displayOrder: number }[]
): Promise<void> {
  // Use a transaction for atomic updates
  await db.transaction(async (tx) => {
    for (const { id, displayOrder } of reorders) {
      await tx
        .update(categories)
        .set({ displayOrder: displayOrder.toString(), updatedAt: new Date() })
        .where(and(eq(categories.id, id), eq(categories.userId, userId)));
    }
  });
}

/**
 * Seed default categories for a new user
 */
export async function seedDefaultCategoriesForUser(userId: string): Promise<Category[]> {
  // Check if user already has categories
  const existing = await db
    .select({ count: sql<number>`count(*)` })
    .from(categories)
    .where(eq(categories.userId, userId));

  if (existing[0] && existing[0].count > 0) {
    // User already has categories, return them
    return getUserCategories(userId);
  }

  // Insert default categories
  const newCategories = await db
    .insert(categories)
    .values(
      DEFAULT_CATEGORIES.map((cat) => ({
        userId,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        displayOrder: cat.displayOrder.toString(),
      }))
    )
    .returning();

  return newCategories;
}

/**
 * Check if user has any categories (used to trigger seeding)
 */
export async function userHasCategories(userId: string): Promise<boolean> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(categories)
    .where(eq(categories.userId, userId));

  return result?.count > 0;
}
