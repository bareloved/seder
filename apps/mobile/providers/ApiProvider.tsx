import { createContext, useContext, useMemo } from "react";
import {
  createApiClient,
  createIncomeApi,
  createCategoriesApi,
  createClientsApi,
  createAnalyticsApi,
  createCalendarApi,
  createSettingsApi,
  createDevicesApi,
} from "@seder/api-client";
import { getAuthToken } from "../lib/auth-storage";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

function createApis() {
  const client = createApiClient({
    baseUrl: API_BASE_URL,
    getToken: getAuthToken,
  });
  return {
    income: createIncomeApi(client),
    categories: createCategoriesApi(client),
    clients: createClientsApi(client),
    analytics: createAnalyticsApi(client),
    calendar: createCalendarApi(client),
    settings: createSettingsApi(client),
    devices: createDevicesApi(client),
  };
}

type ApiContextType = ReturnType<typeof createApis>;

const ApiContext = createContext<ApiContextType | null>(null);

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const apis = useMemo(createApis, []);
  return <ApiContext.Provider value={apis}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used within ApiProvider");
  return ctx;
}
