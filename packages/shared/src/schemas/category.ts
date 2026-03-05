import { z } from "zod";
import { categoryColors, categoryIcons } from "../types/category";

export const createCategorySchema = z.object({
  name: z.string().min(1, "שם הקטגוריה נדרש").max(50, "שם הקטגוריה ארוך מדי"),
  color: z.enum(categoryColors, { message: "צבע לא תקין" }),
  icon: z.enum(categoryIcons, { message: "אייקון לא תקין" }),
});

export const updateCategorySchema = z.object({
  id: z.string().uuid("מזהה קטגוריה לא תקין"),
  name: z.string().min(1, "שם הקטגוריה נדרש").max(50, "שם הקטגוריה ארוך מדי").optional(),
  color: z.enum(categoryColors, { message: "צבע לא תקין" }).optional(),
  icon: z.enum(categoryIcons, { message: "אייקון לא תקין" }).optional(),
});

export const reorderCategoriesSchema = z.array(
  z.object({
    id: z.string().uuid("מזהה קטגוריה לא תקין"),
    displayOrder: z.number().int().min(0),
  })
);

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;
