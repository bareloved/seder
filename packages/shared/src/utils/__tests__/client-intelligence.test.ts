import { describe, it, expect } from "vitest";
import { computePaymentHealth, computeActivityTrend } from "../client-intelligence";

describe("computePaymentHealth", () => {
  it("returns 'bad' when overdueInvoices >= 3", () => {
    expect(computePaymentHealth(3, 0)).toBe("bad");
    expect(computePaymentHealth(5, 10)).toBe("bad");
  });

  it("returns 'bad' when latePaymentRate >= 50", () => {
    expect(computePaymentHealth(0, 50)).toBe("bad");
    expect(computePaymentHealth(1, 60)).toBe("bad");
  });

  it("returns 'warning' when overdueInvoices > 0", () => {
    expect(computePaymentHealth(1, 0)).toBe("warning");
    expect(computePaymentHealth(2, 10)).toBe("warning");
  });

  it("returns 'warning' when latePaymentRate >= 20", () => {
    expect(computePaymentHealth(0, 20)).toBe("warning");
    expect(computePaymentHealth(0, 40)).toBe("warning");
  });

  it("returns 'good' when no overdue and low late rate", () => {
    expect(computePaymentHealth(0, 0)).toBe("good");
    expect(computePaymentHealth(0, 19)).toBe("good");
  });
});

describe("computeActivityTrend", () => {
  it("returns null when totalGigs < 2", () => {
    expect(computeActivityTrend(0, 0)).toBeNull();
    expect(computeActivityTrend(1, 0)).toBeNull();
    expect(computeActivityTrend(0, 1)).toBeNull();
  });

  it("returns 'up' when recent count is >20% higher", () => {
    expect(computeActivityTrend(5, 2)).toBe("up");
    expect(computeActivityTrend(3, 0)).toBe("up");
  });

  it("returns 'down' when recent count is >20% lower", () => {
    expect(computeActivityTrend(2, 5)).toBe("down");
    expect(computeActivityTrend(0, 3)).toBe("down");
  });

  it("returns 'stable' when within 20%", () => {
    expect(computeActivityTrend(5, 5)).toBe("stable");
    expect(computeActivityTrend(6, 5)).toBe("stable"); // ratio=1.2, not > 1.2
    expect(computeActivityTrend(4, 5)).toBe("stable"); // ratio=0.8, not < 0.8
  });
});
