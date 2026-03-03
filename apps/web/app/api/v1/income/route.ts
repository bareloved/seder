import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { ValidationError } from "../_lib/errors";
import {
  getIncomeEntriesForMonth,
  createIncomeEntry,
} from "@/app/income/data";
import { createIncomeEntrySchema } from "@seder/shared";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = request.nextUrl;
    const month = searchParams.get("month"); // "2026-03" format

    let year: number;
    let m: number;

    if (month) {
      const parts = month.split("-").map(Number);
      year = parts[0];
      m = parts[1];
      if (!year || !m || m < 1 || m > 12) {
        throw new ValidationError("Invalid month format. Use YYYY-MM.");
      }
    } else {
      const now = new Date();
      year = now.getFullYear();
      m = now.getMonth() + 1;
    }

    const entries = await getIncomeEntriesForMonth({ year, month: m, userId });
    return apiSuccess(entries);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = createIncomeEntrySchema.parse(body);
    const entry = await createIncomeEntry({
      ...parsed,
      clientName: parsed.clientName ?? "",
      userId,
    });
    return apiSuccess(entry, 201);
  } catch (error) {
    return apiError(error);
  }
}
