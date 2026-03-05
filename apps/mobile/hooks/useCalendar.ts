import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../providers/ApiProvider";

export function useCalendars() {
  const api = useApi();
  return useQuery({
    queryKey: ["calendars"],
    queryFn: () => api.calendar.list(),
  });
}

export function useCalendarEvents(
  year: number,
  month: number,
  calendarIds?: string[]
) {
  const api = useApi();
  return useQuery({
    queryKey: ["calendar-events", year, month, calendarIds],
    queryFn: () => api.calendar.events(year, month, calendarIds),
  });
}

export function useCalendarImport() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      year,
      month,
      calendarIds,
    }: {
      year: number;
      month: number;
      calendarIds?: string[];
    }) => api.calendar.import(year, month, calendarIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["income"] });
    },
  });
}
