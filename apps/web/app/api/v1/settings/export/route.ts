import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { withUser } from "@/db/client";
import { incomeEntries, categories } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const {
      includeIncomeEntries = true,
      includeCategories = true,
      dateRange = "all",
      customStartDate,
      customEndDate,
    } = body;

    const { entries, userCategories } = await withUser(userId, async (tx) => {
      let entriesResult: Array<typeof incomeEntries.$inferSelect> = [];
      let categoriesResult: Array<typeof categories.$inferSelect> = [];

      // Fetch income entries
      if (includeIncomeEntries) {
        const dateConditions = [eq(incomeEntries.userId, userId)];

        if (dateRange === "thisYear") {
          const startOfYear = new Date(new Date().getFullYear(), 0, 1)
            .toISOString()
            .split("T")[0];
          dateConditions.push(gte(incomeEntries.date, startOfYear));
        } else if (dateRange === "thisMonth") {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split("T")[0];
          dateConditions.push(gte(incomeEntries.date, startOfMonth));
        } else if (
          dateRange === "custom" &&
          customStartDate &&
          customEndDate
        ) {
          dateConditions.push(gte(incomeEntries.date, customStartDate));
          dateConditions.push(lte(incomeEntries.date, customEndDate));
        }

        entriesResult = await tx
          .select()
          .from(incomeEntries)
          .where(and(...dateConditions));
      }

      // Fetch categories
      if (includeCategories) {
        categoriesResult = await tx
          .select()
          .from(categories)
          .where(eq(categories.userId, userId));
      }

      return { entries: entriesResult, userCategories: categoriesResult };
    });

    const csvParts: string[] = [];

    // Export income entries
    if (includeIncomeEntries && entries.length > 0) {
      const incomeHeaders = [
        "\u05EA\u05D0\u05E8\u05D9\u05DA",
        "\u05EA\u05D9\u05D0\u05D5\u05E8",
        "\u05DC\u05E7\u05D5\u05D7",
        "\u05E1\u05DB\u05D5\u05DD \u05D1\u05E8\u05D5\u05D8\u05D5",
        "\u05E1\u05DB\u05D5\u05DD \u05E9\u05E9\u05D5\u05DC\u05DD",
        "\u05D0\u05D7\u05D5\u05D6 \u05DE\u05E2\u05DE",
        "\u05DB\u05D5\u05DC\u05DC \u05DE\u05E2\u05DE",
        "\u05E1\u05D8\u05D8\u05D5\u05E1 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA",
        "\u05E1\u05D8\u05D8\u05D5\u05E1 \u05EA\u05E9\u05DC\u05D5\u05DD",
        "\u05D4\u05E2\u05E8\u05D5\u05EA",
      ];
      const incomeRows = entries.map((e) => [
        e.date,
        `"${e.description.replace(/"/g, '""')}"`,
        `"${e.clientName.replace(/"/g, '""')}"`,
        e.amountGross,
        e.amountPaid,
        e.vatRate,
        e.includesVat ? "\u05DB\u05DF" : "\u05DC\u05D0",
        e.invoiceStatus,
        e.paymentStatus,
        `"${(e.notes || "").replace(/"/g, '""')}"`,
      ]);

      csvParts.push("# \u05D4\u05DB\u05E0\u05E1\u05D5\u05EA");
      csvParts.push(incomeHeaders.join(","));
      csvParts.push(...incomeRows.map((r) => r.join(",")));
    }

    // Export categories
    if (includeCategories && userCategories.length > 0) {
      if (csvParts.length > 0) csvParts.push(""); // Empty line separator

      const categoryHeaders = [
        "\u05E9\u05DD",
        "\u05E6\u05D1\u05E2",
        "\u05D0\u05D9\u05D9\u05E7\u05D5\u05DF",
        "\u05DE\u05D0\u05D5\u05E8\u05DB\u05D1",
      ];
      const categoryRows = userCategories.map((c) => [
        `"${c.name.replace(/"/g, '""')}"`,
        c.color,
        c.icon,
        c.isArchived ? "\u05DB\u05DF" : "\u05DC\u05D0",
      ]);

      csvParts.push("# \u05E7\u05D8\u05D2\u05D5\u05E8\u05D9\u05D5\u05EA");
      csvParts.push(categoryHeaders.join(","));
      csvParts.push(...categoryRows.map((r) => r.join(",")));
    }

    if (csvParts.length === 0) {
      return apiSuccess({ csv: null, message: "\u05D0\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DC\u05D9\u05D9\u05E6\u05D5\u05D0" });
    }

    // Add BOM for Excel Hebrew support
    const bom = "\uFEFF";
    const csvContent = bom + csvParts.join("\n");

    return apiSuccess({ csv: csvContent });
  } catch (error) {
    return apiError(error);
  }
}
