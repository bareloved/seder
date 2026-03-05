import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../providers/ApiProvider";

export function useCategories() {
  const api = useApi();
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => api.categories.list(),
  });
}

export function useCategoryMutations() {
  const api = useApi();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["categories"] });

  const create = useMutation({
    mutationFn: api.categories.create,
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.categories.update(id, data),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: api.categories.archive,
    onSuccess: invalidate,
  });

  return { create, update, archive };
}
