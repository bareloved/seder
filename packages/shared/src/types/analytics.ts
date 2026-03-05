// Income aggregates for KPI calculations
export interface IncomeAggregates {
  totalGross: number;
  totalPaid: number;
  totalUnpaid: number;
  vatTotal: number;
  jobsCount: number;
  outstanding: number;
  readyToInvoice: number;
  readyToInvoiceCount: number;
  invoicedCount: number;
  overdueCount: number;
  previousMonthPaid: number;
  trend: number;
}

// Month-level payment status for trends
export type MonthPaymentStatus = "all-paid" | "has-unpaid" | "empty";
