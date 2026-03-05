import type { KyInstance } from "ky";
import type { Client, ClientWithAnalytics, CreateClientInput } from "@seder/shared";
import type { ApiResponse } from "./types";

export function createClientsApi(client: KyInstance) {
  return {
    list: () =>
      client.get("api/v1/clients").json<ApiResponse<Client[]>>(),

    listWithAnalytics: () =>
      client.get("api/v1/clients", { searchParams: { analytics: "true" } }).json<ApiResponse<ClientWithAnalytics[]>>(),

    create: (data: CreateClientInput) =>
      client.post("api/v1/clients", { json: data }).json<ApiResponse<Client>>(),

    update: (id: string, data: Partial<CreateClientInput>) =>
      client.put(`api/v1/clients/${id}`, { json: data }).json<ApiResponse<Client>>(),

    archive: (id: string) =>
      client.put(`api/v1/clients/${id}`, { json: { action: "archive" } }).json<ApiResponse<Client>>(),

    unarchive: (id: string) =>
      client.put(`api/v1/clients/${id}`, { json: { action: "unarchive" } }).json<ApiResponse<Client>>(),
  };
}
