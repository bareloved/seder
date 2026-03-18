import type { IncomeAggregates } from "../income/data";

export type { IncomeAggregates };

export type AnalyticsPeriod = "monthly" | "yearly";

export interface EnhancedMonthTrend {
  month: number;
  year: number;
  status: "all-paid" | "has-unpaid" | "empty";
  totalGross: number;
  totalPaid: number;
  jobsCount: number;
}

export interface CategoryBreakdownItem {
  categoryId: string | null;
  categoryName: string;
  categoryColor: string;
  amount: number;
  count: number;
  percentage: number;
  monthlyAmounts?: number[];
}

export interface ClientBreakdownItem {
  clientName: string;
  amount: number;
  count: number;
  percentage: number;
  monthlyAmounts?: number[];
}

export interface AttentionBucket {
  count: number;
  amount: number;
}

export interface AttentionSummary {
  drafts: AttentionBucket;
  sent: AttentionBucket;
  overdue: AttentionBucket;
}

export interface AttentionItem {
  id: string;
  clientName: string;
  description: string;
  date: string;
  amountGross: number;
  status: "draft" | "sent" | "overdue";
  invoiceStatus: string;
  paymentStatus: string;
}

export interface AttentionResponse {
  summary: AttentionSummary;
  items: AttentionItem[];
}

export type AnalyticsSection =
  | "incomeChart"
  | "invoiceTracking"
  | "categoryBreakdown"
  | "clientBreakdown"
  | "vatSummary";
