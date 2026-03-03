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
