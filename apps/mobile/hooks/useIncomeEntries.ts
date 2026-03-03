import { useQuery } from "@tanstack/react-query";
import { useApi } from "../providers/ApiProvider";

export function useIncomeEntries(month: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["income", month],
    queryFn: () => api.income.list(month),
  });
}

export function useIncomeKPIs(month: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["income-kpis", month],
    queryFn: () => api.analytics.kpis(month),
  });
}
