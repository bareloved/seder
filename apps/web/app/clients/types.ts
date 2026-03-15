import { type Client as DBClient } from "@/db/schema";

// Re-export DB Client type for data layer
export type { DBClient as Client };

// Re-export shared client types (except ClientWithAnalytics which uses DB Client base)
export type { ClientOption, DuplicateGroup } from "@seder/shared";

// Client with analytics data — extends DB Client (Drizzle-inferred) for type accuracy
export interface ClientWithAnalytics extends DBClient {
  // Existing fields
  totalEarned: number;
  thisMonthRevenue: number;
  thisYearRevenue: number;
  averagePerJob: number;
  jobCount: number;
  thisYearJobCount: number;
  outstandingAmount: number;
  avgDaysToPayment: number | null;
  overdueInvoices: number;

  // New fields (Phase 2 — Client Intelligence)
  totalInvoiced: number;
  incomePercentage: number;
  latePaymentRate: number;
  lastGigDate: string | null;
  lastActiveMonths: number | null;
  activityTrend: "up" | "down" | "stable" | null;
  paymentHealth: "good" | "warning" | "bad";
}
