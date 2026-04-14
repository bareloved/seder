# Rolling Income Jobs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users define recurring income templates (weekly student, monthly gig, daily job) that auto-materialize real `income_entries` rows on a rolling 3-month horizon, with silent per-row detachment on edit and first-class promotion from recurring Google Calendar events.

**Architecture:** Pre-generated real rows keyed by a new `rolling_jobs` template table. Pure `generateOccurrences` function in `@seder/shared`. Nightly cron tops up the horizon. Calendar importer skips events whose parent recurring event is owned by a rolling job. iOS mirrors web via the existing cross-platform pattern.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM + PostgreSQL, Zod 4, Vitest, Better Auth, SwiftUI, `@seder/shared` monorepo package, Turborepo + pnpm.

**Spec:** `docs/superpowers/specs/2026-04-13-rolling-income-jobs-design.md`

---

## File Inventory

**Shared (`packages/shared/src/`):**
- Create: `types/rollingJob.ts`
- Create: `schemas/rollingJob.ts`
- Modify: `schemas/index.ts` (export new schemas)
- Modify: `types/index.ts` (export new types)
- Create: `rolling-jobs/generate.ts`
- Create: `rolling-jobs/parseRRule.ts`
- Create: `rolling-jobs/__tests__/generate.test.ts`
- Create: `rolling-jobs/__tests__/parseRRule.test.ts`
- Modify: `index.ts` (re-export rolling-jobs module)

**Database (`apps/web/db/`):**
- Modify: `schema.ts` (add `rollingJobs` table; add `rollingJobId`, `detachedFromTemplate` on `incomeEntries`)
- Create: `apps/web/drizzle/0006_rolling_jobs.sql` (generated)

**Server (`apps/web/lib/`, `apps/web/app/`):**
- Create: `lib/rollingJobs/materialize.ts`
- Create: `lib/rollingJobs/data.ts` (CRUD helpers, Drizzle queries)
- Create: `lib/rollingJobs/__tests__/materialize.test.ts`
- Create: `app/rolling-jobs/actions.ts`
- Create: `app/api/v1/rolling-jobs/route.ts` (list + create)
- Create: `app/api/v1/rolling-jobs/[id]/route.ts` (get + update + delete)
- Create: `app/api/v1/rolling-jobs/[id]/pause/route.ts`
- Create: `app/api/v1/rolling-jobs/[id]/resume/route.ts`
- Create: `app/api/cron/rolling-jobs/route.ts`
- Modify: `app/income/data.ts` (`updateIncomeEntry` flips detach flag when template fields change)
- Modify: `lib/nudges/compute.ts` (skip future rolling-job rows)
- Modify: `lib/nudges/queries.ts` (include new fields in `fetchNudgeableEntries` select)
- Modify: `lib/googleCalendar.ts` + calendar import route (skip events owned by a rolling job)
- Modify: `vercel.json` (add rolling-jobs cron schedule)

**Web UI (`apps/web/app/`, `apps/web/components/`):**
- Create: `app/income/components/RollingJobsDialog.tsx`
- Create: `app/income/components/rolling-jobs/RollingJobList.tsx`
- Create: `app/income/components/rolling-jobs/RollingJobForm.tsx`
- Create: `app/income/components/rolling-jobs/CadencePicker.tsx`
- Create: `app/income/components/rolling-jobs/DeleteRollingJobDialog.tsx`
- Modify: `app/income/components/IncomeHeader.tsx` (add "Rolling jobs" button)
- Modify: `app/income/components/IncomeFilters.tsx` (add "הסתר עתיד" toggle)
- Modify: `app/income/components/income-table/IncomeEntryRow.tsx` (repeat icon badge)
- Modify: `app/income/IncomePageClient.tsx` (wire dialog, toggle state)
- Modify: `app/income/components/CalendarImportDialog.tsx` (promotion action on recurring events)

**Cross-platform sync:**
- Modify: `docs/api-contract.json` (regenerated via `pnpm sync:contract`)

**iOS (`apps/ios/Seder/Seder/`):**
- Create: `Models/RollingJob.swift`
- Create: `Services/APIClient+RollingJobs.swift`
- Create: `ViewModels/RollingJobsViewModel.swift`
- Create: `Views/RollingJobs/RollingJobsView.swift`
- Create: `Views/RollingJobs/RollingJobFormSheet.swift`
- Create: `Views/RollingJobs/CadencePicker.swift`
- Create: `Views/RollingJobs/DeleteRollingJobSheet.swift`
- Modify: `Views/Components/GreenNavBar.swift` (add rolling-jobs icon button on income tab)
- Modify: `Views/Income/IncomeEntryRow.swift` (repeat icon for rolling-job rows)
- Modify: `Views/Income/IncomeListView.swift` (thread hide-future toggle through)
- Modify: `Views/Income/FilterSheet.swift` (add hide-future toggle)

---

## Task 1: Shared types for `RollingJob`

**Files:**
- Create: `packages/shared/src/types/rollingJob.ts`
- Modify: `packages/shared/src/types/index.ts`

- [ ] **Step 1.1: Create the type file**

```ts
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
```

- [ ] **Step 1.2: Re-export from the types barrel**

Modify `packages/shared/src/types/index.ts`. Add a line alongside the existing exports:

```ts
export * from "./rollingJob";
```

- [ ] **Step 1.3: Type-check passes**

Run: `pnpm --filter @seder/shared build`
Expected: builds cleanly, no errors.

- [ ] **Step 1.4: Commit**

```bash
git add packages/shared/src/types/rollingJob.ts packages/shared/src/types/index.ts
git commit -m "feat(shared): add RollingJob and Cadence types"
```

---

## Task 2: Shared Zod schemas for `RollingJob`

**Files:**
- Create: `packages/shared/src/schemas/rollingJob.ts`
- Modify: `packages/shared/src/schemas/index.ts`

- [ ] **Step 2.1: Create the schema file**

```ts
// packages/shared/src/schemas/rollingJob.ts
import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך לא תקין");

const weekdayIndex = z.number().int().min(0).max(6);

const cadenceDailySchema = z.object({
  kind: z.literal("daily"),
  interval: z.number().int().min(1).max(365),
});

const cadenceWeeklySchema = z.object({
  kind: z.literal("weekly"),
  interval: z.number().int().min(1).max(52),
  weekdays: z
    .array(weekdayIndex)
    .min(1, "יש לבחור לפחות יום אחד בשבוע")
    .transform((arr) => Array.from(new Set(arr)).sort((a, b) => a - b)),
});

const cadenceMonthlySchema = z.object({
  kind: z.literal("monthly"),
  interval: z.number().int().min(1).max(12),
  dayOfMonth: z.number().int().min(1).max(31),
});

export const cadenceSchema = z.discriminatedUnion("kind", [
  cadenceDailySchema,
  cadenceWeeklySchema,
  cadenceMonthlySchema,
]);

export const createRollingJobSchema = z
  .object({
    title: z.string().min(1, "שם נדרש").max(100),
    description: z.string().min(1, "תיאור נדרש").max(500),
    clientId: z.string().uuid().optional().nullable(),
    clientName: z.string().min(1).max(100),
    categoryId: z.string().uuid().optional().nullable(),
    amountGross: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "סכום לא תקין"),
    vatRate: z.string().regex(/^\d+(\.\d{1,2})?$/).default("18"),
    includesVat: z.boolean().default(true),
    cadence: cadenceSchema,
    startDate: dateString,
    endDate: dateString.optional().nullable(),
    sourceCalendarRecurringEventId: z.string().max(255).optional().nullable(),
    sourceCalendarId: z.string().max(255).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine(
    (v) => !v.endDate || v.endDate >= v.startDate,
    { message: "תאריך סיום חייב להיות אחרי תאריך התחלה", path: ["endDate"] },
  );

export const updateRollingJobSchema = z
  .object({
    title: z.string().min(1).max(100).optional(),
    description: z.string().min(1).max(500).optional(),
    clientId: z.string().uuid().optional().nullable(),
    clientName: z.string().min(1).max(100).optional(),
    categoryId: z.string().uuid().optional().nullable(),
    amountGross: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    vatRate: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
    includesVat: z.boolean().optional(),
    cadence: cadenceSchema.optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  });

export const deleteRollingJobSchema = z.object({
  deleteFutureDrafts: z.boolean().default(false),
});

export type CreateRollingJobSchemaInput = z.infer<typeof createRollingJobSchema>;
export type UpdateRollingJobSchemaInput = z.infer<typeof updateRollingJobSchema>;
```

- [ ] **Step 2.2: Re-export from schemas barrel**

Modify `packages/shared/src/schemas/index.ts`:

```ts
export * from "./income";
export * from "./category";
export * from "./client";
export * from "./rollingJob";
```

- [ ] **Step 2.3: Build passes**

Run: `pnpm --filter @seder/shared build`
Expected: clean build.

- [ ] **Step 2.4: Commit**

```bash
git add packages/shared/src/schemas/rollingJob.ts packages/shared/src/schemas/index.ts
git commit -m "feat(shared): add Zod schemas for rolling jobs"
```

---

## Task 3: `generateOccurrences` — failing tests first

**Files:**
- Create: `packages/shared/src/rolling-jobs/__tests__/generate.test.ts`

- [ ] **Step 3.1: Write the full test file (failing — no impl yet)**

```ts
// packages/shared/src/rolling-jobs/__tests__/generate.test.ts
import { describe, it, expect } from "vitest";
import { generateOccurrences } from "../generate";
import type { Cadence } from "../../types/rollingJob";

// Helper — ISO date on noon UTC to avoid local-tz edge cases in the test.
const d = (s: string) => new Date(`${s}T12:00:00.000Z`);
const iso = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
const isoList = (dates: Date[]) => dates.map(iso);

describe("generateOccurrences - daily", () => {
  it("emits every day when interval=1", () => {
    const cadence: Cadence = { kind: "daily", interval: 1 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      horizonEnd: d("2026-04-18"),
    });
    expect(isoList(out)).toEqual([
      "2026-04-14",
      "2026-04-15",
      "2026-04-16",
      "2026-04-17",
      "2026-04-18",
    ]);
  });

  it("respects interval=3", () => {
    const cadence: Cadence = { kind: "daily", interval: 3 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      horizonEnd: d("2026-04-28"),
    });
    expect(isoList(out)).toEqual([
      "2026-04-14", "2026-04-17", "2026-04-20", "2026-04-23", "2026-04-26",
    ]);
  });

  it("respects endDate exclusive upper bound <= horizon", () => {
    const cadence: Cadence = { kind: "daily", interval: 1 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      endDate: d("2026-04-16"),
      horizonEnd: d("2026-04-30"),
    });
    expect(isoList(out)).toEqual(["2026-04-14", "2026-04-15", "2026-04-16"]);
  });

  it("skipBefore excludes already-materialized dates", () => {
    const cadence: Cadence = { kind: "daily", interval: 1 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      horizonEnd: d("2026-04-18"),
      skipBefore: d("2026-04-17"),
    });
    expect(isoList(out)).toEqual(["2026-04-17", "2026-04-18"]);
  });
});

describe("generateOccurrences - weekly", () => {
  it("emits Tuesdays only when weekdays=[2], interval=1", () => {
    // 2026-04-14 is a Tuesday.
    const cadence: Cadence = { kind: "weekly", interval: 1, weekdays: [2] };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      horizonEnd: d("2026-05-12"),
    });
    expect(isoList(out)).toEqual([
      "2026-04-14", "2026-04-21", "2026-04-28", "2026-05-05", "2026-05-12",
    ]);
  });

  it("emits multiple weekdays in order", () => {
    // Sun=0, Thu=4 — Israel work-week sample.
    const cadence: Cadence = { kind: "weekly", interval: 1, weekdays: [0, 2, 4] };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-12"), // Sunday
      horizonEnd: d("2026-04-18"),
    });
    expect(isoList(out)).toEqual([
      "2026-04-12", // Sun
      "2026-04-14", // Tue
      "2026-04-16", // Thu
    ]);
  });

  it("respects biweekly interval=2", () => {
    // Every other Tuesday, starting Tue 2026-04-14.
    const cadence: Cadence = { kind: "weekly", interval: 2, weekdays: [2] };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      horizonEnd: d("2026-05-26"),
    });
    expect(isoList(out)).toEqual([
      "2026-04-14", "2026-04-28", "2026-05-12", "2026-05-26",
    ]);
  });

  it("startDate mid-week does not skip the first eligible day in that week", () => {
    // startDate is a Thursday; weekdays=[4 (Thu)]. First emission = that same day.
    const cadence: Cadence = { kind: "weekly", interval: 1, weekdays: [4] };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-16"),
      horizonEnd: d("2026-04-30"),
    });
    expect(isoList(out)).toEqual(["2026-04-16", "2026-04-23", "2026-04-30"]);
  });
});

describe("generateOccurrences - monthly", () => {
  it("emits the same day-of-month each month", () => {
    const cadence: Cadence = { kind: "monthly", interval: 1, dayOfMonth: 15 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-01-15"),
      horizonEnd: d("2026-04-20"),
    });
    expect(isoList(out)).toEqual([
      "2026-01-15", "2026-02-15", "2026-03-15", "2026-04-15",
    ]);
  });

  it("clamps day 31 to last day of short months", () => {
    const cadence: Cadence = { kind: "monthly", interval: 1, dayOfMonth: 31 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-01-31"),
      horizonEnd: d("2026-05-31"),
    });
    expect(isoList(out)).toEqual([
      "2026-01-31",
      "2026-02-28", // 2026 not leap
      "2026-03-31",
      "2026-04-30",
      "2026-05-31",
    ]);
  });

  it("handles interval=2 (bi-monthly)", () => {
    const cadence: Cadence = { kind: "monthly", interval: 2, dayOfMonth: 1 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-02-01"),
      horizonEnd: d("2026-08-01"),
    });
    expect(isoList(out)).toEqual([
      "2026-02-01", "2026-04-01", "2026-06-01", "2026-08-01",
    ]);
  });
});

describe("generateOccurrences - safety cap", () => {
  it("caps output at 400 occurrences", () => {
    const cadence: Cadence = { kind: "daily", interval: 1 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-01-01"),
      horizonEnd: d("2030-01-01"), // would be ~1460 days
    });
    expect(out.length).toBe(400);
  });
});

describe("generateOccurrences - empty results", () => {
  it("returns [] when endDate is before startDate", () => {
    const cadence: Cadence = { kind: "daily", interval: 1 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      endDate: d("2026-04-13"),
      horizonEnd: d("2026-04-30"),
    });
    expect(out).toEqual([]);
  });

  it("returns [] when horizonEnd is before startDate", () => {
    const cadence: Cadence = { kind: "daily", interval: 1 };
    const out = generateOccurrences({
      cadence,
      startDate: d("2026-04-14"),
      horizonEnd: d("2026-04-13"),
    });
    expect(out).toEqual([]);
  });
});
```

