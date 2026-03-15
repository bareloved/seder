// Client — platform-agnostic representation
export interface Client {
  id: string;
  userId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  defaultRate?: number | string | null; // DB returns string for numeric columns
  isArchived: boolean;
  displayOrder?: number | string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Client with analytics data
export interface ClientWithAnalytics extends Client {
  // Existing fields (do NOT rename — iOS depends on these)
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
