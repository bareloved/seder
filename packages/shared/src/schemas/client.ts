import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().min(1, "שם הלקוח נדרש").max(100, "שם הלקוח ארוך מדי"),
  email: z.string().email("כתובת אימייל לא תקינה").max(255).optional().nullable(),
  phone: z.string().max(30, "מספר טלפון ארוך מדי").optional().nullable(),
  notes: z.string().optional().nullable(),
  defaultRate: z.number().min(0, "תעריף חייב להיות חיובי").optional().nullable(),
});

export const updateClientSchema = z.object({
  id: z.string().uuid("מזהה לקוח לא תקין"),
  name: z.string().min(1, "שם הלקוח נדרש").max(100, "שם הלקוח ארוך מדי").optional(),
  email: z.string().email("כתובת אימייל לא תקינה").max(255).optional().nullable(),
  phone: z.string().max(30, "מספר טלפון ארוך מדי").optional().nullable(),
  notes: z.string().optional().nullable(),
  defaultRate: z.number().min(0, "תעריף חייב להיות חיובי").optional().nullable(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
