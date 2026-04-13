// packages/shared/src/types/rollingJob.ts

export type CadenceDaily = {
  kind: "daily";
  interval: number; // >= 1
};

export type CadenceWeekly = {
  kind: "weekly";
  interval: number; // >= 1, in weeks
  weekdays: number[]; // 0=Sun..6=Sat, non-empty, deduped
};

export type CadenceMonthly = {
  kind: "monthly";
  interval: number; // >= 1, in months
  dayOfMonth: number; // 1..31 (clamped to end-of-month at materialization time)
};

export type Cadence = CadenceDaily | CadenceWeekly | CadenceMonthly;

export interface RollingJob {
  id: string;
  userId: string;
  isActive: boolean;
  title: string;
  description: string;
  clientId: string | null;
  clientName: string;
  categoryId: string | null;
  amountGross: string; // numeric serialized as string, matches incomeEntries
  vatRate: string;
  includesVat: boolean;
  defaultInvoiceStatus: "draft" | "sent" | "paid" | "cancelled";
  cadence: Cadence;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  sourceCalendarRecurringEventId: string | null;
  sourceCalendarId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRollingJobInput {
  title: string;
  description: string;
  clientId?: string | null;
  clientName: string;
  categoryId?: string | null;
  amountGross: string;
  vatRate?: string;
  includesVat?: boolean;
  cadence: Cadence;
  startDate: string;
  endDate?: string | null;
  sourceCalendarRecurringEventId?: string | null;
  sourceCalendarId?: string | null;
  notes?: string | null;
}

export interface UpdateRollingJobInput {
  title?: string;
  description?: string;
  clientId?: string | null;
  clientName?: string;
  categoryId?: string | null;
  amountGross?: string;
  vatRate?: string;
  includesVat?: boolean;
  cadence?: Cadence;
  startDate?: string;
  endDate?: string | null;
  notes?: string | null;
}
