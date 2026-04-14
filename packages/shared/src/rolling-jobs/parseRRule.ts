// packages/shared/src/rolling-jobs/parseRRule.ts
import type { Cadence } from "../types/rollingJob";

// Google's BYDAY tokens: SU MO TU WE TH FR SA → 0..6
const BYDAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

function findRRuleLine(input: string | string[]): string | null {
  const lines = Array.isArray(input) ? input : [input];
  for (const line of lines) {
    if (typeof line !== "string") continue;
    if (line.startsWith("RRULE:")) return line.slice("RRULE:".length);
  }
  return null;
}

function parseParts(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of body.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim().toUpperCase();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}

function parsePositiveInt(v: string | undefined, fallback: number): number | null {
  if (v === undefined) return fallback;
  if (!/^\d+$/.test(v)) return null;
  const n = parseInt(v, 10);
  return n >= 1 ? n : null;
}

export function parseGoogleRRule(input: string | string[]): Cadence | null {
  const body = findRRuleLine(input);
  if (!body) return null;

  const parts = parseParts(body);
  const freq = parts.FREQ;
  if (!freq) return null;

  const interval = parsePositiveInt(parts.INTERVAL, 1);
  if (interval === null) return null;

  switch (freq) {
    case "DAILY": {
      return { kind: "daily", interval };
    }
    case "WEEKLY": {
      const byday = parts.BYDAY;
      if (!byday) return null;
      const tokens = byday.split(",").map((s) => s.trim().toUpperCase());
      const weekdays: number[] = [];
      for (const tok of tokens) {
        // Reject BYDAY tokens with an ordinal prefix like "1SA" — that's monthly-by-weekday.
        if (!/^[A-Z]{2}$/.test(tok)) return null;
        const wd = BYDAY_MAP[tok];
        if (wd === undefined) return null;
        if (!weekdays.includes(wd)) weekdays.push(wd);
      }
      if (weekdays.length === 0) return null;
      weekdays.sort((a, b) => a - b);
      return { kind: "weekly", interval, weekdays };
    }
    case "MONTHLY": {
      const byMonthDay = parts.BYMONTHDAY;
      if (!byMonthDay) return null; // FREQ=MONTHLY;BYDAY=1SA — unsupported in v1
      if (!/^\d+$/.test(byMonthDay)) return null;
      const dayOfMonth = parseInt(byMonthDay, 10);
      if (dayOfMonth < 1 || dayOfMonth > 31) return null;
      return { kind: "monthly", interval, dayOfMonth };
    }
    default:
      return null;
  }
}
