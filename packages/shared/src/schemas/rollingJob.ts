// packages/shared/src/schemas/rollingJob.ts
import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין");

const weekdayIndex = z.number().int().min(0).max(6);

const cadenceDailySchema = z.object({
  kind: z.literal("daily"),
  interval: z.number().int().min(1).max(365),
});

const cadenceWeeklySchema = z.object({
  kind: z.literal("weekly"),
  interval: z.number().int().min(1).max(52),
  weekdays: z
    .array(weekdayIndex)
    .min(1, "יש לבחור לפחות יום אחד בשבוע")
    .transform((arr) => Array.from(new Set(arr)).sort((a, b) => a - b)),
});

const cadenceMonthlySchema = z.object({
  kind: z.literal("monthly"),
  interval: z.number().int().min(1).max(12),
  dayOfMonth: z.number().int().min(1).max(31),
});

export const cadenceSchema = z.discriminatedUnion("kind", [
  cadenceDailySchema,
  cadenceWeeklySchema,
  cadenceMonthlySchema,
]);

export const createRollingJobSchema = z
  .object({
    title: z.string().min(1, "שם נדרש").max(100),
    description: z.string().min(1, "תיאור נדרש").max(500),
    clientId: z.string().uuid().optional().nullable(),
    clientName: z.string().min(1).max(100),
    categoryId: z.string().uuid().optional().nullable(),
    amountGross: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "סכום לא תקין"),
    vatRate: z.string().regex(/^\d+(\.\d{1,2})?$/).default("18"),
    includesVat: z.boolean().default(true),
    cadence: cadenceSchema,
    startDate: dateString,
    endDate: dateString.optional().nullable(),
    sourceCalendarRecurringEventId: z.string().max(255).optional().nullable(),
    sourceCalendarId: z.string().max(255).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine(
    (v) => !v.endDate || v.endDate >= v.startDate,
    { message: "תאריך סיום חייב להיות אחרי תאריך התחלה", path: ["endDate"] },
  );

// sourceCalendarRecurringEventId and sourceCalendarId are immutable — omitted from updates.
export const updateRollingJobSchema = z
  .object({
    title: z.string().min(1, "שם נדרש").max(100).optional(),
    description: z.string().min(1, "תיאור נדרש").max(500).optional(),
    clientId: z.string().uuid().optional().nullable(),
    clientName: z.string().min(1).max(100).optional(),
    categoryId: z.string().uuid().optional().nullable(),
    amountGross: z.string().regex(/^\d+(\.\d{1,2})?$/, "סכום לא תקין").optional(),
    vatRate: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    includesVat: z.boolean().optional(),
    cadence: cadenceSchema.optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  });

export const deleteRollingJobSchema = z.object({
  deleteFutureDrafts: z.boolean().default(false),
});

export type CreateRollingJobSchemaInput = z.infer<typeof createRollingJobSchema>;
export type UpdateRollingJobSchemaInput = z.infer<typeof updateRollingJobSchema>;
