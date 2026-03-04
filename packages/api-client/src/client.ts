import ky, { type KyInstance } from "ky";

export interface ApiClientConfig {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

export function createApiClient(config: ApiClientConfig): KyInstance {
  return ky.create({
    prefixUrl: config.baseUrl,
    timeout: 15000,
    retry: 0, // Let TanStack Query handle retries
    hooks: {
      beforeRequest: [
        async (request) => {
          try {
            const token = await config.getToken();
            if (token) {
              request.headers.set("Authorization", `Bearer ${token}`);
            }
          } catch {
            // Token retrieval failed — proceed without auth header
          }
        },
      ],
    },
  });
}
