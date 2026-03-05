import { z } from "zod";
import { invoiceStatusValues, paymentStatusValues } from "../types/income";

// Pure Zod schemas (no FormData dependency) for API validation
export const incomeEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  description: z.string().min(1, "Description is required"),
  clientName: z.string().optional().default(""),
  clientId: z.string().uuid().optional(),
  amountGross: z.number().positive(),
  amountPaid: z.number().min(0).optional().default(0),
  vatRate: z.number().min(0).max(100).optional().default(18),
  includesVat: z.boolean().optional().default(true),
  invoiceStatus: z.enum(invoiceStatusValues).optional().default("draft"),
  paymentStatus: z.enum(paymentStatusValues).optional().default("unpaid"),
  categoryId: z.string().uuid().optional(),
  notes: z.string().optional(),
  calendarEventId: z.string().optional(),
  invoiceSentDate: z.string().optional(),
  paidDate: z.string().optional(),
});

export const createIncomeEntrySchema = incomeEntrySchema;
export const updateIncomeEntrySchema = incomeEntrySchema.partial();

export type CreateIncomeEntryInput = z.infer<typeof createIncomeEntrySchema>;
export type UpdateIncomeEntryInput = z.infer<typeof updateIncomeEntrySchema>;
