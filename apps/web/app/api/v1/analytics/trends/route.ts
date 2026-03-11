import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { getEnhancedTrends } from "@/app/income/data";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const monthParam = request.nextUrl.searchParams.get("month");
    const countParam = request.nextUrl.searchParams.get("count");

    let endYear: number;
    let endMonth: number;

    if (monthParam) {
      const parts = monthParam.split("-").map(Number);
      endYear = parts[0];
      endMonth = parts[1];
    } else {
      const now = new Date();
      endYear = now.getFullYear();
      endMonth = now.getMonth() + 1;
    }

    const count = countParam ? Number(countParam) : 6;

    const trends = await getEnhancedTrends({
      endMonth,
      endYear,
      count,
      userId,
    });
    return apiSuccess(trends);
  } catch (error) {
    return apiError(error);
  }
}
