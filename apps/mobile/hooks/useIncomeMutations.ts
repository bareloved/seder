import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../providers/ApiProvider";

export function useIncomeMutations() {
  const api = useApi();
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["income"] });

  const create = useMutation({
    mutationFn: api.income.create,
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.income.update(id, data),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: api.income.delete,
    onSuccess: invalidate,
  });

  const markPaid = useMutation({
    mutationFn: api.income.markPaid,
    onSuccess: invalidate,
  });

  const markSent = useMutation({
    mutationFn: api.income.markSent,
    onSuccess: invalidate,
  });

  return { create, update, remove, markPaid, markSent };
}
