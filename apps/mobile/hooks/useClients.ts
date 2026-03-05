import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../providers/ApiProvider";

export function useClients() {
  const api = useApi();
  return useQuery({
    queryKey: ["clients"],
    queryFn: () => api.clients.list(),
  });
}

export function useClientsWithAnalytics() {
  const api = useApi();
  return useQuery({
    queryKey: ["clients-analytics"],
    queryFn: () => api.clients.listWithAnalytics(),
  });
}

export function useClientMutations() {
  const api = useApi();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["clients"] });

  const create = useMutation({
    mutationFn: api.clients.create,
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.clients.update(id, data),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: api.clients.archive,
    onSuccess: invalidate,
  });

  return { create, update, archive };
}
