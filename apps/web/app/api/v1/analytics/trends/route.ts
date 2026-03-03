import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { getMonthPaymentStatuses } from "@/app/income/data";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const yearParam = request.nextUrl.searchParams.get("year");
    const year = yearParam ? Number(yearParam) : new Date().getFullYear();

    const statuses = await getMonthPaymentStatuses(year, userId);
    return apiSuccess(statuses);
  } catch (error) {
    return apiError(error);
  }
}
