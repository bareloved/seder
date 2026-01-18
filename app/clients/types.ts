import { type Client as DBClient } from "@/db/schema";

// Re-export DB Client type
export type { DBClient as Client };

// Client with analytics data
export interface ClientWithAnalytics extends DBClient {
  totalEarned: number;
  thisMonthRevenue: number;
  thisYearRevenue: number;
  averagePerJob: number;
  jobCount: number;
  outstandingAmount: number;
  avgDaysToPayment: number | null;
  overdueInvoices: number;
}

// Client for dropdown selection (simplified)
export interface ClientOption {
  id: string;
  name: string;
  defaultRate?: number | null;
}

// Duplicate client group for merge tool
export interface DuplicateGroup {
  normalizedName: string;
  clients: Array<{
    name: string;
    count: number;
    lastUsed: string | null;
  }>;
}
