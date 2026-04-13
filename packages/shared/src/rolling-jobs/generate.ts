// packages/shared/src/rolling-jobs/generate.ts
import type { Cadence } from "../types/rollingJob";

export interface GenerateOccurrencesInput {
  cadence: Cadence;
  startDate: Date;
  endDate?: Date;     // inclusive hard stop
  horizonEnd: Date;   // inclusive rolling window end
  skipBefore?: Date;  // exclusive: skip dates strictly before this
}

const MAX_OCCURRENCES = 400;

function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUTC(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + n));
}

function addMonthsClamped(d: Date, months: number, targetDay: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const firstOfTarget = new Date(Date.UTC(y, m, 1));
  const lastDay = new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth(), Math.min(targetDay, lastDay)));
}

function upperBound(horizonEnd: Date, endDate?: Date): Date {
  if (!endDate) return startOfDayUTC(horizonEnd);
  const h = startOfDayUTC(horizonEnd);
  const e = startOfDayUTC(endDate);
  return e < h ? e : h;
}

export function generateOccurrences(input: GenerateOccurrencesInput): Date[] {
  const start = startOfDayUTC(input.startDate);
  const end = upperBound(input.horizonEnd, input.endDate);
  const skipBefore = input.skipBefore ? startOfDayUTC(input.skipBefore) : null;

  if (end < start) return [];

  const results: Date[] = [];
  const push = (d: Date) => {
    if (skipBefore && d < skipBefore) return;
    if (d > end) return;
    results.push(d);
  };

  switch (input.cadence.kind) {
    case "daily": {
      const step = Math.max(1, input.cadence.interval);
      for (let cur = start; cur <= end && results.length < MAX_OCCURRENCES; cur = addDaysUTC(cur, step)) {
        push(cur);
      }
      break;
    }
    case "weekly": {
      const step = Math.max(1, input.cadence.interval);
      const weekdays = Array.from(new Set(input.cadence.weekdays)).sort((a, b) => a - b);
      if (weekdays.length === 0) return [];
      // Walk in (step * 7)-day blocks, aligned to the week containing startDate.
      // "Week" here = the 7-day span beginning at startDate (not calendar week), matches user intuition.
      const blockDays = step * 7;
      for (
        let blockStart = start;
        blockStart <= end && results.length < MAX_OCCURRENCES;
        blockStart = addDaysUTC(blockStart, blockDays)
      ) {
        for (let i = 0; i < 7 && results.length < MAX_OCCURRENCES; i++) {
          const day = addDaysUTC(blockStart, i);
          if (day > end) break;
          if (day < start) continue;
          if (weekdays.includes(day.getUTCDay())) {
            push(day);
          }
        }
      }
      break;
    }
    case "monthly": {
      const step = Math.max(1, input.cadence.interval);
      const targetDay = Math.min(31, Math.max(1, input.cadence.dayOfMonth));
      // Walk month-by-step from the month containing startDate.
      let monthsElapsed = 0;
      while (results.length < MAX_OCCURRENCES) {
        const candidate = addMonthsClamped(start, monthsElapsed, targetDay);
        if (candidate > end) break;
        if (candidate >= start) push(candidate);
        monthsElapsed += step;
        if (monthsElapsed > 400 * step) break; // hard stop against runaway
      }
      break;
    }
  }

  return results;
}
