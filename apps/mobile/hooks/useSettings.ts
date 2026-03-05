import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../providers/ApiProvider";

export function useSettings() {
  const api = useApi();
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api.settings.get(),
  });
}

export function useSettingsMutation() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.settings.update,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}
