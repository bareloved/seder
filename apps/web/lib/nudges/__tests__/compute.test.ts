import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { computeNudges } from "../compute";

const baseEntry = (overrides: Record<string, unknown> = {}) => ({
  id: "entry-1",
  date: "2026-03-01",
  description: "הופעה בחתונה",
  clientName: "דני לוי",
  amountGross: "3500.00",
  invoiceStatus: "draft" as const,
  paymentStatus: "unpaid" as const,
  invoiceSentDate: null as string | null,
  paidDate: null as string | null,
  updatedAt: new Date("2026-03-01"),
  calendarEventId: null as string | null,
  ...overrides,
});

const defaultSettings = {
  nudgeInvoiceDays: 3,
  nudgePaymentDays: 14,
};

describe("computeNudges", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-12"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns uninvoiced nudge when draft entry is older than threshold", () => {
    const entries = [baseEntry({ date: "2026-03-05" })]; // 7 days ago
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges).toHaveLength(1);
    expect(nudges[0].nudgeType).toBe("uninvoiced");
    expect(nudges[0].entryId).toBe("entry-1");
  });

  it("does NOT return uninvoiced nudge when draft is newer than threshold", () => {
    const entries = [baseEntry({ date: "2026-03-11" })]; // 1 day ago
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges).toHaveLength(0);
  });

  it("includes entry at exact threshold boundary (>= not >)", () => {
    const entries = [baseEntry({ date: "2026-03-09" })]; // exactly 3 days ago
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges).toHaveLength(1);
    expect(nudges[0].nudgeType).toBe("uninvoiced");
  });

  it("returns overdue_payment nudge when sent invoice exceeds payment threshold", () => {
    const entries = [baseEntry({
      invoiceStatus: "sent",
      invoiceSentDate: "2026-02-20", // 20 days ago
    })];
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges.some(n => n.nudgeType === "overdue_payment")).toBe(true);
  });

  it("returns way_overdue nudge when sent invoice exceeds 30 days", () => {
    const entries = [baseEntry({
      invoiceStatus: "sent",
      invoiceSentDate: "2026-02-05", // 35 days ago
    })];
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges.some(n => n.nudgeType === "way_overdue")).toBe(true);
  });

  it("uses updatedAt as fallback when invoiceSentDate is null for sent entries", () => {
    const entries = [baseEntry({
      invoiceStatus: "sent",
      invoiceSentDate: null,
      updatedAt: new Date("2026-02-20"), // 20 days ago
    })];
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges.some(n => n.nudgeType === "overdue_payment")).toBe(true);
  });

  it("returns partial_stale when partial payment has no activity for threshold days", () => {
    const entries = [baseEntry({
      invoiceStatus: "sent",
      paymentStatus: "partial",
      invoiceSentDate: "2026-02-01",
      updatedAt: new Date("2026-02-20"), // 20 days ago, no activity
    })];
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges.some(n => n.nudgeType === "partial_stale")).toBe(true);
  });

  it("excludes cancelled entries", () => {
    const entries = [baseEntry({
      invoiceStatus: "cancelled",
      date: "2026-02-01",
    })];
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges).toHaveLength(0);
  });

  it("skips fully paid entries", () => {
    const entries = [baseEntry({
      invoiceStatus: "paid",
      paymentStatus: "paid",
      date: "2026-02-01",
    })];
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges).toHaveLength(0);
  });

  it("excludes dismissed nudges", () => {
    const entries = [baseEntry({ date: "2026-03-05" })];
    const dismissed = [{
      userId: "user-1",
      entryId: "entry-1",
      nudgeType: "uninvoiced",
      periodKey: null,
      dismissedAt: new Date("2026-03-10"),
      snoozeUntil: null,
    }];
    const nudges = computeNudges(entries, dismissed, defaultSettings);
    expect(nudges).toHaveLength(0);
  });

  it("re-includes snoozed nudges after snooze period expires", () => {
    const entries = [baseEntry({ date: "2026-03-05" })];
    const dismissed = [{
      userId: "user-1",
      entryId: "entry-1",
      nudgeType: "uninvoiced",
      periodKey: null,
      dismissedAt: new Date("2026-03-08"),
      snoozeUntil: new Date("2026-03-11"), // expired yesterday
    }];
    const nudges = computeNudges(entries, dismissed, defaultSettings);
    expect(nudges).toHaveLength(1);
  });

  it("does NOT re-include snoozed nudges before snooze period expires", () => {
    const entries = [baseEntry({ date: "2026-03-05" })];
    const dismissed = [{
      userId: "user-1",
      entryId: "entry-1",
      nudgeType: "uninvoiced",
      periodKey: null,
      dismissedAt: new Date("2026-03-10"),
      snoozeUntil: new Date("2026-03-15"), // still active
    }];
    const nudges = computeNudges(entries, dismissed, defaultSettings);
    expect(nudges).toHaveLength(0);
  });

  it("returns month_end nudge in last 3 days of month with uninvoiced gigs", () => {
    vi.setSystemTime(new Date("2026-03-29")); // 3 days before month end
    const entries = [baseEntry({ date: "2026-03-10" })]; // uninvoiced
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges.some(n => n.nudgeType === "month_end")).toBe(true);
  });

  it("does NOT return month_end nudge mid-month", () => {
    vi.setSystemTime(new Date("2026-03-15"));
    const entries = [baseEntry({ date: "2026-03-10" })];
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges.every(n => n.nudgeType !== "month_end")).toBe(true);
  });

  it("sorts nudges by priority: overdue first, then uninvoiced", () => {
    const entries = [
      baseEntry({ id: "e1", date: "2026-03-05", invoiceStatus: "draft" }),
      baseEntry({
        id: "e2",
        invoiceStatus: "sent",
        invoiceSentDate: "2026-02-20",
      }),
    ];
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges[0].nudgeType).toBe("overdue_payment");
    expect(nudges[1].nudgeType).toBe("uninvoiced");
  });

  it("generates both way_overdue and partial_stale for same entry when applicable", () => {
    const entries = [baseEntry({
      invoiceStatus: "sent",
      paymentStatus: "partial",
      invoiceSentDate: "2026-02-01", // 39 days ago
      updatedAt: new Date("2026-02-20"), // 20 days no activity
    })];
    const nudges = computeNudges(entries, [], defaultSettings);
    const types = nudges.map(n => n.nudgeType);
    expect(types).toContain("way_overdue");
    expect(types).toContain("partial_stale");
  });

  it("returns empty array for empty entries", () => {
    const nudges = computeNudges([], [], defaultSettings);
    expect(nudges).toHaveLength(0);
  });

  it("generates batch_invoice nudge on Friday with 2+ uninvoiced gigs", () => {
    vi.setSystemTime(new Date("2026-03-13")); // Friday
    const entries = [
      baseEntry({ id: "e1", date: "2026-03-05" }),
      baseEntry({ id: "e2", date: "2026-03-06" }),
    ];
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges.some(n => n.nudgeType === "batch_invoice")).toBe(true);
  });

  it("does NOT generate batch_invoice on Wednesday", () => {
    vi.setSystemTime(new Date("2026-03-11")); // Wednesday
    const entries = [
      baseEntry({ id: "e1", date: "2026-03-05" }),
      baseEntry({ id: "e2", date: "2026-03-06" }),
    ];
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges.every(n => n.nudgeType !== "batch_invoice")).toBe(true);
  });
});
