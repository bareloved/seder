"use server";

import { db } from "@/db/client";
import { incomeEntries } from "@/db/schema";
import { revalidatePath } from "next/cache";
import type { ColumnMapping, ImportResult, ParsedRow } from "./types";
import { 
  buildDateFromRow, 
  parseAmount, 
  parsePaymentStatus, 
  parseInvoiceStatus,
  parseDate 
} from "./utils";

interface ImportEntry {
  date: string;
  description: string;
  clientName: string;
  amountGross: number;
  amountPaid: number;
  category: string | null;
  notes: string | null;
  invoiceStatus: "draft" | "sent" | "paid" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  invoiceSentDate: string | null;
  paidDate: string | null;
}

/**
 * Bulk import income entries from parsed file data
 */
export async function bulkImportEntries(
  rows: ParsedRow[],
  mapping: ColumnMapping,
  markHistoricalAsPaid: boolean = false
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [],
  };

  const entriesToInsert: ImportEntry[] = [];
  const today = new Date().toISOString().split("T")[0];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    try {
      // Parse date (supports both split Year/Month/Day and single date column)
      const parsedDate = buildDateFromRow(row, mapping);
      if (!parsedDate) {
        result.errors.push(`שורה ${i + 1}: תאריך לא תקין`);
        result.skipped++;
        continue;
      }

      // Parse description
      const description = mapping.description 
        ? String(row[mapping.description] || "").trim() 
        : "";
      if (!description) {
        result.errors.push(`שורה ${i + 1}: חסר תיאור`);
        result.skipped++;
        continue;
      }

      // Parse client name - allow empty, use "לא צוין" as default
      let clientName = mapping.clientName 
        ? String(row[mapping.clientName] || "").trim() 
        : "";
      if (!clientName) {
        clientName = "לא צוין";
      }

      // Parse amount
      const amountValue = mapping.amountGross ? row[mapping.amountGross] : null;
      const amountGross = parseAmount(amountValue as string);
      if (amountGross === null || amountGross < 0) {
        result.errors.push(`שורה ${i + 1}: סכום לא תקין - "${amountValue}"`);
        result.skipped++;
        continue;
      }

      // Parse optional fields
      const amountPaidValue = mapping.amountPaid ? row[mapping.amountPaid] : null;
      let amountPaid = parseAmount(amountPaidValue as string) ?? 0;

      const category = mapping.category 
        ? String(row[mapping.category] || "").trim() || null
        : null;
      
      const notes = mapping.notes 
        ? String(row[mapping.notes] || "").trim() || null
        : null;

      // Parse statuses from separate columns
      const paymentStatusValue = mapping.paymentStatus 
        ? row[mapping.paymentStatus] 
        : null;
      const invoiceStatusValue = mapping.invoiceStatus 
        ? row[mapping.invoiceStatus] 
        : null;
      
      let paymentStatus = parsePaymentStatus(paymentStatusValue as string);
      let invoiceStatus = parseInvoiceStatus(invoiceStatusValue as string);

      // If payment status is "paid", sync invoice status and amount
      if (paymentStatus === "paid") {
        invoiceStatus = "paid";
        amountPaid = amountGross;
      }

      // Handle historical data - mark old entries as paid if requested
      if (markHistoricalAsPaid && parsedDate < today) {
        invoiceStatus = "paid";
        paymentStatus = "paid";
        amountPaid = amountGross;
      }

      // Parse dates
      const invoiceSentDateValue = mapping.invoiceSentDate 
        ? row[mapping.invoiceSentDate] 
        : null;
      const invoiceSentDate = parseDate(invoiceSentDateValue as string);

      const paidDateValue = mapping.paidDate ? row[mapping.paidDate] : null;
      let paidDate = parseDate(paidDateValue as string);

      // Set paid date for paid entries if not provided
      if (paymentStatus === "paid" && !paidDate) {
        paidDate = parsedDate;
      }

      entriesToInsert.push({
        date: parsedDate,
        description,
        clientName,
        amountGross,
        amountPaid,
        category,
        notes,
        invoiceStatus,
        paymentStatus,
        invoiceSentDate,
        paidDate,
      });

    } catch (error) {
      result.errors.push(`שורה ${i + 1}: שגיאה - ${error instanceof Error ? error.message : "Unknown"}`);
      result.skipped++;
    }
  }

  if (entriesToInsert.length === 0) {
    result.success = false;
    result.errors.push("אין רשומות תקינות לייבוא");
    return result;
  }

  // Batch insert in chunks of 100
  const BATCH_SIZE = 100;
  try {
    for (let i = 0; i < entriesToInsert.length; i += BATCH_SIZE) {
      const batch = entriesToInsert.slice(i, i + BATCH_SIZE);
      
      await db.insert(incomeEntries).values(
        batch.map((entry) => ({
          date: entry.date,
          description: entry.description,
          clientName: entry.clientName,
          amountGross: entry.amountGross.toFixed(2),
          amountPaid: entry.amountPaid.toFixed(2),
          vatRate: "17.00", // Default VAT
          includesVat: true,
          invoiceStatus: entry.invoiceStatus,
          paymentStatus: entry.paymentStatus,
          category: entry.category,
          notes: entry.notes,
          invoiceSentDate: entry.invoiceSentDate,
          paidDate: entry.paidDate,
        }))
      );

      result.imported += batch.length;
    }

    revalidatePath("/income");
    
  } catch (error) {
    result.success = false;
    result.errors.push(`שגיאה בשמירה למסד הנתונים: ${error instanceof Error ? error.message : "Unknown"}`);
  }

  return result;
}
