import { z } from "zod";
import { zfd } from "zod-form-data";
import { invoiceStatusValues, paymentStatusValues } from "@/db/schema";

// Basic field schemas
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)");
const amountSchema = zfd.numeric(z.number().min(0));
const optionalAmountSchema = zfd.numeric(z.number().min(0).optional().default(0));

// Create Entry Schema
export const createIncomeEntrySchema = zfd.formData({
  date: dateSchema,
  description: zfd.text(z.string().min(1, "Description is required")),
  clientName: zfd.text(z.string().min(1, "Client name is required")),
  amountGross: amountSchema,
  amountPaid: optionalAmountSchema,
  category: zfd.text(z.string().optional()),
  notes: zfd.text(z.string().optional()),
  vatRate: zfd.numeric(z.number().min(0).default(18)),
  includesVat: zfd.checkbox({ trueValue: "true" }), // "true" -> true, undefined/other -> false
  invoiceStatus: zfd.text(z.enum(invoiceStatusValues).default("draft")),
  paymentStatus: zfd.text(z.enum(paymentStatusValues).default("unpaid")),
  // Optional date fields
  invoiceSentDate: zfd.text(z.string().optional()),
  paidDate: zfd.text(z.string().optional()),
});

// Update Entry Schema
export const updateIncomeEntrySchema = zfd.formData({
  id: zfd.text(z.string().uuid()),
  date: dateSchema.optional(),
  description: zfd.text(z.string().optional()),
  clientName: zfd.text(z.string().optional()),
  amountGross: zfd.numeric(z.number().min(0).optional()),
  amountPaid: zfd.numeric(z.number().min(0).optional()),
  category: zfd.text(z.string().optional()),
  notes: zfd.text(z.string().optional()),
  vatRate: zfd.numeric(z.number().min(0).optional()),
  includesVat: zfd.checkbox({ trueValue: "true" }).optional(),
  invoiceStatus: zfd.text(z.enum(invoiceStatusValues).optional()),
  paymentStatus: zfd.text(z.enum(paymentStatusValues).optional()),
  invoiceSentDate: zfd.text(z.string().optional().nullable()),
  paidDate: zfd.text(z.string().optional().nullable()),
});

export type CreateIncomeEntrySchema = z.infer<typeof createIncomeEntrySchema>;
export type UpdateIncomeEntrySchema = z.infer<typeof updateIncomeEntrySchema>;

