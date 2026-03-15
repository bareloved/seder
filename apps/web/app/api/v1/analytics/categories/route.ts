import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { getCategoryBreakdown, getCategoryBreakdownYearly } from "@/app/income/data";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const monthParam = request.nextUrl.searchParams.get("month");
    const period = request.nextUrl.searchParams.get("period");

    let year: number;
    let month: number;

    if (monthParam) {
      const parts = monthParam.split("-").map(Number);
      year = parts[0];
      month = parts[1];
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    if (period === "year") {
      const breakdown = await getCategoryBreakdownYearly({ year, userId });
      return apiSuccess(breakdown);
    }

    const breakdown = await getCategoryBreakdown({ year, month, userId });
    return apiSuccess(breakdown);
  } catch (error) {
    return apiError(error);
  }
}