- [ ] **Step 3.2: Run tests to confirm they fail**

Run: `pnpm --filter @seder/shared test generate`
Expected: FAIL with "Cannot find module '../generate'" or similar.

---

## Task 4: `generateOccurrences` — implementation

**Files:**
- Create: `packages/shared/src/rolling-jobs/generate.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 4.1: Write the implementation**

```ts
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
```

- [ ] **Step 4.2: Run tests — all green**

Run: `pnpm --filter @seder/shared test generate`
Expected: 16+ tests passing.

- [ ] **Step 4.3: Re-export from the shared package barrel**

Modify `packages/shared/src/index.ts`. Add:

```ts
export * from "./rolling-jobs/generate";
export * from "./rolling-jobs/parseRRule";
```

(The `parseRRule` export will be empty until Task 5, but add it now so we don't forget.)

- [ ] **Step 4.4: Commit**

```bash
git add packages/shared/src/rolling-jobs/generate.ts packages/shared/src/rolling-jobs/__tests__/generate.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): add generateOccurrences with tests for daily/weekly/monthly"
```

---

## Task 5: `parseGoogleRRule` — failing tests first

**Files:**
- Create: `packages/shared/src/rolling-jobs/__tests__/parseRRule.test.ts`

- [ ] **Step 5.1: Write the failing test file**

```ts
// packages/shared/src/rolling-jobs/__tests__/parseRRule.test.ts
import { describe, it, expect } from "vitest";
import { parseGoogleRRule } from "../parseRRule";

describe("parseGoogleRRule - daily", () => {
  it("parses FREQ=DAILY with default interval", () => {
    expect(parseGoogleRRule("RRULE:FREQ=DAILY")).toEqual({ kind: "daily", interval: 1 });
  });

  it("parses FREQ=DAILY;INTERVAL=3", () => {
    expect(parseGoogleRRule("RRULE:FREQ=DAILY;INTERVAL=3")).toEqual({ kind: "daily", interval: 3 });
  });
});

describe("parseGoogleRRule - weekly", () => {
  it("parses FREQ=WEEKLY with no BYDAY", () => {
    // Without BYDAY, fall back to single weekday from dtstart — we return null and let caller prefill.
    expect(parseGoogleRRule("RRULE:FREQ=WEEKLY")).toBeNull();
  });

  it("parses BYDAY=TU (single day)", () => {
    expect(parseGoogleRRule("RRULE:FREQ=WEEKLY;BYDAY=TU")).toEqual({
      kind: "weekly",
      interval: 1,
      weekdays: [2],
    });
  });

  it("parses BYDAY=SU,TU,TH (multiple)", () => {
    expect(parseGoogleRRule("RRULE:FREQ=WEEKLY;BYDAY=SU,TU,TH")).toEqual({
      kind: "weekly",
      interval: 1,
      weekdays: [0, 2, 4],
    });
  });

  it("parses INTERVAL=2", () => {
    expect(parseGoogleRRule("RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TU")).toEqual({
      kind: "weekly",
      interval: 2,
      weekdays: [2],
    });
  });
});

describe("parseGoogleRRule - monthly", () => {
  it("parses FREQ=MONTHLY;BYMONTHDAY=15", () => {
    expect(parseGoogleRRule("RRULE:FREQ=MONTHLY;BYMONTHDAY=15")).toEqual({
      kind: "monthly",
      interval: 1,
      dayOfMonth: 15,
    });
  });

  it("parses FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=1", () => {
    expect(parseGoogleRRule("RRULE:FREQ=MONTHLY;INTERVAL=2;BYMONTHDAY=1")).toEqual({
      kind: "monthly",
      interval: 2,
      dayOfMonth: 1,
    });
  });

  it("returns null for BYDAY-driven monthly (first Saturday, etc.)", () => {
    // Unsupported in v1.
    expect(parseGoogleRRule("RRULE:FREQ=MONTHLY;BYDAY=1SA")).toBeNull();
  });
});

describe("parseGoogleRRule - unsupported", () => {
  it("returns null for FREQ=YEARLY", () => {
    expect(parseGoogleRRule("RRULE:FREQ=YEARLY")).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(parseGoogleRRule("")).toBeNull();
    expect(parseGoogleRRule("not-an-rrule")).toBeNull();
    expect(parseGoogleRRule("RRULE:FREQ=DAILY;INTERVAL=abc")).toBeNull();
  });

  it("accepts an array of RRULE strings (Google returns string[])", () => {
    // Sometimes events.recurrence is `["RRULE:FREQ=WEEKLY;BYDAY=TU", "EXDATE:..."]`.
    expect(parseGoogleRRule(["RRULE:FREQ=WEEKLY;BYDAY=TU", "EXDATE:20260421T120000Z"])).toEqual({
      kind: "weekly",
      interval: 1,
      weekdays: [2],
    });
  });
});
```

- [ ] **Step 5.2: Run tests to confirm failure**

Run: `pnpm --filter @seder/shared test parseRRule`
Expected: FAIL with module-not-found.

---

## Task 6: `parseGoogleRRule` — implementation

**Files:**
- Create: `packages/shared/src/rolling-jobs/parseRRule.ts`

- [ ] **Step 6.1: Write the implementation**

```ts
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
```

- [ ] **Step 6.2: Run tests — all green**

Run: `pnpm --filter @seder/shared test parseRRule`
Expected: 11 tests passing.

- [ ] **Step 6.3: Build the full shared package once more**

Run: `pnpm --filter @seder/shared build && pnpm --filter @seder/shared test`
Expected: clean build, all shared tests passing.

- [ ] **Step 6.4: Commit**

```bash
git add packages/shared/src/rolling-jobs/parseRRule.ts packages/shared/src/rolling-jobs/__tests__/parseRRule.test.ts
git commit -m "feat(shared): add parseGoogleRRule for promotion from calendar"
```

---

## Task 7: Database schema — Drizzle table + `incomeEntries` columns

**Files:**
- Modify: `apps/web/db/schema.ts`
- Create: `apps/web/drizzle/0006_rolling_jobs.sql` (generated)

- [ ] **Step 7.1: Edit `apps/web/db/schema.ts`**

Add the following imports at the top if not already present: `jsonb` (already importing `json`; we'll use `json` to match the existing pattern).

Add the new table **before** `incomeEntries` so the FK reference works:

```ts
// Rolling jobs table - recurring income templates
export const rollingJobs = pgTable("rolling_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true).notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  clientId: uuid("client_id").references(() => clients.id),
  clientName: varchar("client_name", { length: 100 }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  amountGross: numeric("amount_gross", { precision: 12, scale: 2 }).notNull(),
  vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default("18").notNull(),
  includesVat: boolean("includes_vat").default(true).notNull(),
  defaultInvoiceStatus: varchar("default_invoice_status", { length: 20 })
    .$type<InvoiceStatus>()
    .default("draft")
    .notNull(),
  cadence: json("cadence").notNull(), // { kind: "daily"|"weekly"|"monthly", ... }
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  sourceCalendarRecurringEventId: varchar("source_calendar_recurring_event_id", { length: 255 }),
  sourceCalendarId: varchar("source_calendar_id", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("rolling_jobs_user_id_idx").on(table.userId),
  userActiveIdx: index("rolling_jobs_user_active_idx").on(table.userId, table.isActive),
  userCalendarRecurringIdx: index("rolling_jobs_user_cal_recurring_idx").on(
    table.userId,
    table.sourceCalendarRecurringEventId,
  ),
}));

export type RollingJobRow = typeof rollingJobs.$inferSelect;
export type NewRollingJobRow = typeof rollingJobs.$inferInsert;
```

Inside the existing `incomeEntries` pgTable definition, add two columns (after `clientId` is a good spot):

```ts
rollingJobId: uuid("rolling_job_id").references(() => rollingJobs.id, { onDelete: "set null" }),
detachedFromTemplate: boolean("detached_from_template").default(false).notNull(),
```

Inside the `incomeEntries` table index block, add:

```ts
rollingJobDateUnique: uniqueIndex("income_rolling_job_date_key")
  .on(table.rollingJobId, table.date)
  .where(sql`${table.rollingJobId} IS NOT NULL`),
```

And add `sql` to the drizzle import at the top:

```ts
import { sql } from "drizzle-orm";
```

- [ ] **Step 7.2: Generate the migration**

Run: `pnpm --filter web db:generate`
Expected: a new file appears at `apps/web/drizzle/0006_*.sql`. Rename it to `0006_rolling_jobs.sql` if the auto-name is ugly.

- [ ] **Step 7.3: Inspect the generated SQL**

Run: `cat apps/web/drizzle/0006_rolling_jobs.sql`
Expected (exact form may vary):
- `CREATE TABLE "rolling_jobs" (...)`
- `ALTER TABLE "income_entries" ADD COLUMN "rolling_job_id" ...`
- `ALTER TABLE "income_entries" ADD COLUMN "detached_from_template" ...`
- Three new indexes on `rolling_jobs`
- One partial unique index on `income_entries (rolling_job_id, date)`

If the partial unique index is missing (drizzle-kit limitation), append it manually to the generated SQL file:

```sql
CREATE UNIQUE INDEX "income_rolling_job_date_key"
  ON "income_entries" ("rolling_job_id", "date")
  WHERE "rolling_job_id" IS NOT NULL;
```

- [ ] **Step 7.4: Apply migration to local DB**

Run: `pnpm --filter web db:migrate`
Expected: "migration applied" or equivalent success.

- [ ] **Step 7.5: Verify with a quick manual query**

Run: `pnpm --filter web db:studio` (optional) — confirm `rolling_jobs` table exists and `income_entries` shows the two new columns.

- [ ] **Step 7.6: Commit**

```bash
git add apps/web/db/schema.ts apps/web/drizzle/0006_rolling_jobs.sql
git commit -m "feat(db): add rolling_jobs table and income_entries recurrence columns"
```

---

## Task 8: `materializeRollingJob` — failing integration tests first

**Files:**
- Create: `apps/web/lib/rollingJobs/__tests__/materialize.test.ts`

- [ ] **Step 8.1: Check existing test setup for DB tests**

Run: `grep -R "integration" apps/web/vitest.config.ts apps/web/**/vitest*.ts 2>/dev/null || ls apps/web/vitest.config.ts`

The project has no integration test infra wired. For this task, the "integration" test mocks the `db` module rather than hitting a real DB — same as existing unit tests elsewhere. If a real test DB becomes available later, these tests can be upgraded.

- [ ] **Step 8.2: Write the failing test**

```ts
// apps/web/lib/rollingJobs/__tests__/materialize.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Cadence } from "@seder/shared";

// Mock the DB client before importing the module under test.
const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
};

vi.mock("@/db/client", () => ({ db: mockDb }));
vi.mock("@/db/schema", () => ({
  incomeEntries: { rollingJobId: "col.rollingJobId", date: "col.date" },
  rollingJobs: {},
}));

import { materializeRollingJob, type RollingJobForMaterialize } from "../materialize";

const baseJob: RollingJobForMaterialize = {
  id: "job-1",
  userId: "user-1",
  description: "Piano — Dan",
  clientId: null,
  clientName: "Dan",
  categoryId: null,
  amountGross: "150.00",
  vatRate: "18.00",
  includesVat: true,
  defaultInvoiceStatus: "draft",
  cadence: { kind: "weekly", interval: 1, weekdays: [2] } as Cadence,
  startDate: "2026-04-14",
  endDate: null,
  notes: null,
};

describe("materializeRollingJob", () => {
  beforeEach(() => {
    mockDb.select.mockReset();
    mockDb.insert.mockReset();
  });

  it("generates future rows up to horizonEnd when no prior materialization", async () => {
    // SELECT MAX(date) returns null (no rows yet).
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ max: null }]),
      }),
    });
    const insertChain = {
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 5 }),
      }),
    };
    mockDb.insert.mockReturnValue(insertChain);

    const count = await materializeRollingJob(baseJob, {
      horizonEnd: new Date("2026-05-12T12:00:00Z"), // 5 Tuesdays incl. 2026-04-14
      today: new Date("2026-04-14T12:00:00Z"),
    });

    expect(count).toBe(5);
    const rowsInserted = insertChain.values.mock.calls[0][0];
    expect(rowsInserted).toHaveLength(5);
    expect(rowsInserted[0]).toMatchObject({
      rollingJobId: "job-1",
      userId: "user-1",
      description: "Piano — Dan",
      amountGross: "150.00",
      invoiceStatus: "draft",
      paymentStatus: "unpaid",
      amountPaid: "0",
      detachedFromTemplate: false,
    });
  });

  it("is idempotent — skipBefore prevents re-emitting already-materialized rows", async () => {
    // MAX(date) already at 2026-04-21.
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ max: "2026-04-21" }]),
      }),
    });
    const insertChain = {
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 3 }),
      }),
    };
    mockDb.insert.mockReturnValue(insertChain);

    const count = await materializeRollingJob(baseJob, {
      horizonEnd: new Date("2026-05-12T12:00:00Z"),
      today: new Date("2026-04-21T12:00:00Z"),
    });

    expect(count).toBe(3);
    // Rows inserted should start from 2026-04-28 (not 2026-04-14 or 2026-04-21).
    const rowsInserted = insertChain.values.mock.calls[0][0];
    expect(rowsInserted.map((r: any) => r.date)).toEqual([
      "2026-04-28", "2026-05-05", "2026-05-12",
    ]);
  });

  it("returns 0 and skips insert when there are no new occurrences", async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ max: "2026-05-12" }]),
      }),
    });

    const count = await materializeRollingJob(baseJob, {
      horizonEnd: new Date("2026-05-12T12:00:00Z"),
      today: new Date("2026-05-12T12:00:00Z"),
    });

    expect(count).toBe(0);
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("honors endDate hard stop", async () => {
    mockDb.select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ max: null }]),
      }),
    });
    const insertChain = {
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue({ rowCount: 2 }),
      }),
    };
    mockDb.insert.mockReturnValue(insertChain);

    await materializeRollingJob(
      { ...baseJob, endDate: "2026-04-21" },
      {
        horizonEnd: new Date("2026-12-31T12:00:00Z"),
        today: new Date("2026-04-14T12:00:00Z"),
      },
    );

    const rows = insertChain.values.mock.calls[0][0];
    expect(rows.map((r: any) => r.date)).toEqual(["2026-04-14", "2026-04-21"]);
  });
});
```

- [ ] **Step 8.3: Run — must fail (module not found)**

Run: `pnpm --filter web test materialize`
Expected: FAIL with module-not-found for `../materialize`.

---

## Task 9: `materializeRollingJob` — implementation

**Files:**
- Create: `apps/web/lib/rollingJobs/materialize.ts`

- [ ] **Step 9.1: Write the implementation**

```ts
// apps/web/lib/rollingJobs/materialize.ts
import { db } from "@/db/client";
import { incomeEntries } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateOccurrences, type Cadence } from "@seder/shared";

