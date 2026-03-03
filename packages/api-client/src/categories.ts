import type { KyInstance } from "ky";
import type { Category, CreateCategoryInput, UpdateCategoryInput, ReorderCategoriesInput } from "@seder/shared";
import type { ApiResponse } from "./types";

export function createCategoriesApi(client: KyInstance) {
  return {
    list: () =>
      client.get("api/v1/categories").json<ApiResponse<Category[]>>(),

    create: (data: CreateCategoryInput) =>
      client.post("api/v1/categories", { json: data }).json<ApiResponse<Category>>(),

    update: (id: string, data: Partial<UpdateCategoryInput>) =>
      client.put(`api/v1/categories/${id}`, { json: data }).json<ApiResponse<Category>>(),

    archive: (id: string) =>
      client.put(`api/v1/categories/${id}`, { json: { action: "archive" } }).json<ApiResponse<Category>>(),

    unarchive: (id: string) =>
      client.put(`api/v1/categories/${id}`, { json: { action: "unarchive" } }).json<ApiResponse<Category>>(),

    reorder: (reorders: ReorderCategoriesInput) =>
      client.post("api/v1/categories/reorder", { json: reorders }).json<ApiResponse<{ reordered: true }>>(),
  };
}
