import { useQuery } from "@tanstack/react-query";
import { useApi } from "../providers/ApiProvider";

export function useAnalyticsKPIs(month: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["analytics-kpis", month],
    queryFn: () => api.analytics.kpis(month),
  });
}

export function useAnalyticsTrends(year: number) {
  const api = useApi();
  return useQuery({
    queryKey: ["analytics-trends", year],
    queryFn: () => api.analytics.trends(year),
  });
}
