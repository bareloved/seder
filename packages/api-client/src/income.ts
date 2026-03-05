import type { KyInstance } from "ky";
import type { IncomeEntry, CreateIncomeEntryInput, UpdateIncomeEntryInput } from "@seder/shared";
import type { ApiResponse } from "./types";

export function createIncomeApi(client: KyInstance) {
  return {
    list: (month: string) =>
      client.get("api/v1/income", { searchParams: { month } }).json<ApiResponse<IncomeEntry[]>>(),

    get: (id: string) =>
      client.get(`api/v1/income/${id}`).json<ApiResponse<IncomeEntry>>(),

    create: (data: CreateIncomeEntryInput) =>
      client.post("api/v1/income", { json: data }).json<ApiResponse<IncomeEntry>>(),

    update: (id: string, data: UpdateIncomeEntryInput) =>
      client.put(`api/v1/income/${id}`, { json: data }).json<ApiResponse<IncomeEntry>>(),

    delete: (id: string) =>
      client.delete(`api/v1/income/${id}`).json<ApiResponse<{ deleted: true }>>(),

    markPaid: (id: string) =>
      client.post(`api/v1/income/${id}/mark-paid`).json<ApiResponse<IncomeEntry>>(),

    markSent: (id: string) =>
      client.post(`api/v1/income/${id}/mark-sent`).json<ApiResponse<IncomeEntry>>(),

    batch: (action: "update" | "delete", ids: string[], updates?: Record<string, unknown>) =>
      client.post("api/v1/income/batch", { json: { action, ids, updates } }).json<ApiResponse<unknown>>(),
  };
}
