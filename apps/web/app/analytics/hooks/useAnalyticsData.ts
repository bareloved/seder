"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  AnalyticsPeriod,
  IncomeAggregates,
  EnhancedMonthTrend,
  CategoryBreakdownItem,
  ClientBreakdownItem,
  AttentionResponse,
  AnalyticsSection,
} from "../types";

interface SectionState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface AnalyticsData {
  aggregates: SectionState<IncomeAggregates>;
  trends: SectionState<EnhancedMonthTrend[]>;
  categories: SectionState<CategoryBreakdownItem[]>;
  clients: SectionState<ClientBreakdownItem[]>;
  attention: SectionState<AttentionResponse>;
  isLoading: boolean;
  retrySection: (section: AnalyticsSection | "kpis" | "trends") => void;
}

function makeMonthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

async function fetchSection<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin", signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "API error");
  return json.data as T;
}

export function useAnalyticsData(
  month: number,
  year: number,
  period: AnalyticsPeriod
): AnalyticsData {
  const [aggregates, setAggregates] = useState<SectionState<IncomeAggregates>>({
    data: null,
    isLoading: true,
    error: null,
  });
  const [trends, setTrends] = useState<SectionState<EnhancedMonthTrend[]>>({
    data: null,
    isLoading: true,
    error: null,
  });
  const [categories, setCategories] = useState<SectionState<CategoryBreakdownItem[]>>({
    data: null,
    isLoading: true,
    error: null,
  });
  const [clients, setClients] = useState<SectionState<ClientBreakdownItem[]>>({
    data: null,
    isLoading: true,
    error: null,
  });
  const [attention, setAttention] = useState<SectionState<AttentionResponse>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const loadAll = useCallback(
    (m: number, y: number, p: AnalyticsPeriod) => {
      // Abort any in-flight requests
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const monthParam = makeMonthParam(y, m);
      const periodParam = p === "yearly" ? "&period=year" : "";
      const base = "/api/v1/analytics";

      // Reset all to loading
      const loading = { data: null, isLoading: true, error: null };
      setAggregates(loading);
      setTrends(loading);
      setCategories(loading);
      setClients(loading);
      setAttention(loading);

      const { signal } = controller;

      // Fetch all 5 endpoints concurrently
      fetchSection<IncomeAggregates>(`${base}/kpis?month=${monthParam}${periodParam}`, signal)
        .then((data) => {
          if (!signal.aborted) setAggregates({ data, isLoading: false, error: null });
        })
        .catch((err) => {
          if (!signal.aborted) setAggregates({ data: null, isLoading: false, error: err.message });
        });

      fetchSection<EnhancedMonthTrend[]>(`${base}/trends?month=${monthParam}${periodParam}`, signal)
        .then((data) => {
          if (!signal.aborted) setTrends({ data, isLoading: false, error: null });
        })
        .catch((err) => {
          if (!signal.aborted) setTrends({ data: null, isLoading: false, error: err.message });
        });

      fetchSection<CategoryBreakdownItem[]>(`${base}/categories?month=${monthParam}${periodParam}`, signal)
        .then((data) => {
          if (!signal.aborted) setCategories({ data, isLoading: false, error: null });
        })
        .catch((err) => {
          if (!signal.aborted) setCategories({ data: null, isLoading: false, error: err.message });
        });

      fetchSection<ClientBreakdownItem[]>(`${base}/clients?month=${monthParam}${periodParam}`, signal)
        .then((data) => {
          if (!signal.aborted) setClients({ data, isLoading: false, error: null });
        })
        .catch((err) => {
          if (!signal.aborted) setClients({ data: null, isLoading: false, error: err.message });
        });

      // Attention: only monthly
      if (p === "monthly") {
        fetchSection<AttentionResponse>(`${base}/attention?month=${monthParam}`, signal)
          .then((data) => {
            if (!signal.aborted) setAttention({ data, isLoading: false, error: null });
          })
          .catch((err) => {
            if (!signal.aborted) setAttention({ data: null, isLoading: false, error: err.message });
          });
      } else {
        setAttention({ data: null, isLoading: false, error: null });
      }
    },
    []
  );

  useEffect(() => {
    loadAll(month, year, period);
    return () => {
      abortRef.current?.abort();
    };
  }, [month, year, period, loadAll]);

  const retrySection = useCallback(
    (section: AnalyticsSection | "kpis" | "trends") => {
      const monthParam = makeMonthParam(year, month);
      const periodParam = period === "yearly" ? "&period=year" : "";
      const base = "/api/v1/analytics";
      const signal = abortRef.current?.signal;

      switch (section) {
        case "kpis":
          setAggregates((s) => ({ ...s, isLoading: true, error: null }));
          fetchSection<IncomeAggregates>(`${base}/kpis?month=${monthParam}${periodParam}`, signal)
            .then((data) => { if (!signal?.aborted) setAggregates({ data, isLoading: false, error: null }); })
            .catch((err) => { if (!signal?.aborted) setAggregates({ data: null, isLoading: false, error: err.message }); });
          break;
        case "incomeChart":
        case "trends":
          setTrends((s) => ({ ...s, isLoading: true, error: null }));
          fetchSection<EnhancedMonthTrend[]>(`${base}/trends?month=${monthParam}${periodParam}`, signal)
            .then((data) => { if (!signal?.aborted) setTrends({ data, isLoading: false, error: null }); })
            .catch((err) => { if (!signal?.aborted) setTrends({ data: null, isLoading: false, error: err.message }); });
          break;
        case "categoryBreakdown":
          setCategories((s) => ({ ...s, isLoading: true, error: null }));
          fetchSection<CategoryBreakdownItem[]>(`${base}/categories?month=${monthParam}${periodParam}`, signal)
            .then((data) => { if (!signal?.aborted) setCategories({ data, isLoading: false, error: null }); })
            .catch((err) => { if (!signal?.aborted) setCategories({ data: null, isLoading: false, error: err.message }); });
          break;
        case "clientBreakdown":
          setClients((s) => ({ ...s, isLoading: true, error: null }));
          fetchSection<ClientBreakdownItem[]>(`${base}/clients?month=${monthParam}${periodParam}`, signal)
            .then((data) => { if (!signal?.aborted) setClients({ data, isLoading: false, error: null }); })
            .catch((err) => { if (!signal?.aborted) setClients({ data: null, isLoading: false, error: err.message }); });
          break;
        case "invoiceTracking":
          if (period === "monthly") {
            setAttention((s) => ({ ...s, isLoading: true, error: null }));
            fetchSection<AttentionResponse>(`${base}/attention?month=${monthParam}`, signal)
              .then((data) => { if (!signal?.aborted) setAttention({ data, isLoading: false, error: null }); })
              .catch((err) => { if (!signal?.aborted) setAttention({ data: null, isLoading: false, error: err.message }); });
          }
          break;
        case "vatSummary":
          retrySection("kpis");
          break;
      }
    },
    [month, year, period]
  );

  const isLoading =
    aggregates.isLoading ||
    trends.isLoading ||
    categories.isLoading ||
    clients.isLoading ||
    (period === "monthly" && attention.isLoading);

  return { aggregates, trends, categories, clients, attention, isLoading, retrySection };
}
