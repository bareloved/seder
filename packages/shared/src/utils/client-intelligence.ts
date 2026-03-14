export function computePaymentHealth(
  overdueInvoices: number,
  latePaymentRate: number
): "good" | "warning" | "bad" {
  if (overdueInvoices >= 3 || latePaymentRate >= 50) return "bad";
  if (overdueInvoices > 0 || latePaymentRate >= 20) return "warning";
  return "good";
}

export function computeActivityTrend(
  last3moCount: number,
  prior3moCount: number
): "up" | "down" | "stable" | null {
  const total = last3moCount + prior3moCount;
  if (total < 2) return null;

  if (prior3moCount === 0) return "up";
  if (last3moCount === 0) return "down";

  const ratio = last3moCount / prior3moCount;
  if (ratio > 1.2) return "up";
  if (ratio < 0.8) return "down";
  return "stable";
}
