import { describe, expect, it } from "vitest";
import { dbEntryToUIEntry } from "../IncomePageClient";
import { calculateKPIs, getDisplayStatus } from "../utils";
import type { IncomeEntry as DBIncomeEntry } from "@/db/schema";
import type { IncomeEntry } from "../types";

const baseEntry = (overrides: Partial<IncomeEntry>): IncomeEntry => ({
  id: "entry-id",
  date: "2024-01-01",
  description: "Test",
  clientName: "Client",
  amountGross: 0,
  amountPaid: 0,
  vatRate: 18,
  includesVat: true,
  invoiceStatus: "draft",
  paymentStatus: "unpaid",
  calendarEventId: null,
  invoiceSentDate: null,
  paidDate: null,
  category: null,
  notes: null,
  ...overrides,
});

describe("calculateKPIs", () => {
  it("computes totals, outstanding, ready-to-invoice, and trend correctly", () => {
    const entries: IncomeEntry[] = [
      baseEntry({
        id: "1",
        date: "2024-01-05",
        amountGross: 1000,
        amountPaid: 200,
        invoiceStatus: "sent",
        paymentStatus: "partial",
        invoiceSentDate: "2024-01-01",
      }),
      baseEntry({
        id: "2",
        date: "2024-01-10",
        amountGross: 500,
        invoiceStatus: "draft",
        paymentStatus: "unpaid",
      }),
      baseEntry({
        id: "3",
        date: "2024-01-15",
        amountGross: 700,
        amountPaid: 700,
        invoiceStatus: "paid",
        paymentStatus: "paid",
        paidDate: "2024-01-20",
      }),
      baseEntry({
        id: "4",
        date: "2024-02-02",
        amountGross: 300,
        invoiceStatus: "draft",
        paymentStatus: "unpaid",
      }),
    ];

    const kpis = calculateKPIs(entries, 1, 2024, 300);

    expect(kpis.readyToInvoice).toBe(800);
    expect(kpis.readyToInvoiceCount).toBe(2);
    expect(kpis.outstanding).toBe(800);
    expect(kpis.invoicedCount).toBe(1);
    expect(kpis.overdueCount).toBe(1);
    expect(kpis.thisMonth).toBe(2200);
    expect(kpis.thisMonthCount).toBe(3);
    expect(kpis.totalPaid).toBe(700);
    expect(kpis.trend).toBeCloseTo(133.33, 0);
  });
});

describe("getDisplayStatus", () => {
  it("returns null for future draft entries", () => {
    const status = getDisplayStatus(
      baseEntry({
        date: "2099-01-01",
        invoiceStatus: "draft",
        paymentStatus: "unpaid",
      })
    );
    expect(status).toBeNull();
  });

  it("returns sent and paid statuses correctly", () => {
    const sentStatus = getDisplayStatus(
      baseEntry({
        date: "2024-01-05",
        invoiceStatus: "sent",
        paymentStatus: "unpaid",
      })
    );
    const paidStatus = getDisplayStatus(
      baseEntry({
        date: "2024-01-05",
        invoiceStatus: "paid",
        paymentStatus: "paid",
      })
    );

    expect(sentStatus).toBe("נשלחה");
    expect(paidStatus).toBe("שולם");
  });
});

describe("dbEntryToUIEntry", () => {
  it("converts DB numeric strings to numbers and preserves identifiers", () => {
    const dbEntry: DBIncomeEntry = {
      id: "db-1",
      date: "2024-01-05",
      description: "Gig",
      clientName: "Client A",
      amountGross: "1234.50",
      amountPaid: "234.00",
      vatRate: "18.00",
      includesVat: true,
      invoiceStatus: "draft",
      paymentStatus: "unpaid",
      calendarEventId: null,
      category: null,
      notes: null,
      invoiceSentDate: null,
      paidDate: null,
      createdAt: new Date("2024-01-05T00:00:00Z"),
      updatedAt: new Date("2024-01-06T00:00:00Z"),
      userId: "user-1",
    };

    const mapped = dbEntryToUIEntry(dbEntry);

    expect(mapped.id).toBe("db-1");
    expect(mapped.amountGross).toBe(1234.5);
    expect(mapped.amountPaid).toBe(234);
    expect(mapped.vatRate).toBe(18);
    expect(mapped.userId).toBeUndefined();
  });
});

