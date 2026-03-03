import ky, { type KyInstance } from "ky";

export interface ApiClientConfig {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

export function createApiClient(config: ApiClientConfig): KyInstance {
  return ky.create({
    prefixUrl: config.baseUrl,
    hooks: {
      beforeRequest: [
        async (request) => {
          const token = await config.getToken();
          if (token) {
            request.headers.set("Authorization", `Bearer ${token}`);
          }
        },
      ],
    },
  });
}
