import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { getIncomeAggregatesForMonth } from "@/app/income/data";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const month = request.nextUrl.searchParams.get("month");

    let year: number;
    let m: number;

    if (month) {
      const parts = month.split("-").map(Number);
      year = parts[0];
      m = parts[1];
    } else {
      const now = new Date();
      year = now.getFullYear();
      m = now.getMonth() + 1;
    }

    const kpis = await getIncomeAggregatesForMonth({ year, month: m, userId });
    return apiSuccess(kpis);
  } catch (error) {
    return apiError(error);
  }
}
