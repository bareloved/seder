import type { KyInstance } from "ky";
import type { ApiResponse } from "./types";

export function createDevicesApi(client: KyInstance) {
  return {
    register: (data: { token: string; platform: "ios" | "android" }) =>
      client.post("api/v1/devices", { json: data }).json<ApiResponse<{ registered: true }>>(),

    unregister: (token: string) =>
      client.delete(`api/v1/devices/${token}`).json<ApiResponse<{ unregistered: true }>>(),
  };
}