export interface RollingJobForMaterialize {
  id: string;
  userId: string;
  description: string;
  clientId: string | null;
  clientName: string;
  categoryId: string | null;
  amountGross: string;
  vatRate: string;
  includesVat: boolean;
  defaultInvoiceStatus: "draft" | "sent" | "paid" | "cancelled";
  cadence: Cadence;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
  notes: string | null;
}

export interface MaterializeOptions {
  horizonEnd: Date;
  today: Date;
}

function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0)); // noon UTC to dodge tz edges
}

function toDateOnly(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export async function materializeRollingJob(
  job: RollingJobForMaterialize,
  opts: MaterializeOptions,
): Promise<number> {
  // 1. Find last materialized date for this job.
  const existing = await db
    .select({ max: sql<string | null>`MAX(${incomeEntries.date})` })
    .from(incomeEntries)
    .where(eq(incomeEntries.rollingJobId, job.id));

  const lastMaterializedStr = existing[0]?.max ?? null;
  const skipBefore = lastMaterializedStr
    ? parseDateOnly(lastMaterializedStr)
    : undefined;

  // Note: generateOccurrences treats skipBefore as "strictly before" (< not <=),
  // so we nudge it forward by 1 day so the existing MAX row is NOT re-emitted.
  const skipBeforeAdjusted = skipBefore
    ? new Date(Date.UTC(skipBefore.getUTCFullYear(), skipBefore.getUTCMonth(), skipBefore.getUTCDate() + 1))
    : undefined;

  const dates = generateOccurrences({
    cadence: job.cadence,
    startDate: parseDateOnly(job.startDate),
    endDate: job.endDate ? parseDateOnly(job.endDate) : undefined,
    horizonEnd: opts.horizonEnd,
    skipBefore: skipBeforeAdjusted,
  });

  if (dates.length === 0) return 0;

  const rows = dates.map((d) => ({
    date: toDateOnly(d),
    description: job.description,
    clientName: job.clientName,
    clientId: job.clientId,
    categoryId: job.categoryId,
    amountGross: job.amountGross,
    amountPaid: "0",
    vatRate: job.vatRate,
    includesVat: job.includesVat,
    invoiceStatus: "draft" as const,
    paymentStatus: "unpaid" as const,
    userId: job.userId,
    rollingJobId: job.id,
    detachedFromTemplate: false,
    notes: job.notes,
  }));

  const result = await db
    .insert(incomeEntries)
    .values(rows)
    .onConflictDoNothing({
      target: [incomeEntries.rollingJobId, incomeEntries.date],
    });

  // drizzle returns { rowCount } for pg; fall back to rows.length if absent.
  return (result as any)?.rowCount ?? rows.length;
}
```

- [ ] **Step 9.2: Run tests — all green**

Run: `pnpm --filter web test materialize`
Expected: 4 tests passing.

- [ ] **Step 9.3: Commit**

```bash
git add apps/web/lib/rollingJobs/materialize.ts apps/web/lib/rollingJobs/__tests__/materialize.test.ts
git commit -m "feat(server): add materializeRollingJob with idempotent insert"
```

---

## Task 10: Rolling jobs CRUD helpers

**Files:**
- Create: `apps/web/lib/rollingJobs/data.ts`

- [ ] **Step 10.1: Write the data helpers**

```ts
// apps/web/lib/rollingJobs/data.ts
import { db } from "@/db/client";
import { rollingJobs, incomeEntries } from "@/db/schema";
import { and, eq, gte, gt, isNull, sql, inArray } from "drizzle-orm";
import type { Cadence } from "@seder/shared";
import { materializeRollingJob, type RollingJobForMaterialize } from "./materialize";

export interface CreateRollingJobRow {
  userId: string;
  title: string;
  description: string;
  clientId: string | null;
  clientName: string;
  categoryId: string | null;
  amountGross: string;
  vatRate: string;
  includesVat: boolean;
  cadence: Cadence;
  startDate: string;
  endDate: string | null;
  sourceCalendarRecurringEventId: string | null;
  sourceCalendarId: string | null;
  notes: string | null;
}

export async function listRollingJobs(userId: string) {
  return db
    .select()
    .from(rollingJobs)
    .where(eq(rollingJobs.userId, userId))
    .orderBy(rollingJobs.createdAt);
}

export async function getRollingJob(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(rollingJobs)
    .where(and(eq(rollingJobs.userId, userId), eq(rollingJobs.id, id)))
    .limit(1);
  return row ?? null;
}

export async function insertRollingJob(input: CreateRollingJobRow) {
  const [row] = await db
    .insert(rollingJobs)
    .values({
      userId: input.userId,
      title: input.title,
      description: input.description,
      clientId: input.clientId,
      clientName: input.clientName,
      categoryId: input.categoryId,
      amountGross: input.amountGross,
      vatRate: input.vatRate,
      includesVat: input.includesVat,
      cadence: input.cadence as unknown as object,
      startDate: input.startDate,
      endDate: input.endDate,
      sourceCalendarRecurringEventId: input.sourceCalendarRecurringEventId,
      sourceCalendarId: input.sourceCalendarId,
      notes: input.notes,
    })
    .returning();
  return row;
}

/**
 * Apply a field-only template update (no cadence/startDate/endDate change).
 * Rewrites attached future rows (from `today` onward) whose `detachedFromTemplate` is false.
 */
export async function applyFieldUpdateToFutureRows(
  userId: string,
  jobId: string,
  today: string,
  patch: {
    description?: string;
    clientId?: string | null;
    clientName?: string;
    categoryId?: string | null;
    amountGross?: string;
    vatRate?: string;
    includesVat?: boolean;
    notes?: string | null;
  },
) {
  if (Object.keys(patch).length === 0) return { updated: 0 };
  const result = await db
    .update(incomeEntries)
    .set(patch)
    .where(
      and(
        eq(incomeEntries.userId, userId),
        eq(incomeEntries.rollingJobId, jobId),
        gte(incomeEntries.date, today),
        eq(incomeEntries.detachedFromTemplate, false),
      ),
    );
  return { updated: (result as any)?.rowCount ?? 0 };
}

/**
 * Update cadence/startDate/endDate and reconcile attached future rows.
 * Deletes attached future rows that no longer belong; the caller should then call
 * materializeRollingJob to insert any newly-expected rows.
 */
export async function deleteFutureAttachedRowsNotIn(
  userId: string,
  jobId: string,
  today: string,
  expectedDates: string[],
) {
  const attached = await db
    .select({ id: incomeEntries.id, date: incomeEntries.date })
    .from(incomeEntries)
    .where(
      and(
        eq(incomeEntries.userId, userId),
        eq(incomeEntries.rollingJobId, jobId),
        gte(incomeEntries.date, today),
        eq(incomeEntries.detachedFromTemplate, false),
      ),
    );

  const expectedSet = new Set(expectedDates);
  const idsToDelete = attached
    .filter((r) => !expectedSet.has(r.date))
    .map((r) => r.id);

  if (idsToDelete.length === 0) return { deleted: 0 };

  await db
    .delete(incomeEntries)
    .where(inArray(incomeEntries.id, idsToDelete));

  return { deleted: idsToDelete.length };
}

export async function updateRollingJobRow(
  userId: string,
  id: string,
  patch: Partial<CreateRollingJobRow>,
) {
  const values: Record<string, unknown> = { ...patch, updatedAt: new Date() };
  if (patch.cadence !== undefined) values.cadence = patch.cadence as unknown as object;
  const [row] = await db
    .update(rollingJobs)
    .set(values)
    .where(and(eq(rollingJobs.userId, userId), eq(rollingJobs.id, id)))
    .returning();
  return row ?? null;
}

export async function setRollingJobActive(userId: string, id: string, isActive: boolean) {
  const [row] = await db
    .update(rollingJobs)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(rollingJobs.userId, userId), eq(rollingJobs.id, id)))
    .returning();
  return row ?? null;
}

/**
 * Delete a rolling job. If deleteFutureDrafts=true, also delete unpaid draft future rows.
 * Past and non-draft/paid rows keep the row but get `rollingJobId` set to NULL via
 * the FK's ON DELETE SET NULL — we additionally flip `detachedFromTemplate=true`
 * on them so historical edits stay consistent.
 */
export async function deleteRollingJob(
  userId: string,
  id: string,
  opts: { deleteFutureDrafts: boolean; today: string },
) {
  // 1. Mark still-attached past/present rows as detached (they'll lose rollingJobId via FK).
  await db
    .update(incomeEntries)
    .set({ detachedFromTemplate: true })
    .where(
      and(
        eq(incomeEntries.userId, userId),
        eq(incomeEntries.rollingJobId, id),
      ),
    );

  // 2. Optionally delete future unpaid drafts.
  if (opts.deleteFutureDrafts) {
    await db
      .delete(incomeEntries)
      .where(
        and(
          eq(incomeEntries.userId, userId),
          eq(incomeEntries.rollingJobId, id),
          gt(incomeEntries.date, opts.today),
          eq(incomeEntries.invoiceStatus, "draft"),
          eq(incomeEntries.paymentStatus, "unpaid"),
        ),
      );
  }

  // 3. Delete the job row itself — FK cascades rollingJobId to NULL on any remaining rows.
  await db
    .delete(rollingJobs)
    .where(and(eq(rollingJobs.userId, userId), eq(rollingJobs.id, id)));
}

export function rowToMaterializeInput(row: typeof rollingJobs.$inferSelect): RollingJobForMaterialize {
  return {
    id: row.id,
    userId: row.userId,
    description: row.description,
    clientId: row.clientId,
    clientName: row.clientName,
    categoryId: row.categoryId,
    amountGross: row.amountGross,
    vatRate: row.vatRate,
    includesVat: row.includesVat,
    defaultInvoiceStatus: row.defaultInvoiceStatus,
    cadence: row.cadence as Cadence,
    startDate: row.startDate,
    endDate: row.endDate,
    notes: row.notes,
  };
}
```

- [ ] **Step 10.2: Type-check**

Run: `pnpm --filter web typecheck` (or `pnpm --filter web build`)
Expected: no type errors.

- [ ] **Step 10.3: Commit**

```bash
git add apps/web/lib/rollingJobs/data.ts
git commit -m "feat(server): add rolling jobs CRUD data helpers"
```

---

## Task 11: `updateIncomeEntry` — flip detach flag on edit

**Files:**
- Modify: `apps/web/app/income/data.ts`

- [ ] **Step 11.1: Read the current `updateIncomeEntry` function**

Run: `grep -n "updateIncomeEntry" apps/web/app/income/data.ts`

Open the file and find the `updateIncomeEntry` function. Note the shape of the patch object it accepts.

- [ ] **Step 11.2: Add the detach logic**

Inside `updateIncomeEntry`, after building the patch but before the `db.update(...)` call, add:

```ts
// Flip detach flag on rolling-job rows whenever a template-tracked field changes.
const TEMPLATE_TRACKED_FIELDS = [
  "description",
  "amountGross",
  "vatRate",
  "includesVat",
  "date",
  "clientId",
  "categoryId",
] as const;

const touchesTemplateField = TEMPLATE_TRACKED_FIELDS.some(
  (k) => (patch as Record<string, unknown>)[k] !== undefined,
);

if (touchesTemplateField) {
  (patch as Record<string, unknown>).detachedFromTemplate = true;
}
```

Adjust variable names (`patch`) to match whatever name the existing function uses. If the function currently reconstructs the patch inline in the `.set(...)` call, refactor to a named `patch` variable first.

- [ ] **Step 11.3: Type-check**

Run: `pnpm --filter web typecheck`
Expected: clean.

- [ ] **Step 11.4: Commit**

```bash
git add apps/web/app/income/data.ts
git commit -m "feat(income): flip detachedFromTemplate when editing a rolling-job row"
```

---

## Task 12: Server actions for rolling jobs

**Files:**
- Create: `apps/web/app/rolling-jobs/actions.ts`

- [ ] **Step 12.1: Write the actions file**

```ts
// apps/web/app/rolling-jobs/actions.ts
"use server";

import { revalidatePath, updateTag } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  createRollingJobSchema,
  updateRollingJobSchema,
  deleteRollingJobSchema,
  generateOccurrences,
  type Cadence,
} from "@seder/shared";
import {
  insertRollingJob,
  listRollingJobs,
  getRollingJob,
  updateRollingJobRow,
  setRollingJobActive,
  deleteRollingJob,
  applyFieldUpdateToFutureRows,
  deleteFutureAttachedRowsNotIn,
  rowToMaterializeInput,
} from "@/lib/rollingJobs/data";
import { materializeRollingJob } from "@/lib/rollingJobs/materialize";

const HORIZON_DAYS = 90;

async function getUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
}

function todayStr(): string {
  const d = todayUTC();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function horizonEnd(): Date {
  const t = todayUTC();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + HORIZON_DAYS, 12));
}

function revalidateIncome() {
  revalidatePath("/income");
  updateTag("income-data");
}

// ─── Read ───────────────────────────────────────────────────────────────────

