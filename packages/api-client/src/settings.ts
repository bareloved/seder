import type { KyInstance } from "ky";
import type { UserSettings } from "@seder/shared";
import type { ApiResponse } from "./types";

export function createSettingsApi(client: KyInstance) {
  return {
    get: () =>
      client.get("api/v1/settings").json<ApiResponse<UserSettings | null>>(),

    update: (data: Partial<UserSettings>) =>
      client.put("api/v1/settings", { json: data }).json<ApiResponse<UserSettings>>(),
  };
}
