"use server";

import { db } from "@/db/client";
import { incomeEntries, categories } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import type { IncomeEntry } from "../income/types";
import { format } from "date-fns";

/**
 * Fetch all income entries within a date range for analytics
 */
export async function getAnalyticsData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<IncomeEntry[]> {
  const startDateStr = format(startDate, "yyyy-MM-dd");
  const endDateStr = format(endDate, "yyyy-MM-dd");

  const results = await db
    .select({
      id: incomeEntries.id,
      date: incomeEntries.date,
      description: incomeEntries.description,
      clientName: incomeEntries.clientName,
      amountGross: incomeEntries.amountGross,
      amountPaid: incomeEntries.amountPaid,
      vatRate: incomeEntries.vatRate,
      includesVat: incomeEntries.includesVat,
      invoiceStatus: incomeEntries.invoiceStatus,
      paymentStatus: incomeEntries.paymentStatus,
      category: incomeEntries.category,
      categoryId: incomeEntries.categoryId,
      notes: incomeEntries.notes,
      invoiceSentDate: incomeEntries.invoiceSentDate,
      paidDate: incomeEntries.paidDate,
      categoryData: categories,
    })
    .from(incomeEntries)
    .leftJoin(categories, eq(incomeEntries.categoryId, categories.id))
    .where(
      and(
        eq(incomeEntries.userId, userId),
        gte(incomeEntries.date, startDateStr),
        lte(incomeEntries.date, endDateStr)
      )
    )
    .orderBy(incomeEntries.date);

  return results.map((row) => ({
    id: row.id,
    date: row.date,
    description: row.description,
    clientName: row.clientName,
    amountGross: parseFloat(row.amountGross),
    amountPaid: parseFloat(row.amountPaid),
    vatRate: parseFloat(row.vatRate),
    includesVat: row.includesVat,
    invoiceStatus: row.invoiceStatus as "draft" | "sent" | "paid" | "cancelled",
    paymentStatus: row.paymentStatus as "unpaid" | "partial" | "paid",
    category: row.category,
    categoryId: row.categoryId,
    categoryData: row.categoryData,
    notes: row.notes,
    invoiceSentDate: row.invoiceSentDate,
    paidDate: row.paidDate,
  }));
}