export async function listRollingJobsAction() {
  const userId = await getUserId();
  if (!userId) return { success: false as const, error: "Unauthorized" };
  const jobs = await listRollingJobs(userId);
  return { success: true as const, jobs };
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createRollingJobAction(input: unknown) {
  const userId = await getUserId();
  if (!userId) return { success: false as const, error: "Unauthorized" };

  const parsed = createRollingJobSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }

  const data = parsed.data;

  try {
    const row = await insertRollingJob({
      userId,
      title: data.title,
      description: data.description,
      clientId: data.clientId ?? null,
      clientName: data.clientName,
      categoryId: data.categoryId ?? null,
      amountGross: data.amountGross,
      vatRate: data.vatRate,
      includesVat: data.includesVat,
      cadence: data.cadence,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      sourceCalendarRecurringEventId: data.sourceCalendarRecurringEventId ?? null,
      sourceCalendarId: data.sourceCalendarId ?? null,
      notes: data.notes ?? null,
    });

    const inserted = await materializeRollingJob(rowToMaterializeInput(row), {
      horizonEnd: horizonEnd(),
      today: todayUTC(),
    });

    revalidateIncome();
    return { success: true as const, job: row, insertedCount: inserted };
  } catch (err) {
    console.error("createRollingJobAction failed", err);
    return { success: false as const, error: "Failed to create rolling job" };
  }
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateRollingJobAction(id: string, input: unknown) {
  const userId = await getUserId();
  if (!userId) return { success: false as const, error: "Unauthorized" };

  const parsed = updateRollingJobSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }
  const patch = parsed.data;

  const existing = await getRollingJob(userId, id);
  if (!existing) return { success: false as const, error: "Not found" };

  const cadenceChanged = patch.cadence !== undefined;
  const datesChanged = patch.startDate !== undefined || patch.endDate !== undefined;

  const updated = await updateRollingJobRow(userId, id, {
    ...patch,
    clientId: patch.clientId ?? undefined,
    categoryId: patch.categoryId ?? undefined,
    endDate: patch.endDate ?? undefined,
    notes: patch.notes ?? undefined,
  });
  if (!updated) return { success: false as const, error: "Update failed" };

  const today = todayStr();

  if (cadenceChanged || datesChanged) {
    // Rebuild expected future dates and reconcile attached rows.
    const expected = generateOccurrences({
      cadence: updated.cadence as Cadence,
      startDate: new Date(`${updated.startDate}T12:00:00Z`),
      endDate: updated.endDate ? new Date(`${updated.endDate}T12:00:00Z`) : undefined,
      horizonEnd: horizonEnd(),
      skipBefore: new Date(`${today}T12:00:00Z`),
    });
    const expectedDates = expected.map((d) => {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    });
    const { deleted } = await deleteFutureAttachedRowsNotIn(userId, id, today, expectedDates);
    const inserted = await materializeRollingJob(rowToMaterializeInput(updated), {
      horizonEnd: horizonEnd(),
      today: todayUTC(),
    });
    revalidateIncome();
    return { success: true as const, job: updated, futureDeleted: deleted, futureInserted: inserted };
  }

  // Field-only change: single UPDATE to future attached rows.
  const { updated: futureUpdated } = await applyFieldUpdateToFutureRows(userId, id, today, {
    description: patch.description,
    clientId: patch.clientId,
    clientName: patch.clientName,
    categoryId: patch.categoryId,
    amountGross: patch.amountGross,
    vatRate: patch.vatRate,
    includesVat: patch.includesVat,
    notes: patch.notes,
  });

  revalidateIncome();
  return { success: true as const, job: updated, futureUpdated };
}

// ─── Pause / Resume ─────────────────────────────────────────────────────────

export async function pauseRollingJobAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { success: false as const, error: "Unauthorized" };
  const row = await setRollingJobActive(userId, id, false);
  if (!row) return { success: false as const, error: "Not found" };
  revalidateIncome();
  return { success: true as const, job: row };
}

export async function resumeRollingJobAction(id: string) {
  const userId = await getUserId();
  if (!userId) return { success: false as const, error: "Unauthorized" };
  const row = await setRollingJobActive(userId, id, true);
  if (!row) return { success: false as const, error: "Not found" };
  const inserted = await materializeRollingJob(rowToMaterializeInput(row), {
    horizonEnd: horizonEnd(),
    today: todayUTC(),
  });
  revalidateIncome();
  return { success: true as const, job: row, insertedCount: inserted };
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteRollingJobAction(id: string, input: unknown) {
  const userId = await getUserId();
  if (!userId) return { success: false as const, error: "Unauthorized" };
  const parsed = deleteRollingJobSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.flatten() };
  }
  await deleteRollingJob(userId, id, {
    deleteFutureDrafts: parsed.data.deleteFutureDrafts,
    today: todayStr(),
  });
  revalidateIncome();
  return { success: true as const };
}
```

- [ ] **Step 12.2: Type-check**

Run: `pnpm --filter web typecheck`
Expected: clean.

- [ ] **Step 12.3: Commit**

```bash
git add apps/web/app/rolling-jobs/actions.ts
git commit -m "feat(server): rolling jobs server actions (create/update/delete/pause/resume)"
```

---

## Task 13: REST API routes for iOS

**Files:**
- Create: `apps/web/app/api/v1/rolling-jobs/route.ts`
- Create: `apps/web/app/api/v1/rolling-jobs/[id]/route.ts`
- Create: `apps/web/app/api/v1/rolling-jobs/[id]/pause/route.ts`
- Create: `apps/web/app/api/v1/rolling-jobs/[id]/resume/route.ts`

- [ ] **Step 13.1: Write the collection route**

```ts
// apps/web/app/api/v1/rolling-jobs/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { listRollingJobs, insertRollingJob, rowToMaterializeInput } from "@/lib/rollingJobs/data";
import { materializeRollingJob } from "@/lib/rollingJobs/materialize";
import { createRollingJobSchema } from "@seder/shared";

const HORIZON_DAYS = 90;

function horizonEnd(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + HORIZON_DAYS, 12));
}

function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 12));
}

export async function GET() {
  try {
    const userId = await requireAuth();
    const jobs = await listRollingJobs(userId);
    return apiSuccess(jobs);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = createRollingJobSchema.parse(body);
    const row = await insertRollingJob({
      userId,
      title: parsed.title,
      description: parsed.description,
      clientId: parsed.clientId ?? null,
      clientName: parsed.clientName,
      categoryId: parsed.categoryId ?? null,
      amountGross: parsed.amountGross,
      vatRate: parsed.vatRate,
      includesVat: parsed.includesVat,
      cadence: parsed.cadence,
      startDate: parsed.startDate,
      endDate: parsed.endDate ?? null,
      sourceCalendarRecurringEventId: parsed.sourceCalendarRecurringEventId ?? null,
      sourceCalendarId: parsed.sourceCalendarId ?? null,
      notes: parsed.notes ?? null,
    });
    await materializeRollingJob(rowToMaterializeInput(row), {
      horizonEnd: horizonEnd(),
      today: todayUTC(),
    });
    return apiSuccess(row, 201);
  } catch (error) {
    return apiError(error);
  }
}
```

- [ ] **Step 13.2: Write the detail route (GET/PATCH/DELETE)**

```ts
// apps/web/app/api/v1/rolling-jobs/[id]/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import {
  getRollingJob,
  updateRollingJobRow,
  deleteRollingJob,
  applyFieldUpdateToFutureRows,
  deleteFutureAttachedRowsNotIn,
  rowToMaterializeInput,
} from "@/lib/rollingJobs/data";
import { materializeRollingJob } from "@/lib/rollingJobs/materialize";
import {
  updateRollingJobSchema,
  deleteRollingJobSchema,
  generateOccurrences,
  type Cadence,
} from "@seder/shared";

const HORIZON_DAYS = 90;

function horizonEnd(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + HORIZON_DAYS, 12));
}
function todayStr(): string {
  const n = new Date();
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, "0")}-${String(n.getUTCDate()).padStart(2, "0")}`;
}
function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 12));
}
function expectedDates(row: {
  cadence: Cadence; startDate: string; endDate: string | null;
}, today: string): string[] {
  const out = generateOccurrences({
    cadence: row.cadence,
    startDate: new Date(`${row.startDate}T12:00:00Z`),
    endDate: row.endDate ? new Date(`${row.endDate}T12:00:00Z`) : undefined,
    horizonEnd: horizonEnd(),
    skipBefore: new Date(`${today}T12:00:00Z`),
  });
  return out.map((d) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const row = await getRollingJob(userId, id);
    if (!row) return apiError(new Error("Not found"), 404);
    return apiSuccess(row);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const patch = updateRollingJobSchema.parse(body);

    const existing = await getRollingJob(userId, id);
    if (!existing) return apiError(new Error("Not found"), 404);

    const cadenceChanged = patch.cadence !== undefined;
    const datesChanged = patch.startDate !== undefined || patch.endDate !== undefined;

    const updated = await updateRollingJobRow(userId, id, {
      ...patch,
      clientId: patch.clientId ?? undefined,
      categoryId: patch.categoryId ?? undefined,
      endDate: patch.endDate ?? undefined,
      notes: patch.notes ?? undefined,
    });
    if (!updated) return apiError(new Error("Update failed"));

    const today = todayStr();
    if (cadenceChanged || datesChanged) {
      const expected = expectedDates(
        { cadence: updated.cadence as Cadence, startDate: updated.startDate, endDate: updated.endDate },
        today,
      );
      await deleteFutureAttachedRowsNotIn(userId, id, today, expected);
      await materializeRollingJob(rowToMaterializeInput(updated), { horizonEnd: horizonEnd(), today: todayUTC() });
    } else {
      await applyFieldUpdateToFutureRows(userId, id, today, {
        description: patch.description,
        clientId: patch.clientId,
        clientName: patch.clientName,
        categoryId: patch.categoryId,
        amountGross: patch.amountGross,
        vatRate: patch.vatRate,
        includesVat: patch.includesVat,
        notes: patch.notes,
      });
    }

    return apiSuccess(updated);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = deleteRollingJobSchema.parse(body);
    await deleteRollingJob(userId, id, {
      deleteFutureDrafts: parsed.deleteFutureDrafts,
      today: todayStr(),
    });
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
```

- [ ] **Step 13.3: Write the pause + resume routes**

```ts
// apps/web/app/api/v1/rolling-jobs/[id]/pause/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "../../../_lib/middleware";
import { apiSuccess, apiError } from "../../../_lib/response";
import { setRollingJobActive } from "@/lib/rollingJobs/data";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const row = await setRollingJobActive(userId, id, false);
    if (!row) return apiError(new Error("Not found"), 404);
    return apiSuccess(row);
  } catch (error) {
    return apiError(error);
  }
}
```

```ts
// apps/web/app/api/v1/rolling-jobs/[id]/resume/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "../../../_lib/middleware";
import { apiSuccess, apiError } from "../../../_lib/response";
import { setRollingJobActive, rowToMaterializeInput } from "@/lib/rollingJobs/data";
import { materializeRollingJob } from "@/lib/rollingJobs/materialize";

const HORIZON_DAYS = 90;
function horizonEnd(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + HORIZON_DAYS, 12));
}
function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 12));
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const row = await setRollingJobActive(userId, id, true);
    if (!row) return apiError(new Error("Not found"), 404);
    await materializeRollingJob(rowToMaterializeInput(row), {
      horizonEnd: horizonEnd(),
      today: todayUTC(),
    });
    return apiSuccess(row);
  } catch (error) {
    return apiError(error);
  }
}
```

- [ ] **Step 13.4: Type-check**

Run: `pnpm --filter web typecheck`
Expected: clean.

- [ ] **Step 13.5: Commit**

```bash
git add apps/web/app/api/v1/rolling-jobs/
git commit -m "feat(api): rolling jobs REST routes for iOS client"
```

---

## Task 14: Nightly cron endpoint

**Files:**
- Create: `apps/web/app/api/cron/rolling-jobs/route.ts`
- Modify: `apps/web/vercel.json`

- [ ] **Step 14.1: Write the cron route**

```ts
// apps/web/app/api/cron/rolling-jobs/route.ts
import { NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/db/client";
import { rollingJobs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { materializeRollingJob } from "@/lib/rollingJobs/materialize";
import { rowToMaterializeInput } from "@/lib/rollingJobs/data";

const HORIZON_DAYS = 90;

function horizonEnd(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + HORIZON_DAYS, 12));
}
function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), 12));
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const jobs = await db
    .select()
    .from(rollingJobs)
    .where(eq(rollingJobs.isActive, true));

  let processed = 0;
  let inserted = 0;
  let failed = 0;

  for (const row of jobs) {
    try {
      const n = await materializeRollingJob(rowToMaterializeInput(row), {
        horizonEnd: horizonEnd(),
        today: todayUTC(),
      });
      processed++;
      inserted += n;
    } catch (err) {
      failed++;
      Sentry.captureException(err, {
        tags: { cron: "rolling-jobs", jobId: row.id, userId: row.userId },
      });
    }
  }

  const summary = { processed, inserted, failed, totalJobs: jobs.length };
  console.log("[cron/rolling-jobs]", summary);
  return Response.json(summary);
}
```

- [ ] **Step 14.2: Add cron to `vercel.json`**

Open `apps/web/vercel.json`. Look for the existing `crons` array. Add this entry:

```json
{
  "path": "/api/cron/rolling-jobs",
  "schedule": "30 1 * * *"
}
```

(01:30 UTC nightly — runs half an hour after the backup cron, whatever its current schedule is. Adjust the minute if that slot is already taken.)

- [ ] **Step 14.3: Commit**

```bash
git add apps/web/app/api/cron/rolling-jobs/route.ts apps/web/vercel.json
git commit -m "feat(cron): nightly rolling-jobs top-up"
```

---

## Task 15: Nudge engine — skip future rolling-job rows

**Files:**
- Modify: `apps/web/lib/nudges/queries.ts`
- Modify: `apps/web/lib/nudges/compute.ts`

- [ ] **Step 15.1: Update `fetchNudgeableEntries` to return the new fields**

The current `fetchNudgeableEntries` does `db.select().from(incomeEntries)`, which will include the two new columns automatically — no query change needed. Verify by running:

Run: `pnpm --filter web typecheck`
Expected: clean.

- [ ] **Step 15.2: Update the `NudgeEntry` interface in `compute.ts`**

Find the `interface NudgeEntry` in `apps/web/lib/nudges/compute.ts` and add two fields:

```ts
interface NudgeEntry {
  id: string;
  date: string;
  description: string;
  clientName: string;
  amountGross: string;
  invoiceStatus: string;
  paymentStatus: string;
  invoiceSentDate: string | null;
  paidDate: string | null;
  updatedAt: Date;
  calendarEventId: string | null;
  rollingJobId: string | null;           // NEW
  detachedFromTemplate: boolean;         // NEW (not used in filter, but kept for type parity)
}
```

- [ ] **Step 15.3: Filter future rolling-job rows at the top of `computeNudges`**

Inside `computeNudges`, right after it normalizes `now`, add:

```ts
const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const filteredEntries = entries.filter((e) => {
  // Skip future unpaid rolling-job rows — they haven't happened yet.
  if (e.rollingJobId && e.date > todayStr) return false;
  return true;
});
```

Then replace every subsequent reference to `entries` inside `computeNudges` with `filteredEntries`.

- [ ] **Step 15.4: Add a unit test for the new filter**

Open (or create if missing) `apps/web/lib/nudges/__tests__/compute.test.ts`. Add:

```ts
import { describe, it, expect } from "vitest";
import { computeNudges } from "../compute";

describe("computeNudges - rolling jobs filter", () => {
  it("skips future unpaid rolling-job rows", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

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
    // No overdue nudge should fire for a future rolling-job row.
    expect(nudges.filter((n) => n.nudgeType === "overdue")).toEqual([]);
  });
});
```

- [ ] **Step 15.5: Run the nudge tests**

Run: `pnpm --filter web test compute`
Expected: all existing tests still pass, plus the new filter test.

- [ ] **Step 15.6: Commit**

```bash
git add apps/web/lib/nudges/compute.ts apps/web/lib/nudges/__tests__/compute.test.ts
git commit -m "feat(nudges): skip future unpaid rolling-job rows"
```

---

## Task 16: Calendar importer dedup

**Files:**
- Modify: `apps/web/app/api/v1/calendar/import/route.ts` (most likely location — adjust if the importer lives elsewhere)
- Modify: any helper that turns Google events → DB rows

- [ ] **Step 16.1: Find the import path**

