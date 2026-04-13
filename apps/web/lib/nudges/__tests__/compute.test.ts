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
  rollingJobId: null as string | null,
  detachedFromTemplate: false,
  ...overrides,
});

describe("computeNudges", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("overdue", () => {
    it("returns overdue nudge when sent invoice is 30+ days old", () => {
      vi.setSystemTime(new Date("2026-04-05"));
      const entries = [baseEntry({
        invoiceStatus: "sent",
        invoiceSentDate: "2026-03-01",
      })];
      const nudges = computeNudges(entries, []);
      expect(nudges).toHaveLength(1);
      expect(nudges[0].nudgeType).toBe("overdue");
      expect(nudges[0].description).toContain("דני לוי");
      expect(nudges[0].description).toContain("הופעה בחתונה");
      expect(nudges[0].description).toContain("₪3,500");
    });

    it("does NOT return overdue nudge before 30 days", () => {
      vi.setSystemTime(new Date("2026-03-20"));
      const entries = [baseEntry({
        invoiceStatus: "sent",
        invoiceSentDate: "2026-03-01",
      })];
      const nudges = computeNudges(entries, []);
      expect(nudges).toHaveLength(0);
    });

    it("returns overdue at exact 30-day boundary", () => {
      vi.setSystemTime(new Date("2026-03-31"));
      const entries = [baseEntry({
        invoiceStatus: "sent",
        invoiceSentDate: "2026-03-01",
      })];
      const nudges = computeNudges(entries, []);
      expect(nudges).toHaveLength(1);
      expect(nudges[0].nudgeType).toBe("overdue");
    });

    it("uses updatedAt as fallback when invoiceSentDate is null", () => {
      vi.setSystemTime(new Date("2026-04-05"));
      const entries = [baseEntry({
        invoiceStatus: "sent",
        invoiceSentDate: null,
        updatedAt: new Date("2026-03-01"),
      })];
      const nudges = computeNudges(entries, []);
      expect(nudges).toHaveLength(1);
      expect(nudges[0].nudgeType).toBe("overdue");
    });

    it("skips paid entries", () => {
      vi.setSystemTime(new Date("2026-04-05"));
      const entries = [baseEntry({
        invoiceStatus: "sent",
        paymentStatus: "paid",
        invoiceSentDate: "2026-03-01",
      })];
      const nudges = computeNudges(entries, []);
      expect(nudges).toHaveLength(0);
    });

    it("includes partial payment entries", () => {
      vi.setSystemTime(new Date("2026-04-05"));
      const entries = [baseEntry({
        invoiceStatus: "sent",
        paymentStatus: "partial",
        invoiceSentDate: "2026-03-01",
      })];
      const nudges = computeNudges(entries, []);
      expect(nudges).toHaveLength(1);
      expect(nudges[0].nudgeType).toBe("overdue");
    });
  });

  describe("weekly_uninvoiced", () => {
    it("returns weekly_uninvoiced on Friday with draft entries in last 7 days", () => {
      vi.setSystemTime(new Date("2026-04-10")); // Friday
      const entries = [
        baseEntry({ id: "e1", date: "2026-04-05" }),
        baseEntry({ id: "e2", date: "2026-04-07" }),
      ];
      const nudges = computeNudges(entries, [], 5);
      expect(nudges.some(n => n.nudgeType === "weekly_uninvoiced")).toBe(true);
    });

    it("does NOT return weekly_uninvoiced on non-chosen day", () => {
      vi.setSystemTime(new Date("2026-04-08")); // Wednesday
      const entries = [baseEntry({ date: "2026-04-05" })];
      const nudges = computeNudges(entries, [], 5);
      expect(nudges.every(n => n.nudgeType !== "weekly_uninvoiced")).toBe(true);
    });

    it("includes entries from exactly 7 days ago", () => {
      vi.setSystemTime(new Date("2026-04-10")); // Friday
      const entries = [baseEntry({ date: "2026-04-03" })];
      const nudges = computeNudges(entries, [], 5);
      expect(nudges.some(n => n.nudgeType === "weekly_uninvoiced")).toBe(true);
    });

    it("excludes entries older than 7 days", () => {
      vi.setSystemTime(new Date("2026-04-10")); // Friday
      const entries = [baseEntry({ date: "2026-04-02" })];
      const nudges = computeNudges(entries, [], 5);
      expect(nudges.every(n => n.nudgeType !== "weekly_uninvoiced")).toBe(true);
    });

    it("skips when zero uninvoiced entries in window", () => {
      vi.setSystemTime(new Date("2026-04-10")); // Friday
      const entries = [baseEntry({ date: "2026-04-05", invoiceStatus: "sent" })];
      const nudges = computeNudges(entries, [], 5);
      expect(nudges.every(n => n.nudgeType !== "weekly_uninvoiced")).toBe(true);
    });

    it("respects custom weeklyDay (Sunday = 0)", () => {
      vi.setSystemTime(new Date("2026-04-12")); // Sunday
      const entries = [baseEntry({ date: "2026-04-08" })];
      const nudges = computeNudges(entries, [], 0);
      expect(nudges.some(n => n.nudgeType === "weekly_uninvoiced")).toBe(true);
    });

    it("shows total count and amount in description", () => {
      vi.setSystemTime(new Date("2026-04-10")); // Friday
      const entries = [
        baseEntry({ id: "e1", date: "2026-04-05", amountGross: "1000.00" }),
        baseEntry({ id: "e2", date: "2026-04-07", amountGross: "2000.00" }),
      ];
      const nudges = computeNudges(entries, [], 5);
      const n = nudges.find(n => n.nudgeType === "weekly_uninvoiced")!;
      expect(n.description).toContain("2");
      expect(n.description).toContain("₪3,000");
    });
  });

  describe("general", () => {
    it("excludes cancelled entries", () => {
      vi.setSystemTime(new Date("2026-04-05"));
      const entries = [baseEntry({ invoiceStatus: "cancelled" })];
      const nudges = computeNudges(entries, []);
      expect(nudges).toHaveLength(0);
    });

    it("returns empty array for empty entries", () => {
      const nudges = computeNudges([], []);
      expect(nudges).toHaveLength(0);
    });

    it("excludes dismissed nudges", () => {
      vi.setSystemTime(new Date("2026-04-05"));
      const entries = [baseEntry({
        invoiceStatus: "sent",
        invoiceSentDate: "2026-03-01",
      })];
      const dismissed = [{
        entryId: "entry-1",
        nudgeType: "overdue",
        periodKey: null,
        dismissedAt: new Date("2026-04-01"),
        snoozeUntil: null,
      }];
      const nudges = computeNudges(entries, dismissed);
      expect(nudges).toHaveLength(0);
    });

    it("re-includes snoozed nudges after snooze expires", () => {
      vi.setSystemTime(new Date("2026-04-05"));
      const entries = [baseEntry({
        invoiceStatus: "sent",
        invoiceSentDate: "2026-03-01",
      })];
      const dismissed = [{
        entryId: "entry-1",
        nudgeType: "overdue",
        periodKey: null,
        dismissedAt: new Date("2026-04-01"),
        snoozeUntil: new Date("2026-04-04"),
      }];
      const nudges = computeNudges(entries, dismissed);
      expect(nudges).toHaveLength(1);
    });

    it("sorts by priority: overdue before weekly_uninvoiced", () => {
      vi.setSystemTime(new Date("2026-04-10")); // Friday
      const entries = [
        baseEntry({ id: "e1", date: "2026-04-05", invoiceStatus: "draft" }),
        baseEntry({
          id: "e2",
          invoiceStatus: "sent",
          invoiceSentDate: "2026-03-01",
        }),
      ];
      const nudges = computeNudges(entries, [], 5);
      expect(nudges[0].nudgeType).toBe("overdue");
      expect(nudges[1].nudgeType).toBe("weekly_uninvoiced");
    });
  });
});

describe("computeNudges - rolling jobs filter", () => {
  it("skips future unpaid rolling-job rows", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    const entries = [
      {
        id: "1",
        date: tomorrowStr,
        description: "Weekly piano",
        clientName: "Dan",
        amountGross: "150",
        invoiceStatus: "draft",
        paymentStatus: "unpaid",
        invoiceSentDate: null,
        paidDate: null,
        updatedAt: new Date(),
        calendarEventId: null,
        rollingJobId: "job-1",
        detachedFromTemplate: false,
      },
    ];

    const nudges = computeNudges(entries as any, [], 5);
    expect(nudges.filter((n) => n.nudgeType === "overdue")).toEqual([]);
  });
});
