import type { IncomeEntry } from "../income/types";

export type DateRangePreset = "this-month" | "last-3-months" | "specific-year" | "custom" | "specific-month";
export type MetricType = "amount" | "count";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AnalyticsKPI {
  totalIncome: number;
  jobsCount: number;
  unpaidAmount: number;
}

export interface TimeSeriesDataPoint {
  date: string; // ISO date string or label like "Week 1"
  amount: number;
  count: number;
}

export interface CategoryDataPoint {
  categoryName: string;
  amount: number;
  count: number;
}

export interface NeedsAttentionJob {
  id: string;
  clientName: string;
  description: string;
  amount: number;
  status: string; // Hebrew status label
  date: string; // ISO date string
}

export interface AnalyticsData {
  kpi: AnalyticsKPI;
  timeSeriesData: TimeSeriesDataPoint[];
  categoryData: CategoryDataPoint[];
  needsAttentionJobs: NeedsAttentionJob[];
  entries: IncomeEntry[]; // Raw entries for filtering
}