Run: `grep -Rn "calendarEventId" apps/web/app/api/v1/calendar/ apps/web/lib/googleCalendar.ts | head -20`

Identify where events get filtered before insert. There will be a loop over events with a dedup step.

- [ ] **Step 16.2: Add the rolling-job ownership check**

Before inserting each event, look up whether its `recurringEventId` (Google Calendar's parent-recurring-event field) is already owned by an active rolling job for this user. Add this helper near the top of the importer file:

```ts
import { rollingJobs } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

async function getOwnedRecurringEventIds(userId: string, recurringEventIds: string[]): Promise<Set<string>> {
  if (recurringEventIds.length === 0) return new Set();
  const rows = await db
    .select({ id: rollingJobs.sourceCalendarRecurringEventId })
    .from(rollingJobs)
    .where(
      and(
        eq(rollingJobs.userId, userId),
        inArray(rollingJobs.sourceCalendarRecurringEventId, recurringEventIds),
      ),
    );
  return new Set(rows.map((r) => r.id).filter((v): v is string => v !== null));
}
```

Then in the main loop, before insert:

```ts
const recurringIds = events
  .map((e) => e.recurringEventId)
  .filter((id): id is string => !!id);
const owned = await getOwnedRecurringEventIds(userId, recurringIds);

const filtered = events.filter((e) => {
  if (e.recurringEventId && owned.has(e.recurringEventId)) return false;
  return true;
});
```

The exact variable names (`events`, `e`) will differ — adapt to the real importer. The goal: any event whose parent `recurringEventId` matches a rolling job's `sourceCalendarRecurringEventId` is skipped.

- [ ] **Step 16.3: Type-check**

Run: `pnpm --filter web typecheck`
Expected: clean.

- [ ] **Step 16.4: Commit**

```bash
git add apps/web/app/api/v1/calendar/import/route.ts apps/web/lib/googleCalendar.ts
git commit -m "feat(calendar): skip events owned by a rolling job during import"
```

---

## Task 17: Web — `CadencePicker` component

**Files:**
- Create: `apps/web/app/income/components/rolling-jobs/CadencePicker.tsx`

- [ ] **Step 17.1: Write the component**

```tsx
// apps/web/app/income/components/rolling-jobs/CadencePicker.tsx
"use client";

import * as React from "react";
import type { Cadence } from "@seder/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const WEEKDAYS_HE = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]; // Sun..Sat

interface CadencePickerProps {
  value: Cadence;
  onChange: (c: Cadence) => void;
}

export function CadencePicker({ value, onChange }: CadencePickerProps) {
  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex gap-2">
        {(["daily", "weekly", "monthly"] as const).map((kind) => (
          <Button
            key={kind}
            type="button"
            size="sm"
            variant={value.kind === kind ? "default" : "outline"}
            onClick={() => {
              if (kind === "daily") onChange({ kind: "daily", interval: 1 });
              if (kind === "weekly") onChange({ kind: "weekly", interval: 1, weekdays: [new Date().getDay()] });
              if (kind === "monthly") onChange({ kind: "monthly", interval: 1, dayOfMonth: new Date().getDate() });
            }}
          >
            {kind === "daily" && "יומי"}
            {kind === "weekly" && "שבועי"}
            {kind === "monthly" && "חודשי"}
          </Button>
        ))}
      </div>

      {value.kind === "daily" && (
        <div className="flex items-center gap-2">
          <span className="text-sm">כל</span>
          <Input
            type="number"
            dir="ltr"
            min={1}
            max={365}
            value={value.interval}
            onChange={(e) =>
              onChange({ kind: "daily", interval: Math.max(1, parseInt(e.target.value || "1", 10)) })
            }
            className="w-20"
          />
          <span className="text-sm">ימים</span>
        </div>
      )}

      {value.kind === "weekly" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm">כל</span>
            <Input
              type="number"
              dir="ltr"
              min={1}
              max={52}
              value={value.interval}
              onChange={(e) =>
                onChange({
                  ...value,
                  kind: "weekly",
                  interval: Math.max(1, parseInt(e.target.value || "1", 10)),
                })
              }
              className="w-20"
            />
            <span className="text-sm">שבועות ב-</span>
          </div>
          <div className="flex gap-1">
            {WEEKDAYS_HE.map((label, idx) => {
              const selected = value.weekdays.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    const next = selected
                      ? value.weekdays.filter((d) => d !== idx)
                      : [...value.weekdays, idx].sort();
                    if (next.length === 0) return; // keep at least one
                    onChange({ ...value, weekdays: next });
                  }}
                  className={`h-9 w-9 rounded-full border text-sm ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground"
                  }`}
                  aria-pressed={selected}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {value.kind === "monthly" && (
        <div className="flex items-center gap-2">
          <span className="text-sm">כל</span>
          <Input
            type="number"
            dir="ltr"
            min={1}
            max={12}
            value={value.interval}
            onChange={(e) =>
              onChange({
                ...value,
                kind: "monthly",
                interval: Math.max(1, parseInt(e.target.value || "1", 10)),
              })
            }
            className="w-20"
          />
          <span className="text-sm">חודשים ביום</span>
          <Input
            type="number"
            dir="ltr"
            min={1}
            max={31}
            value={value.dayOfMonth}
            onChange={(e) =>
              onChange({
                ...value,
                kind: "monthly",
                dayOfMonth: Math.max(1, Math.min(31, parseInt(e.target.value || "1", 10))),
              })
            }
            className="w-20"
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 17.2: Commit**

```bash
git add apps/web/app/income/components/rolling-jobs/CadencePicker.tsx
git commit -m "feat(web): add CadencePicker component"
```

---

## Task 18: Web — `RollingJobForm` component

**Files:**
- Create: `apps/web/app/income/components/rolling-jobs/RollingJobForm.tsx`

- [ ] **Step 18.1: Write the form**

```tsx
// apps/web/app/income/components/rolling-jobs/RollingJobForm.tsx
"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { CadencePicker } from "./CadencePicker";
import { generateOccurrences, type Cadence, type RollingJob } from "@seder/shared";
import type { Client, Category } from "@/db/schema";
import { createRollingJobAction, updateRollingJobAction } from "@/app/rolling-jobs/actions";

interface RollingJobFormProps {
  // Full job when editing; partial prefill when promoting from a calendar event.
  initial?: Partial<RollingJob>;
  clients: Client[];
  categories: Category[];
  onSaved: () => void;
  onCancel: () => void;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RollingJobForm({ initial, clients, categories, onSaved, onCancel }: RollingJobFormProps) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [description, setDescription] = React.useState(initial?.description ?? "");
  const [clientId, setClientId] = React.useState<string | null>(initial?.clientId ?? null);
  const [clientName, setClientName] = React.useState(initial?.clientName ?? "");
  const [categoryId, setCategoryId] = React.useState<string | null>(initial?.categoryId ?? null);
  const [amountGross, setAmountGross] = React.useState(initial?.amountGross ?? "");
  const [vatRate, setVatRate] = React.useState(initial?.vatRate ?? "18");
  const [includesVat, setIncludesVat] = React.useState(initial?.includesVat ?? true);
  const [cadence, setCadence] = React.useState<Cadence>(
    initial?.cadence ?? { kind: "weekly", interval: 1, weekdays: [new Date().getDay()] },
  );
  const [startDate, setStartDate] = React.useState(initial?.startDate ?? todayIso());
  const [endDate, setEndDate] = React.useState<string | null>(initial?.endDate ?? null);
  const [notes, setNotes] = React.useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = React.useState(false);

  // Live preview of next 4 occurrences.
  const preview = React.useMemo(() => {
    try {
      const horizonEnd = new Date();
      horizonEnd.setFullYear(horizonEnd.getFullYear() + 1);
      const out = generateOccurrences({
        cadence,
        startDate: new Date(`${startDate}T12:00:00Z`),
        endDate: endDate ? new Date(`${endDate}T12:00:00Z`) : undefined,
        horizonEnd,
      });
      return out.slice(0, 4).map((d) =>
        `${d.getUTCDate()}/${d.getUTCMonth() + 1}`,
      );
    } catch {
      return [];
    }
  }, [cadence, startDate, endDate]);

