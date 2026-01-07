"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getUserCategories,
  getAllUserCategories,
  createCategory,
  updateCategory,
  archiveCategory,
  unarchiveCategory,
  reorderCategories,
  seedDefaultCategoriesForUser,
  userHasCategories,
} from "./data";
import {
  createCategorySchema,
  updateCategorySchema,
  reorderCategoriesSchema,
} from "./schemas";

// Helper to get authenticated user
async function getUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user?.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Actions for Categories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get active categories for the current user
 */
export async function getCategoriesAction() {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", categories: [] };

  try {
    const categories = await getUserCategories(userId);
    return { success: true, categories };
  } catch (error) {
    console.error("Failed to get categories:", error);
    return { success: false, error: "Failed to get categories", categories: [] };
  }
}

/**
 * Get all categories including archived (for historical display)
 */
export async function getAllCategoriesAction() {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", categories: [] };

  try {
    const categories = await getAllUserCategories(userId);
    return { success: true, categories };
  } catch (error) {
    console.error("Failed to get all categories:", error);
    return { success: false, error: "Failed to get categories", categories: [] };
  }
}

/**
 * Create a new category
 */
export async function createCategoryAction(data: {
  name: string;
  color: string;
  icon: string;
}) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const result = createCategorySchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const firstError = Object.values(errors).flat()[0] || "Invalid data";
    return { success: false, error: firstError };
  }

  try {
    const category = await createCategory({
      userId,
      name: result.data.name,
      color: result.data.color,
      icon: result.data.icon,
    });
    revalidatePath("/income");
    return { success: true, category };
  } catch (error) {
    console.error("Failed to create category:", error);
    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes("unique")) {
      return { success: false, error: "קטגוריה עם שם זה כבר קיימת" };
    }
    return { success: false, error: "Failed to create category" };
  }
}

/**
 * Update an existing category
 */
export async function updateCategoryAction(data: {
  id: string;
  name?: string;
  color?: string;
  icon?: string;
}) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const result = updateCategorySchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const firstError = Object.values(errors).flat()[0] || "Invalid data";
    return { success: false, error: firstError };
  }

  try {
    const category = await updateCategory({
      id: result.data.id,
      userId,
      name: result.data.name,
      color: result.data.color,
      icon: result.data.icon,
    });
    revalidatePath("/income");
    return { success: true, category };
  } catch (error) {
    console.error("Failed to update category:", error);
    if (error instanceof Error && error.message.includes("unique")) {
      return { success: false, error: "קטגוריה עם שם זה כבר קיימת" };
    }
    return { success: false, error: "Failed to update category" };
  }
}

/**
 * Archive a category (soft delete)
 */
export async function archiveCategoryAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  if (!id) {
    return { success: false, error: "Missing category ID" };
  }

  try {
    const category = await archiveCategory(id, userId);
    revalidatePath("/income");
    return { success: true, category };
  } catch (error) {
    console.error("Failed to archive category:", error);
    return { success: false, error: "Failed to archive category" };
  }
}

/**
 * Unarchive a category
 */
export async function unarchiveCategoryAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  if (!id) {
    return { success: false, error: "Missing category ID" };
  }

  try {
    const category = await unarchiveCategory(id, userId);
    revalidatePath("/income");
    return { success: true, category };
  } catch (error) {
    console.error("Failed to unarchive category:", error);
    return { success: false, error: "Failed to unarchive category" };
  }
}

/**
 * Reorder categories
 */
export async function reorderCategoriesAction(
  reorders: { id: string; displayOrder: number }[]
) {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized" };

  const result = reorderCategoriesSchema.safeParse(reorders);
  if (!result.success) {
    return { success: false, error: "Invalid reorder data" };
  }

  try {
    await reorderCategories(userId, result.data);
    revalidatePath("/income");
    return { success: true };
  } catch (error) {
    console.error("Failed to reorder categories:", error);
    return { success: false, error: "Failed to reorder categories" };
  }
}

/**
 * Seed default categories for the current user (called on first visit)
 */
export async function seedDefaultCategoriesAction() {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", categories: [] };

  try {
    const categories = await seedDefaultCategoriesForUser(userId);
    revalidatePath("/income");
    return { success: true, categories };
  } catch (error) {
    console.error("Failed to seed default categories:", error);
    return { success: false, error: "Failed to seed categories", categories: [] };
  }
}

/**
 * Ensure user has categories (seed if needed) - called on page load
 */
export async function ensureUserCategoriesAction() {
  const userId = await getUserId();
  if (!userId) return { success: false, error: "Unauthorized", seeded: false };

  try {
    const hasCategories = await userHasCategories(userId);
    if (!hasCategories) {
      await seedDefaultCategoriesForUser(userId);
      return { success: true, seeded: true };
    }
    return { success: true, seeded: false };
  } catch (error) {
    console.error("Failed to ensure user categories:", error);
    return { success: false, error: "Failed to check categories", seeded: false };
  }
}
