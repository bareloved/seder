import { z } from "zod";

// Create client schema
export const createClientSchema = z.object({
  name: z.string().min(1, "שם הלקוח נדרש").max(100, "שם הלקוח ארוך מדי"),
  email: z.string().email("כתובת אימייל לא תקינה").max(255).optional().nullable(),
  phone: z.string().max(30, "מספר טלפון ארוך מדי").optional().nullable(),
  notes: z.string().optional().nullable(),
  defaultRate: z.number().min(0, "תעריף חייב להיות חיובי").optional().nullable(),
});

// Update client schema
export const updateClientSchema = z.object({
  id: z.string().uuid("מזהה לקוח לא תקין"),
  name: z.string().min(1, "שם הלקוח נדרש").max(100, "שם הלקוח ארוך מדי").optional(),
  email: z.string().email("כתובת אימייל לא תקינה").max(255).optional().nullable(),
  phone: z.string().max(30, "מספר טלפון ארוך מדי").optional().nullable(),
  notes: z.string().optional().nullable(),
  defaultRate: z.number().min(0, "תעריף חייב להיות חיובי").optional().nullable(),
});

// Merge clients schema
export const mergeClientsSchema = z.object({
  targetId: z.string().uuid("מזהה לקוח לא תקין"),
  sourceIds: z.array(z.string().uuid("מזהה לקוח לא תקין")).min(1, "יש לבחור לפחות לקוח אחד למיזוג"),
});

// Reorder clients schema
export const reorderClientsSchema = z.array(
  z.object({
    id: z.string().uuid("מזהה לקוח לא תקין"),
    displayOrder: z.number().int().min(0),
  })
);

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type MergeClientsInput = z.infer<typeof mergeClientsSchema>;
export type ReorderClientsInput = z.infer<typeof reorderClientsSchema>;