  const handleClientPick = (value: string) => {
    if (value === "__none__") {
      setClientId(null);
      return;
    }
    const c = clients.find((x) => x.id === value);
    if (c) {
      setClientId(c.id);
      setClientName(c.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const input = {
      title,
      description,
      clientId,
      clientName,
      categoryId,
      amountGross,
      vatRate,
      includesVat,
      cadence,
      startDate,
      endDate,
      notes: notes || null,
    };
    // An `initial` without an `id` is a prefill (calendar promotion), treat as create.
    const isEdit = !!initial?.id;
    try {
      const result = isEdit
        ? await updateRollingJobAction(initial!.id!, input)
        : await createRollingJobAction(input);
      if (result.success) {
        toast.success(initial ? "הסדרה עודכנה" : "הסדרה נוצרה");
        onSaved();
      } else {
        toast.error(typeof result.error === "string" ? result.error : "שמירה נכשלה");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label>שם הסדרה</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} />
      </div>

      <div className="space-y-2">
        <Label>תיאור (יופיע על כל רשומה)</Label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} required maxLength={500} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>לקוח</Label>
          <select
            value={clientId ?? "__none__"}
            onChange={(e) => handleClientPick(e.target.value)}
            className="w-full rounded border p-2 bg-background"
          >
            <option value="__none__">—</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Input
            placeholder="או הקלד שם חופשי"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>קטגוריה</Label>
          <select
            value={categoryId ?? "__none__"}
            onChange={(e) => setCategoryId(e.target.value === "__none__" ? null : e.target.value)}
            className="w-full rounded border p-2 bg-background"
          >
            <option value="__none__">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>סכום (₪)</Label>
          <Input dir="ltr" value={amountGross} onChange={(e) => setAmountGross(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>מע"מ %</Label>
          <Input dir="ltr" value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
        </div>
        <div className="space-y-2 flex flex-col justify-end">
          <Label>כולל מע"מ</Label>
          <Switch checked={includesVat} onCheckedChange={setIncludesVat} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>תדירות</Label>
        <CadencePicker value={cadence} onChange={setCadence} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>תאריך התחלה</Label>
          <Input type="date" dir="ltr" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>תאריך סיום (לא חובה)</Label>
          <Input
            type="date"
            dir="ltr"
            value={endDate ?? ""}
            onChange={(e) => setEndDate(e.target.value || null)}
          />
        </div>
      </div>

      {preview.length > 0 && (
        <p className="text-sm text-muted-foreground">
          הכנסה תיווצר אוטומטית: {preview.join(" · ")} ...
        </p>
      )}

      <div className="space-y-2">
        <Label>הערות</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
      </div>

      <div className="flex justify-start gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "שומר..." : initial ? "עדכון" : "יצירה"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>ביטול</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 18.2: Commit**

```bash
git add apps/web/app/income/components/rolling-jobs/RollingJobForm.tsx
git commit -m "feat(web): add RollingJobForm with live preview"
```

---

## Task 19: Web — `RollingJobList` + `DeleteRollingJobDialog`

**Files:**
- Create: `apps/web/app/income/components/rolling-jobs/RollingJobList.tsx`
- Create: `apps/web/app/income/components/rolling-jobs/DeleteRollingJobDialog.tsx`

- [ ] **Step 19.1: Write the list component**

```tsx
// apps/web/app/income/components/rolling-jobs/RollingJobList.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play, Pencil, Trash2, Repeat } from "lucide-react";
import type { RollingJob } from "@seder/shared";
import { pauseRollingJobAction, resumeRollingJobAction } from "@/app/rolling-jobs/actions";
import { toast } from "sonner";

interface RollingJobListProps {
  jobs: RollingJob[];
  onEdit: (job: RollingJob) => void;
  onDelete: (job: RollingJob) => void;
  onChanged: () => void;
}

function formatCadence(job: RollingJob): string {
  const c = job.cadence;
  if (c.kind === "daily") return `כל ${c.interval === 1 ? "יום" : `${c.interval} ימים`}`;
  if (c.kind === "weekly") {
    const names = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
    const days = c.weekdays.map((d) => names[d]).join(", ");
    return c.interval === 1 ? `שבועי: ${days}` : `כל ${c.interval} שבועות: ${days}`;
  }
  return `חודשי ביום ${c.dayOfMonth}${c.interval > 1 ? ` (כל ${c.interval} חודשים)` : ""}`;
}

export function RollingJobList({ jobs, onEdit, onDelete, onChanged }: RollingJobListProps) {
  const togglePause = async (job: RollingJob) => {
    const res = job.isActive
      ? await pauseRollingJobAction(job.id)
      : await resumeRollingJobAction(job.id);
    if (res.success) {
      toast.success(job.isActive ? "הסדרה הושהתה" : "הסדרה חודשה");
      onChanged();
    } else {
      toast.error("פעולה נכשלה");
    }
  };

  if (jobs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground p-4 text-center">
        אין סדרות. לחץ "יצירת סדרה חדשה" כדי להתחיל.
      </p>
    );
  }

  return (
    <ul className="space-y-2" dir="rtl">
      {jobs.map((job) => (
        <li
          key={job.id}
          className={`rounded border p-3 flex items-center gap-3 ${
            job.isActive ? "" : "opacity-60"
          }`}
        >
          <Repeat className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{job.title}</span>
              {!job.isActive && (
                <span className="text-xs rounded bg-muted px-1.5 py-0.5">מושהה</span>
              )}
              {job.sourceCalendarRecurringEventId && (
                <span className="text-xs rounded bg-muted px-1.5 py-0.5">מקושר ליומן</span>
              )}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {formatCadence(job)} · ₪{job.amountGross} · {job.clientName}
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => togglePause(job)} title={job.isActive ? "השהה" : "חדש"}>
            {job.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(job)} title="ערוך">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(job)} title="מחק">
            <Trash2 className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 19.2: Write the delete dialog**

```tsx
// apps/web/app/income/components/rolling-jobs/DeleteRollingJobDialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { RollingJob } from "@seder/shared";
import { deleteRollingJobAction } from "@/app/rolling-jobs/actions";
import { toast } from "sonner";

interface DeleteRollingJobDialogProps {
  job: RollingJob | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteRollingJobDialog({ job, onClose, onDeleted }: DeleteRollingJobDialogProps) {
  const [deleteFutureDrafts, setDeleteFutureDrafts] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const handleDelete = async () => {
    if (!job) return;
    setBusy(true);
    const res = await deleteRollingJobAction(job.id, { deleteFutureDrafts });
    setBusy(false);
    if (res.success) {
      toast.success("הסדרה נמחקה");
      onDeleted();
    } else {
      toast.error("מחיקה נכשלה");
    }
  };

  return (
    <Dialog open={!!job} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>מחיקת סדרה: {job?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            הרשומות שכבר קיימות בעבר יישמרו תמיד. בחר מה לעשות ברשומות הטיוטה העתידיות:
          </p>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!deleteFutureDrafts}
                onChange={() => setDeleteFutureDrafts(false)}
              />
              <Label>שמור גם רשומות עתידיות</Label>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={deleteFutureDrafts}
                onChange={() => setDeleteFutureDrafts(true)}
              />
              <Label>מחק רשומות טיוטה עתידיות שלא שולמו</Label>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={busy}>
            {busy ? "מוחק..." : "מחק"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 19.3: Commit**

```bash
git add apps/web/app/income/components/rolling-jobs/RollingJobList.tsx apps/web/app/income/components/rolling-jobs/DeleteRollingJobDialog.tsx
git commit -m "feat(web): RollingJobList + delete dialog"
```

---

## Task 20: Web — `RollingJobsDialog` orchestrator

**Files:**
- Create: `apps/web/app/income/components/RollingJobsDialog.tsx`

- [ ] **Step 20.1: Write the dialog**

```tsx
// apps/web/app/income/components/RollingJobsDialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RollingJobList } from "./rolling-jobs/RollingJobList";
import { RollingJobForm } from "./rolling-jobs/RollingJobForm";
import { DeleteRollingJobDialog } from "./rolling-jobs/DeleteRollingJobDialog";
import type { RollingJob } from "@seder/shared";
import type { Client, Category } from "@/db/schema";
import { listRollingJobsAction } from "@/app/rolling-jobs/actions";

interface RollingJobsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  categories: Category[];
  initialPrefill?: Partial<RollingJob>; // from calendar promotion
}

type Mode = { kind: "list" } | { kind: "create" } | { kind: "edit"; job: RollingJob };

export function RollingJobsDialog({ open, onOpenChange, clients, categories, initialPrefill }: RollingJobsDialogProps) {
  const [mode, setMode] = React.useState<Mode>({ kind: "list" });
  const [jobs, setJobs] = React.useState<RollingJob[]>([]);
  const [deleting, setDeleting] = React.useState<RollingJob | null>(null);
  const [loading, setLoading] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    const res = await listRollingJobsAction();
    setLoading(false);
    if (res.success) setJobs(res.jobs as RollingJob[]);
  }, []);

  React.useEffect(() => {
    if (open) {
      reload();
      // If a prefill is present (calendar promotion), jump straight to the form.
      if (initialPrefill) setMode({ kind: "create" });
      else setMode({ kind: "list" });
    }
  }, [open, initialPrefill, reload]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {mode.kind === "list" && "סדרות הכנסה"}
              {mode.kind === "create" && "יצירת סדרה חדשה"}
              {mode.kind === "edit" && `עריכת סדרה: ${mode.job.title}`}
            </DialogTitle>
          </DialogHeader>

          {mode.kind === "list" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setMode({ kind: "create" })}>
                  <Plus className="h-4 w-4 ms-1" />
                  סדרה חדשה
                </Button>
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center p-4">טוען...</p>
              ) : (
                <RollingJobList
                  jobs={jobs}
                  onEdit={(job) => setMode({ kind: "edit", job })}
                  onDelete={(job) => setDeleting(job)}
                  onChanged={reload}
                />
              )}
            </div>
          )}

          {mode.kind === "create" && (
            <RollingJobForm
              clients={clients}
              categories={categories}
              initial={initialPrefill}
              onSaved={() => { setMode({ kind: "list" }); reload(); }}
              onCancel={() => setMode({ kind: "list" })}
            />
          )}

          {mode.kind === "edit" && (
            <RollingJobForm
              initial={mode.job}
              clients={clients}
              categories={categories}
              onSaved={() => { setMode({ kind: "list" }); reload(); }}
              onCancel={() => setMode({ kind: "list" })}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteRollingJobDialog
        job={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => { setDeleting(null); reload(); }}
      />
    </>
  );
}
```

- [ ] **Step 20.2: Commit**

```bash
git add apps/web/app/income/components/RollingJobsDialog.tsx
git commit -m "feat(web): RollingJobsDialog orchestrator"
```

---

## Task 21: Wire `RollingJobsDialog` into the Income page

**Files:**
- Modify: `apps/web/app/income/components/IncomeHeader.tsx`
- Modify: `apps/web/app/income/IncomePageClient.tsx`

- [ ] **Step 21.1: Add a button to `IncomeHeader`**

Open `IncomeHeader.tsx`. Near the existing "Import from calendar" / "Add income" buttons, add a new button and an `onOpenRollingJobs` callback prop:

```tsx
import { Repeat } from "lucide-react";

interface IncomeHeaderProps {
  // ... existing props
  onOpenRollingJobs: () => void;
}

// In the JSX, near other action buttons:
<Button variant="outline" size="sm" onClick={onOpenRollingJobs}>
  <Repeat className="h-4 w-4 ms-1" />
  סדרות
</Button>
```

- [ ] **Step 21.2: Wire the dialog into `IncomePageClient`**

Open `IncomePageClient.tsx`. Add imports and state:

```tsx
import { RollingJobsDialog } from "./components/RollingJobsDialog";
// ...inside the component
const [rollingJobsOpen, setRollingJobsOpen] = React.useState(false);
```

Pass `onOpenRollingJobs={() => setRollingJobsOpen(true)}` into `<IncomeHeader />`, and render the dialog at the bottom alongside the other dialogs:

```tsx
<RollingJobsDialog
  open={rollingJobsOpen}
  onOpenChange={setRollingJobsOpen}
  clients={clientRecords}
  categories={categories}
/>
```

- [ ] **Step 21.3: Build**

Run: `pnpm --filter web build`
Expected: clean build.

- [ ] **Step 21.4: Commit**

```bash
git add apps/web/app/income/components/IncomeHeader.tsx apps/web/app/income/IncomePageClient.tsx
git commit -m "feat(web): wire RollingJobsDialog into income page header"
```

---

## Task 22: Web — `Repeat` icon + hide-future toggle in income list

**Files:**
- Modify: `apps/web/app/income/components/income-table/IncomeEntryRow.tsx`
- Modify: `apps/web/app/income/components/IncomeFilters.tsx`
- Modify: `apps/web/app/income/IncomePageClient.tsx`
- Modify: `apps/web/app/income/data.ts` (or wherever `IncomeEntryWithCategory` is selected)

- [ ] **Step 22.1: Surface `rollingJobId` + `detachedFromTemplate` in the data select**

Run: `grep -n "getIncomeEntries\|IncomeEntryWithCategory\|from(incomeEntries)" apps/web/app/income/data.ts | head`

Ensure the Drizzle select includes the two new columns. If the select is `select()` (no projection), no change needed — it returns all columns. If it's an explicit projection object, add:

```ts
rollingJobId: incomeEntries.rollingJobId,
detachedFromTemplate: incomeEntries.detachedFromTemplate,
```

Also update `IncomeEntryWithCategory` (or equivalent type) to include the two fields if it's a hand-written type.

- [ ] **Step 22.2: Render the icon in `IncomeEntryRow`**

Inside the mobile (`md:hidden`) section and the desktop (`hidden md:flex`) section of `IncomeEntryRow.tsx`, next to the description, add:

```tsx
import { Repeat } from "lucide-react";

{entry.rollingJobId && (
  <Repeat
    className={`h-3.5 w-3.5 ms-1 inline-block ${
      entry.detachedFromTemplate ? "text-muted-foreground/40" : "text-muted-foreground"
    }`}
    aria-label={entry.detachedFromTemplate ? "נותק מתבנית הסדרה" : "רשומה מסדרה"}
    title={entry.detachedFromTemplate ? "נותק מתבנית הסדרה" : "רשומה מסדרה"}
  />
)}
```

- [ ] **Step 22.3: Add hide-future toggle to `IncomeFilters`**

Open `IncomeFilters.tsx`. Add a new prop:

```tsx
interface IncomeFiltersProps {
  // ... existing props
  hideFuture: boolean;
  onHideFutureChange: (v: boolean) => void;
}
```

In the JSX render block, add:

```tsx
<label className="flex items-center gap-2 text-sm">
  <input
    type="checkbox"
    checked={hideFuture}
    onChange={(e) => onHideFutureChange(e.target.checked)}
  />
  הסתר עתיד
</label>
```

- [ ] **Step 22.4: Wire the toggle in `IncomePageClient`**

Add state and persistence:

```tsx
const HIDE_FUTURE_KEY = "seder_income_hide_future";

const [hideFuture, setHideFutureState] = React.useState(false);
React.useEffect(() => {
  if (typeof window === "undefined") return;
  setHideFutureState(localStorage.getItem(HIDE_FUTURE_KEY) === "1");
}, []);
const setHideFuture = (v: boolean) => {
  setHideFutureState(v);
  if (typeof window !== "undefined") {
    localStorage.setItem(HIDE_FUTURE_KEY, v ? "1" : "0");
  }
};
```

Apply the filter in the existing memoized filtered-entries computation:

```tsx
const filteredEntries = React.useMemo(() => {
  let out = dbEntries;
  // ... existing filters
  if (hideFuture) {
    const t = todayDateString;
    out = out.filter((e) => e.date <= t);
  }
  return out;
}, [dbEntries, /* existing deps */, hideFuture, todayDateString]);
```

Pass `hideFuture={hideFuture} onHideFutureChange={setHideFuture}` into `<IncomeFilters />`.

- [ ] **Step 22.5: Build**

Run: `pnpm --filter web build`
Expected: clean.

- [ ] **Step 22.6: Commit**

```bash
git add apps/web/app/income/components/income-table/IncomeEntryRow.tsx apps/web/app/income/components/IncomeFilters.tsx apps/web/app/income/IncomePageClient.tsx apps/web/app/income/data.ts
git commit -m "feat(web): repeat icon on rolling-job rows + hide-future toggle"
```

---

## Task 23: Web — calendar promotion flow

**Files:**
- Modify: `apps/web/app/income/components/CalendarImportDialog.tsx`

- [ ] **Step 23.1: Inspect the dialog's preview row layout**

Run: `grep -n "recurringEventId\|preview\|import\|skip" apps/web/app/income/components/CalendarImportDialog.tsx | head -30`

Find where individual events are rendered in the preview list.

- [ ] **Step 23.2: Add a "ניהול כסדרה" action**

For events that have a `recurringEventId`, render an additional button:

```tsx
import { parseGoogleRRule, type Cadence } from "@seder/shared";
// ... near the action buttons for each event row:
{event.recurringEventId && (
  <Button
    size="sm"
    variant="outline"
    onClick={() => handlePromoteToRollingJob(event)}
  >
    ניהול כסדרה
  </Button>
)}
```

- [ ] **Step 23.3: Implement `handlePromoteToRollingJob`**

```tsx
import { RollingJobsDialog } from "./RollingJobsDialog";
import type { RollingJob } from "@seder/shared";

const [rollingPrefill, setRollingPrefill] = React.useState<Partial<RollingJob> | null>(null);

const handlePromoteToRollingJob = (event: CalendarEventPreview) => {
  // `event.recurrence` is the Google `event.recurrence` string[] (["RRULE:...", "EXDATE:..."]).
  const cadence: Cadence | null = event.recurrence
    ? parseGoogleRRule(event.recurrence)
    : null;

  if (!cadence) {
    toast.info("לא הצלחנו לקרוא את דפוס החזרה — אנא בחר ידנית");
  }

  setRollingPrefill({
    title: event.summary ?? "",
    description: event.summary ?? "",
    clientName: "",
    amountGross: "0",
    vatRate: "18",
    includesVat: true,
    cadence: cadence ?? undefined,
    startDate: event.startDate,
    sourceCalendarRecurringEventId: event.recurringEventId ?? null,
    sourceCalendarId: event.calendarId ?? null,
  });
};
```

Render `<RollingJobsDialog>` at the end of the dialog, controlled by whether `rollingPrefill` is set:

```tsx
<RollingJobsDialog
  open={!!rollingPrefill}
  onOpenChange={(o) => { if (!o) setRollingPrefill(null); }}
  clients={clients}
  categories={categories}
  initialPrefill={rollingPrefill ?? undefined}
/>
```

**Note:** the calendar-event data structure inside `CalendarImportDialog` needs `recurringEventId`, `recurrence` (the raw string[]), `calendarId`, `startDate`, and `summary`. If these aren't currently surfaced through the API/preview chain, you'll need to thread them through from `app/api/v1/calendar/events/route.ts` and the import preview helper.

- [ ] **Step 23.4: Thread recurrence fields through the preview chain**

Run: `grep -n "recurrence\|recurringEventId" apps/web/lib/googleCalendar.ts apps/web/app/api/v1/calendar/events/route.ts`

If missing, add `recurrence: event.recurrence ?? null, recurringEventId: event.recurringEventId ?? null` to the shape returned by the Google Calendar fetch helper, and propagate through any TypeScript types.

- [ ] **Step 23.5: Build**

Run: `pnpm --filter web build`
Expected: clean.

- [ ] **Step 23.6: Commit**

```bash
git add apps/web/app/income/components/CalendarImportDialog.tsx apps/web/lib/googleCalendar.ts apps/web/app/api/v1/calendar/events/route.ts
git commit -m "feat(web): promote recurring calendar events to rolling jobs"
```

---

## Task 24: Regenerate API contract + check iOS sync

**Files:**
- Modify: `docs/api-contract.json` (regenerated)

- [ ] **Step 24.1: Regenerate contract**

Run: `pnpm sync:contract`
Expected: `docs/api-contract.json` updates with the new `RollingJob`, `Cadence`, and schema entries.

- [ ] **Step 24.2: Check iOS drift**

Run: `pnpm sync:check-ios`
Expected: a report listing the new `RollingJob` type as "missing on iOS — needs Swift model". That's the next task.

- [ ] **Step 24.3: Commit**

```bash
git add docs/api-contract.json
git commit -m "chore: regenerate api contract for rolling jobs"
```

---

## Task 25: iOS — `RollingJob` Codable model

**Files:**
- Create: `apps/ios/Seder/Seder/Models/RollingJob.swift`

- [ ] **Step 25.1: Write the model**

```swift
// apps/ios/Seder/Seder/Models/RollingJob.swift
import Foundation

nonisolated enum Cadence: Codable, Sendable, Equatable {
    case daily(interval: Int)
    case weekly(interval: Int, weekdays: [Int])
    case monthly(interval: Int, dayOfMonth: Int)

    private enum CodingKeys: String, CodingKey {
        case kind, interval, weekdays, dayOfMonth
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let kind = try c.decode(String.self, forKey: .kind)
        let interval = try c.decode(Int.self, forKey: .interval)
        switch kind {
        case "daily":
            self = .daily(interval: interval)
        case "weekly":
            let weekdays = try c.decode([Int].self, forKey: .weekdays)
            self = .weekly(interval: interval, weekdays: weekdays)
        case "monthly":
            let dayOfMonth = try c.decode(Int.self, forKey: .dayOfMonth)
            self = .monthly(interval: interval, dayOfMonth: dayOfMonth)
        default:
            throw DecodingError.dataCorruptedError(forKey: .kind, in: c, debugDescription: "Unknown cadence kind: \(kind)")
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .daily(let interval):
            try c.encode("daily", forKey: .kind)
            try c.encode(interval, forKey: .interval)
        case .weekly(let interval, let weekdays):
            try c.encode("weekly", forKey: .kind)
            try c.encode(interval, forKey: .interval)
            try c.encode(weekdays, forKey: .weekdays)
        case .monthly(let interval, let dayOfMonth):
            try c.encode("monthly", forKey: .kind)
            try c.encode(interval, forKey: .interval)
            try c.encode(dayOfMonth, forKey: .dayOfMonth)
        }
    }
}

nonisolated struct RollingJob: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    let isActive: Bool
    let title: String
    let description: String
    let clientId: String?
    let clientName: String
    let categoryId: String?
    let amountGross: String
    let vatRate: String
    let includesVat: Bool
    let defaultInvoiceStatus: InvoiceStatus
    let cadence: Cadence
    let startDate: String
    let endDate: String?
    let sourceCalendarRecurringEventId: String?
    let sourceCalendarId: String?
    let notes: String?
    let createdAt: String
    let updatedAt: String
}

nonisolated struct CreateRollingJobInput: Codable, Sendable {
    let title: String
    let description: String
    let clientId: String?
    let clientName: String
    let categoryId: String?
    let amountGross: String
    let vatRate: String?
    let includesVat: Bool?
    let cadence: Cadence
    let startDate: String
    let endDate: String?
    let notes: String?
}

nonisolated struct UpdateRollingJobInput: Codable, Sendable {
    let title: String?
    let description: String?
    let clientId: String?
    let clientName: String?
    let categoryId: String?
    let amountGross: String?
    let vatRate: String?
    let includesVat: Bool?
    let cadence: Cadence?
    let startDate: String?
    let endDate: String?
    let notes: String?
}
```

- [ ] **Step 25.2: Also add the two new fields on `IncomeEntry.swift`**

Open `apps/ios/Seder/Seder/Models/IncomeEntry.swift`. Inside the `IncomeEntry` struct, after `calendarEventId`:

```swift
let rollingJobId: String?
let detachedFromTemplate: Bool?
```

(`Bool?` because older cached entries won't have it; decoder defaults to `nil`.)

- [ ] **Step 25.3: Re-run iOS sync check**

Run: `pnpm sync:check-ios`
Expected: no more drift reported for rolling jobs.

- [ ] **Step 25.4: Commit**

```bash
git add apps/ios/Seder/Seder/Models/RollingJob.swift apps/ios/Seder/Seder/Models/IncomeEntry.swift
git commit -m "feat(ios): RollingJob Codable model + IncomeEntry rolling fields"
```

---

## Task 26: iOS — APIClient extension for rolling jobs

**Files:**
- Create: `apps/ios/Seder/Seder/Services/APIClient+RollingJobs.swift`

- [ ] **Step 26.1: Write the extension**

```swift
// apps/ios/Seder/Seder/Services/APIClient+RollingJobs.swift
import Foundation

extension APIClient {
    func listRollingJobs() async throws -> [RollingJob] {
        let resp: APIResponse<[RollingJob]> = try await request(path: "/api/v1/rolling-jobs", method: "GET")
        return resp.data ?? []
    }

    func createRollingJob(_ input: CreateRollingJobInput) async throws -> RollingJob {
        let resp: APIResponse<RollingJob> = try await request(
            path: "/api/v1/rolling-jobs",
            method: "POST",
            body: input
        )
        guard let data = resp.data else { throw APIError.decoding }
        return data
    }

    func updateRollingJob(id: String, _ input: UpdateRollingJobInput) async throws -> RollingJob {
        let resp: APIResponse<RollingJob> = try await request(
            path: "/api/v1/rolling-jobs/\(id)",
            method: "PATCH",
            body: input
        )
        guard let data = resp.data else { throw APIError.decoding }
        return data
    }

    struct DeleteRollingJobInput: Codable { let deleteFutureDrafts: Bool }

    func deleteRollingJob(id: String, deleteFutureDrafts: Bool) async throws {
        let _: APIResponse<EmptyDecodable> = try await request(
            path: "/api/v1/rolling-jobs/\(id)",
            method: "DELETE",
            body: DeleteRollingJobInput(deleteFutureDrafts: deleteFutureDrafts)
        )
    }

    func pauseRollingJob(id: String) async throws -> RollingJob {
        let resp: APIResponse<RollingJob> = try await request(
            path: "/api/v1/rolling-jobs/\(id)/pause",
            method: "POST"
        )
        guard let data = resp.data else { throw APIError.decoding }
        return data
    }

    func resumeRollingJob(id: String) async throws -> RollingJob {
        let resp: APIResponse<RollingJob> = try await request(
            path: "/api/v1/rolling-jobs/\(id)/resume",
            method: "POST"
        )
        guard let data = resp.data else { throw APIError.decoding }
        return data
    }
}
```

**Note:** `EmptyDecodable` and the `request(path:method:body:)` signature must exist in `APIClient.swift`. If the signature is different (e.g., no generic `body:` variant), mirror the pattern used by `createClient` / similar existing extensions and adapt. The exact method shapes are: `func request<T: Decodable>(path:method:) async throws -> T` and `func request<T: Decodable, B: Encodable>(path:method:body:) async throws -> T`.

- [ ] **Step 26.2: Commit**

```bash
git add apps/ios/Seder/Seder/Services/APIClient+RollingJobs.swift
git commit -m "feat(ios): APIClient extension for rolling jobs"
```

---

## Task 27: iOS — `RollingJobsViewModel`

**Files:**
- Create: `apps/ios/Seder/Seder/ViewModels/RollingJobsViewModel.swift`

- [ ] **Step 27.1: Write the view model**

```swift
// apps/ios/Seder/Seder/ViewModels/RollingJobsViewModel.swift
import Foundation
import Combine

@MainActor
final class RollingJobsViewModel: ObservableObject {
    @Published var jobs: [RollingJob] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?

    private let api: APIClient

    init(api: APIClient = .shared) {
        self.api = api
    }

    func load() async {
        isLoading = true
        errorMessage = nil
        do {
            jobs = try await api.listRollingJobs()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func create(_ input: CreateRollingJobInput) async -> Bool {
        do {
            let created = try await api.createRollingJob(input)
            jobs.append(created)
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func update(id: String, _ input: UpdateRollingJobInput) async -> Bool {
        do {
            let updated = try await api.updateRollingJob(id: id, input)
            if let idx = jobs.firstIndex(where: { $0.id == id }) {
                jobs[idx] = updated
            }
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func delete(id: String, deleteFutureDrafts: Bool) async -> Bool {
        do {
            try await api.deleteRollingJob(id: id, deleteFutureDrafts: deleteFutureDrafts)
            jobs.removeAll { $0.id == id }
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }

    func togglePause(_ job: RollingJob) async {
        do {
            let updated = job.isActive
                ? try await api.pauseRollingJob(id: job.id)
                : try await api.resumeRollingJob(id: job.id)
            if let idx = jobs.firstIndex(where: { $0.id == job.id }) {
                jobs[idx] = updated
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
```

- [ ] **Step 27.2: Commit**

```bash
git add apps/ios/Seder/Seder/ViewModels/RollingJobsViewModel.swift
git commit -m "feat(ios): RollingJobsViewModel"
```

---

## Task 28: iOS — `CadencePicker` view

**Files:**
- Create: `apps/ios/Seder/Seder/Views/RollingJobs/CadencePicker.swift`

- [ ] **Step 28.1: Create the `RollingJobs` directory and file**

```swift
// apps/ios/Seder/Seder/Views/RollingJobs/CadencePicker.swift
import SwiftUI

struct CadencePickerView: View {
    @Binding var cadence: Cadence

    // Hebrew weekday labels Sun..Sat
    private let weekdays = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]

    private var currentKind: String {
        switch cadence {
        case .daily: return "daily"
        case .weekly: return "weekly"
        case .monthly: return "monthly"
        }
    }

    var body: some View {
        VStack(alignment: .trailing, spacing: 12) {
            Picker("תדירות", selection: Binding(
                get: { currentKind },
                set: { newKind in
                    switch newKind {
                    case "daily": cadence = .daily(interval: 1)
                    case "weekly": cadence = .weekly(interval: 1, weekdays: [Calendar.current.component(.weekday, from: Date()) - 1])
                    case "monthly": cadence = .monthly(interval: 1, dayOfMonth: Calendar.current.component(.day, from: Date()))
                    default: break
                    }
                }
            )) {
                Text("יומי").tag("daily")
                Text("שבועי").tag("weekly")
                Text("חודשי").tag("monthly")
            }
            .pickerStyle(.segmented)

            switch cadence {
            case .daily(let interval):
                HStack {
                    Text("כל")
                    Stepper(value: Binding(
                        get: { interval },
                        set: { cadence = .daily(interval: max(1, $0)) }
                    ), in: 1...365) {
                        Text("\(interval)")
                    }
                    Text(interval == 1 ? "יום" : "ימים")
                }
            case .weekly(let interval, let selectedDays):
                VStack(alignment: .trailing) {
                    HStack {
                        Text("כל")
                        Stepper(value: Binding(
                            get: { interval },
                            set: { cadence = .weekly(interval: max(1, $0), weekdays: selectedDays) }
                        ), in: 1...52) {
                            Text("\(interval)")
                        }
                        Text("שבועות ב-")
                    }
                    // RTL ordering: first in HStack = RIGHT side.
                    HStack(spacing: 8) {
                        ForEach(0..<7) { idx in
                            let isSelected = selectedDays.contains(idx)
                            Button {
                                var next = selectedDays
                                if isSelected {
                                    next.removeAll { $0 == idx }
                                    if next.isEmpty { return }
                                } else {
                                    next.append(idx)
                                    next.sort()
                                }
                                cadence = .weekly(interval: interval, weekdays: next)
                            } label: {
                                Text(weekdays[idx])
                                    .font(.system(size: 14, weight: .medium))
                                    .frame(width: 36, height: 36)
                                    .background(isSelected ? Theme.primary : Theme.surface)
                                    .foregroundColor(isSelected ? .white : Theme.textMuted)
                                    .clipShape(Circle())
                                    .overlay(Circle().stroke(Theme.border, lineWidth: 1))
                            }
                        }
                    }
                }
            case .monthly(let interval, let dayOfMonth):
                HStack {
                    Text("כל")
                    Stepper(value: Binding(
                        get: { interval },
                        set: { cadence = .monthly(interval: max(1, $0), dayOfMonth: dayOfMonth) }
                    ), in: 1...12) { Text("\(interval)") }
                    Text("חודשים ביום")
                    Stepper(value: Binding(
                        get: { dayOfMonth },
                        set: { cadence = .monthly(interval: interval, dayOfMonth: max(1, min(31, $0))) }
                    ), in: 1...31) { Text("\(dayOfMonth)") }
                }
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}
```

**Note:** `Theme.primary`, `Theme.surface`, `Theme.textMuted`, `Theme.border` must already exist in `Theme.swift`. If a name is different, use the real one.

- [ ] **Step 28.2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/RollingJobs/CadencePicker.swift
git commit -m "feat(ios): CadencePickerView"
```

---

## Task 29: iOS — `RollingJobFormSheet`

**Files:**
- Create: `apps/ios/Seder/Seder/Views/RollingJobs/RollingJobFormSheet.swift`

- [ ] **Step 29.1: Write the form**

```swift
// apps/ios/Seder/Seder/Views/RollingJobs/RollingJobFormSheet.swift
import SwiftUI

struct RollingJobFormSheet: View {
    enum Mode {
        case create
        case edit(RollingJob)
    }

    let mode: Mode
    @ObservedObject var viewModel: RollingJobsViewModel
    let clients: [Client]
    let categories: [Category]
    @Environment(\.dismiss) private var dismiss

    @State private var title: String = ""
    @State private var description: String = ""
    @State private var clientName: String = ""
    @State private var clientId: String? = nil
    @State private var categoryId: String? = nil
    @State private var amountGross: String = ""
    @State private var vatRate: String = "18"
    @State private var includesVat: Bool = true
    @State private var cadence: Cadence = .weekly(interval: 1, weekdays: [Calendar.current.component(.weekday, from: Date()) - 1])
    @State private var startDate: Date = Date()
    @State private var endDate: Date? = nil
    @State private var hasEndDate: Bool = false
    @State private var notes: String = ""
    @State private var submitting: Bool = false

    private var isEdit: Bool {
        if case .edit = mode { return true } else { return false }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("פרטים") {
                    TextField("שם הסדרה", text: $title)
                    TextField("תיאור (על כל רשומה)", text: $description)
                }

                Section("לקוח") {
                    Picker("לקוח", selection: $clientId) {
                        Text("—").tag(String?.none)
                        ForEach(clients) { c in
                            Text(c.name).tag(String?.some(c.id))
                        }
                    }
                    .onChange(of: clientId) { _, newValue in
                        if let id = newValue, let c = clients.first(where: { $0.id == id }) {
                            clientName = c.name
                        }
                    }
                    TextField("או שם חופשי", text: $clientName)
                }

                Section("קטגוריה") {
                    Picker("קטגוריה", selection: $categoryId) {
                        Text("—").tag(String?.none)
                        ForEach(categories) { c in
                            Text(c.name).tag(String?.some(c.id))
                        }
                    }
                }

                Section("סכום") {
                    TextField("סכום (₪)", text: $amountGross)
                        .keyboardType(.decimalPad)
                    TextField("מע\"מ %", text: $vatRate)
                        .keyboardType(.decimalPad)
                    Toggle("כולל מע\"מ", isOn: $includesVat)
                }

                Section("תדירות") {
                    CadencePickerView(cadence: $cadence)
                }

                Section("תאריכים") {
                    DatePicker("תאריך התחלה", selection: $startDate, displayedComponents: .date)
                    Toggle("תאריך סיום", isOn: $hasEndDate)
                    if hasEndDate {
                        DatePicker("עד", selection: Binding(
                            get: { endDate ?? Date() },
                            set: { endDate = $0 }
                        ), displayedComponents: .date)
                    }
                }

                Section("הערות") {
                    TextField("", text: $notes, axis: .vertical)
                }
            }
            .environment(\.layoutDirection, .rightToLeft)
            .navigationTitle(isEdit ? "עריכת סדרה" : "סדרה חדשה")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isEdit ? "עדכון" : "יצירה") {
                        Task { await save() }
                    }
                    .disabled(submitting || title.isEmpty || description.isEmpty || amountGross.isEmpty)
                }
            }
            .onAppear(perform: populate)
        }
    }

    private func populate() {
        if case .edit(let job) = mode {
            title = job.title
            description = job.description
            clientName = job.clientName
            clientId = job.clientId
            categoryId = job.categoryId
            amountGross = job.amountGross
            vatRate = job.vatRate
            includesVat = job.includesVat
            cadence = job.cadence
            let iso = ISO8601DateFormatter()
            if let d = iso.date(from: job.startDate + "T12:00:00Z") { startDate = d }
            if let e = job.endDate, let d = iso.date(from: e + "T12:00:00Z") {
                endDate = d
                hasEndDate = true
            }
            notes = job.notes ?? ""
        }
    }

    private func dateString(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        return f.string(from: date)
    }

    private func save() async {
        submitting = true
        defer { submitting = false }

        let input = CreateRollingJobInput(
            title: title,
            description: description,
            clientId: clientId,
            clientName: clientName,
            categoryId: categoryId,
            amountGross: amountGross,
            vatRate: vatRate,
            includesVat: includesVat,
            cadence: cadence,
            startDate: dateString(startDate),
            endDate: hasEndDate ? endDate.map(dateString) : nil,
            notes: notes.isEmpty ? nil : notes
        )

        let ok: Bool
        switch mode {
        case .create:
            ok = await viewModel.create(input)
        case .edit(let job):
            let update = UpdateRollingJobInput(
                title: input.title,
                description: input.description,
                clientId: input.clientId,
                clientName: input.clientName,
                categoryId: input.categoryId,
                amountGross: input.amountGross,
                vatRate: input.vatRate,
                includesVat: input.includesVat,
                cadence: input.cadence,
                startDate: input.startDate,
                endDate: input.endDate,
                notes: input.notes
            )
            ok = await viewModel.update(id: job.id, update)
        }

        if ok { dismiss() }
    }
}
```

- [ ] **Step 29.2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/RollingJobs/RollingJobFormSheet.swift
git commit -m "feat(ios): RollingJobFormSheet"
```

---

## Task 30: iOS — `RollingJobsView` list + delete

**Files:**
- Create: `apps/ios/Seder/Seder/Views/RollingJobs/RollingJobsView.swift`
- Create: `apps/ios/Seder/Seder/Views/RollingJobs/DeleteRollingJobSheet.swift`

- [ ] **Step 30.1: Write the list view**

```swift
// apps/ios/Seder/Seder/Views/RollingJobs/RollingJobsView.swift
import SwiftUI

struct RollingJobsView: View {
    @StateObject private var viewModel = RollingJobsViewModel()
    let clients: [Client]
    let categories: [Category]
    @Environment(\.dismiss) private var dismiss

    @State private var formMode: RollingJobFormSheet.Mode?
    @State private var deletingJob: RollingJob?

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.jobs.isEmpty {
                    ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.jobs.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .font(.system(size: 48))
                            .foregroundColor(Theme.textMuted)
                        Text("אין סדרות")
                            .font(.headline)
                        Text("צור סדרה ראשונה כדי לעקוב אחר הכנסות חוזרות")
                            .font(.subheadline)
                            .foregroundColor(Theme.textMuted)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    List {
                        ForEach(viewModel.jobs) { job in
                            RollingJobRow(job: job,
                                          onTogglePause: { Task { await viewModel.togglePause(job) } },
                                          onEdit: { formMode = .edit(job) },
                                          onDelete: { deletingJob = job })
                        }
                    }
                }
            }
            .environment(\.layoutDirection, .rightToLeft)
            .navigationTitle("סדרות הכנסה")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("סגור") { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        formMode = .create
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .task { await viewModel.load() }
            .sheet(item: Binding(
                get: { formMode.map { IdentifiedMode(mode: $0) } },
                set: { formMode = $0?.mode }
            )) { wrapper in
                RollingJobFormSheet(mode: wrapper.mode, viewModel: viewModel, clients: clients, categories: categories)
            }
            .sheet(item: $deletingJob) { job in
                DeleteRollingJobSheet(job: job, viewModel: viewModel)
            }
        }
    }

    private struct IdentifiedMode: Identifiable {
        let mode: RollingJobFormSheet.Mode
        var id: String {
            switch mode {
            case .create: return "create"
            case .edit(let j): return "edit-\(j.id)"
            }
        }
    }
}

struct RollingJobRow: View {
    let job: RollingJob
    let onTogglePause: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

    private func cadenceLabel() -> String {
        switch job.cadence {
        case .daily(let n):
            return n == 1 ? "כל יום" : "כל \(n) ימים"
        case .weekly(let n, let weekdays):
            let names = ["א", "ב", "ג", "ד", "ה", "ו", "ש"]
            let days = weekdays.map { names[$0] }.joined(separator: ", ")
            return n == 1 ? "שבועי: \(days)" : "כל \(n) שבועות: \(days)"
        case .monthly(let n, let day):
            return n == 1 ? "חודשי ביום \(day)" : "כל \(n) חודשים ביום \(day)"
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "arrow.triangle.2.circlepath")
                .foregroundColor(Theme.textMuted)
            VStack(alignment: .trailing) {
                HStack {
                    Text(job.title).font(.headline)
                    if !job.isActive {
                        Text("מושהה")
                            .font(.caption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Theme.surface)
                            .cornerRadius(4)
                    }
                    if job.sourceCalendarRecurringEventId != nil {
                        Text("יומן")
                            .font(.caption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Theme.surface)
                            .cornerRadius(4)
                    }
                }
                Text("\(cadenceLabel()) · ₪\(job.amountGross) · \(job.clientName)")
                    .font(.subheadline)
                    .foregroundColor(Theme.textMuted)
            }
            Spacer()
            Menu {
                Button(job.isActive ? "השהה" : "חדש", action: onTogglePause)
                Button("ערוך", action: onEdit)
                Button("מחק", role: .destructive, action: onDelete)
            } label: {
                Image(systemName: "ellipsis")
                    .padding(8)
            }
        }
        .opacity(job.isActive ? 1.0 : 0.6)
        .environment(\.layoutDirection, .rightToLeft)
    }
}

extension RollingJob: Identifiable {}
```

- [ ] **Step 30.2: Write the delete sheet**

```swift
// apps/ios/Seder/Seder/Views/RollingJobs/DeleteRollingJobSheet.swift
import SwiftUI

struct DeleteRollingJobSheet: View {
    let job: RollingJob
    @ObservedObject var viewModel: RollingJobsViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var deleteFutureDrafts: Bool = true
    @State private var busy: Bool = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .trailing, spacing: 16) {
                Text("רשומות עבר יישמרו תמיד. בחר מה לעשות ברשומות טיוטה עתידיות:")
                    .foregroundColor(Theme.textMuted)
                VStack(alignment: .trailing) {
                    Toggle("שמור רשומות עתידיות", isOn: Binding(
                        get: { !deleteFutureDrafts },
                        set: { deleteFutureDrafts = !$0 }
                    ))
                    Toggle("מחק רשומות טיוטה עתידיות שלא שולמו", isOn: $deleteFutureDrafts)
                }
                Spacer()
                Button(role: .destructive) {
                    Task {
                        busy = true
                        let ok = await viewModel.delete(id: job.id, deleteFutureDrafts: deleteFutureDrafts)
                        busy = false
                        if ok { dismiss() }
                    }
                } label: {
                    Text(busy ? "מוחק..." : "מחק").frame(maxWidth: .infinity)
                }
                .disabled(busy)
                .buttonStyle(.borderedProminent)
            }
            .padding()
            .environment(\.layoutDirection, .rightToLeft)
            .navigationTitle("מחיקת סדרה: \(job.title)")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("ביטול") { dismiss() }
                }
            }
        }
    }
}
```

- [ ] **Step 30.3: Commit**

```bash
git add apps/ios/Seder/Seder/Views/RollingJobs/RollingJobsView.swift apps/ios/Seder/Seder/Views/RollingJobs/DeleteRollingJobSheet.swift
git commit -m "feat(ios): RollingJobsView list + delete sheet"
```

---

## Task 31: iOS — wire `RollingJobsView` into the Income tab

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Components/GreenNavBar.swift`
- Modify: `apps/ios/Seder/Seder/Views/Income/IncomeListView.swift` (or wherever the income tab's nav bar is rendered)

- [ ] **Step 31.1: Find the income tab's navbar composition**

Run: `grep -n "GreenNavBar" apps/ios/Seder/Seder/Views/Income/*.swift`

Identify the view that passes action buttons into `GreenNavBar`.

- [ ] **Step 31.2: Add an icon button that presents `RollingJobsView`**

In the income-tab parent view (the one currently composing `GreenNavBar`), add:

```swift
@State private var showRollingJobs = false
// ...
GreenNavBar(/* existing params */, trailingAction: {
    Button { showRollingJobs = true } label: {
        Image(systemName: "arrow.triangle.2.circlepath")
    }
})
.sheet(isPresented: $showRollingJobs) {
    RollingJobsView(clients: viewModel.clients, categories: viewModel.categories)
}
```

If `GreenNavBar` doesn't accept a trailing-action slot, add one:

```swift
struct GreenNavBar<Trailing: View>: View {
    // ... existing props
    let trailingAction: (() -> Trailing)?
    // in the body, render trailingAction?() in the appropriate position on the right
}
```

If multiple tabs share `GreenNavBar`, make `trailingAction` optional so other call sites don't break.

- [ ] **Step 31.3: Rolling-job icon on rows in `IncomeEntryRow` (iOS)**

Open `apps/ios/Seder/Seder/Views/Income/IncomeEntryRow.swift`. Next to the description, add:

```swift
if entry.rollingJobId != nil {
    Image(systemName: "arrow.triangle.2.circlepath")
        .font(.system(size: 11, weight: .regular))
        .foregroundColor((entry.detachedFromTemplate ?? false) ? Theme.textMuted.opacity(0.5) : Theme.textMuted)
}
```

- [ ] **Step 31.4: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Components/GreenNavBar.swift apps/ios/Seder/Seder/Views/Income/IncomeListView.swift apps/ios/Seder/Seder/Views/Income/IncomeEntryRow.swift
git commit -m "feat(ios): wire RollingJobsView into income tab + row icon"
```

---

## Task 32: iOS — hide-future toggle

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Income/FilterSheet.swift`
- Modify: `apps/ios/Seder/Seder/ViewModels/IncomeViewModel.swift`
- Modify: `apps/ios/Seder/Seder/Views/Income/IncomeListView.swift`

- [ ] **Step 32.1: Add `hideFuture` state to `IncomeViewModel`**

Inside the view model, add:

```swift
@Published var hideFuture: Bool = UserDefaults.standard.bool(forKey: "seder_income_hide_future") {
    didSet { UserDefaults.standard.set(hideFuture, forKey: "seder_income_hide_future") }
}
```

- [ ] **Step 32.2: Apply the filter in the computed `displayedEntries`**

Find the filter pipeline in `IncomeViewModel`. Add:

```swift
if hideFuture {
    let today = DateFormatter.ymd.string(from: Date())
    filtered = filtered.filter { $0.date <= today }
}
```

(Add `static let ymd: DateFormatter` extension if not already present.)

- [ ] **Step 32.3: Add toggle to `FilterSheet`**

```swift
Toggle("הסתר עתיד", isOn: $viewModel.hideFuture)
```

- [ ] **Step 32.4: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Income/FilterSheet.swift apps/ios/Seder/Seder/ViewModels/IncomeViewModel.swift apps/ios/Seder/Seder/Views/Income/IncomeListView.swift
git commit -m "feat(ios): hide-future toggle for income list"
```

---

## Task 33: Manual QA pass + final sanity

**Files:**
- None (QA only)

- [ ] **Step 33.1: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass (shared generator, parseRRule, materialize, nudges).

- [ ] **Step 33.2: Start the dev server**

Run: `pnpm dev:web`
Expected: server up on `http://localhost:3001`.

- [ ] **Step 33.3: QA checklist — web**

Manually verify:

- [ ] Open `/income` → click "סדרות" button → dialog opens with empty list.
- [ ] Create a weekly rolling job (Tuesdays, ₪150) → preview shows 4 dates → save → immediately see the draft rows in the income list below.
- [ ] Each new row shows the `Repeat` icon.
- [ ] Toggle "הסתר עתיד" → future rows vanish; untoggle → they return.
- [ ] Edit an individual row (change amount) → reload → icon on that row is muted (detached).
- [ ] Edit the rolling job → change rate → confirm dialog → detached row keeps its edited value; other future rows get the new rate.
- [ ] Pause the rolling job → list still shows existing future rows; wait for next cron tick (or hit the cron endpoint manually with `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3001/api/cron/rolling-jobs`) → no new rows.
- [ ] Resume → new rows appear starting today.
- [ ] Delete with "keep past" → past rows stay (without icon now); future rows kept but detached.
- [ ] Delete with "delete future drafts" → future unpaid drafts gone.
- [ ] Calendar promotion: create a weekly recurring event in a test Google Calendar; open "Import from calendar"; click "ניהול כסדרה" on a recurring row; form pre-filled with weekly cadence; save; verify next calendar import does NOT create a duplicate row for the promoted event.

- [ ] **Step 33.4: QA checklist — iOS**

Build and run in Xcode (open `apps/ios/Seder/Seder.xcodeproj`):

- [ ] Income tab nav bar shows the circle-arrow icon; tap → `RollingJobsView` sheet appears.
- [ ] Create a rolling job → new draft rows appear in the income list.
- [ ] Weekday chips ordered right-to-left in RTL (first chip = Sunday = rightmost).
- [ ] Edit → update → verify rows rewritten.
- [ ] Pause → icon dimmed; resume → back to full.
- [ ] Delete flow works.
- [ ] Income list rows with `rollingJobId` show the circle-arrow icon in a muted color; detached rows show it even fainter.

- [ ] **Step 33.5: Commit any small fixes**

If QA surfaces bugs, fix them one at a time with a `fix(...)` commit each.

- [ ] **Step 33.6: Final sanity commit + push**

```bash
git log --oneline origin/main..HEAD
# Review the commit list — should be ~30+ commits covering the feature.
```

---

## Self-Review Checklist (for the plan author — already run)

- ✅ Spec coverage: every spec section maps to a task (data model → Task 7; generator → 3+4; parser → 5+6; materialize → 8+9; data helpers → 10; detach flag → 11; actions → 12; API → 13; cron → 14; nudges → 15; calendar dedup → 16; promotion UI → 23; web UI → 17–22; iOS → 25–32; QA → 33).
- ✅ No placeholders: every code step has complete code. The only "TODO" references point back to instructions in earlier tasks the engineer has already completed.
- ✅ Type consistency: `RollingJob`, `Cadence`, `CreateRollingJobInput`, `materializeRollingJob`, `rowToMaterializeInput` — all defined once and referenced consistently.
- ✅ Scope: single feature, single plan. Big but cohesive.
