import type { KyInstance } from "ky";
import type { IncomeAggregates, MonthPaymentStatus } from "@seder/shared";
import type { ApiResponse } from "./types";

export function createAnalyticsApi(client: KyInstance) {
  return {
    kpis: (month: string) =>
      client.get("api/v1/analytics/kpis", { searchParams: { month } }).json<ApiResponse<IncomeAggregates>>(),

    trends: (year: number) =>
      client.get("api/v1/analytics/trends", { searchParams: { year: String(year) } }).json<ApiResponse<Record<number, MonthPaymentStatus>>>(),
  };
}
