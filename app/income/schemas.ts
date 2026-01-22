import { z } from "zod";
import { zfd } from "zod-form-data";
import { invoiceStatusValues, paymentStatusValues } from "@/db/schema";

// Basic field schemas
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)");
const amountSchema = zfd.numeric(z.number().min(0));
// UUID that allows empty string (converts to undefined) - used for create schema
const optionalUuidSchema = z.string().transform((val) => val === "" ? undefined : val).pipe(z.string().uuid().optional());
// Simpler UUID schema for update - just transform empty to undefined without strict validation
const updateUuidSchema = z.string().transform((val) => val === "" ? undefined : val);
// Create Entry Schema
export const createIncomeEntrySchema = zfd.formData({
  date: dateSchema,
  description: zfd.text(z.string().min(1, "Description is required")),
  clientName: zfd.text(z.string().optional().default("")), // Allow empty/missing client name
  clientId: zfd.text(optionalUuidSchema).optional(), // FK to clients table (empty string → undefined)
  amountGross: amountSchema,
  amountPaid: zfd.numeric(z.number().min(0).optional().default(0)),
  category: zfd.text(z.string().optional()).optional(),
  categoryId: zfd.text(optionalUuidSchema).optional(), // FK to categories table (empty string → undefined)
  notes: zfd.text(z.string().optional()),
  vatRate: zfd.numeric(z.number().min(0).default(18)),
  // Handle boolean string "true"/"false" or checkbox value
  includesVat: zfd.text(z.string().transform((val) => val === "true")),
  invoiceStatus: zfd.text(z.enum(invoiceStatusValues).optional().default("draft")),
  paymentStatus: zfd.text(z.enum(paymentStatusValues).optional().default("unpaid")),
  // Optional date fields
  invoiceSentDate: zfd.text(z.string().optional()),
  paidDate: zfd.text(z.string().optional()),
});

// Update Entry Schema
// For partial updates (inline editing), fields may be completely missing from FormData
// Using z.union to accept both string and undefined at the zod level
const optionalText = z.union([z.string(), z.undefined()]);
const optionalNumber = z.union([z.number().min(0), z.undefined()]);

export const updateIncomeEntrySchema = zfd.formData({
  id: zfd.text(z.string().uuid()),
  date: zfd.text(optionalText).optional(),
  description: zfd.text(optionalText).optional(),
  clientName: zfd.text(optionalText).optional(),
  clientId: zfd.text(optionalText.transform((val) => val === "" ? undefined : val)).optional(),
  amountGross: zfd.numeric(optionalNumber).optional(),
  amountPaid: zfd.numeric(optionalNumber).optional(),
  category: zfd.text(optionalText).optional(),
  categoryId: zfd.text(optionalText.transform((val) => val === "" ? undefined : val)).optional(),
  notes: zfd.text(optionalText).optional(),
  vatRate: zfd.numeric(optionalNumber).optional(),
  includesVat: zfd.text(optionalText.transform((val) => val === "true")).optional(),
  invoiceStatus: zfd.text(z.union([z.enum(invoiceStatusValues), z.undefined()])).optional(),
  paymentStatus: zfd.text(z.union([z.enum(paymentStatusValues), z.undefined()])).optional(),
  invoiceSentDate: zfd.text(optionalText).optional(),
  paidDate: zfd.text(optionalText).optional(),
});

export type CreateIncomeEntrySchema = z.infer<typeof createIncomeEntrySchema>;
export type UpdateIncomeEntrySchema = z.infer<typeof updateIncomeEntrySchema>;

