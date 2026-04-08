# Push Notifications Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 7 nudge types with 4 focused push notification types and wire up the cron that was never scheduled.

**Architecture:** Rewrite `lib/nudges/types.ts`, `compute.ts`, and the cron handler to support 4 nudge types: `overdue`, `weekly_uninvoiced`, `calendar_sync`, `unpaid_check`. Add `nudgeWeeklyDay` to DB schema and settings UI. Update iOS Swift models to match. Remove old threshold settings.

**Tech Stack:** TypeScript, Drizzle ORM, Next.js API routes, Vitest, Swift/SwiftUI

---

### Task 1: Update nudge types and defaults

**Files:**
- Modify: `apps/web/lib/nudges/types.ts`

- [ ] **Step 1: Replace nudge types and defaults**

Rewrite `types.ts` with the new 4 nudge types:

```typescript
export const nudgeTypes = [
  "overdue",
  "weekly_uninvoiced",
  "calendar_sync",
  "unpaid_check",
] as const;

export type NudgeType = (typeof nudgeTypes)[number];

export interface Nudge {
  id: string;
  nudgeType: NudgeType;
  entryId: string | null;
  periodKey: string | null;
  priority: number;
  title: string;
  description: string;
  actionType: "mark_sent" | "mark_paid" | "import_calendar" | "view_entry";
  entryDate?: string;
  entryDescription?: string;
  clientName?: string;
  amountGross?: number;
  daysSince?: number;
}

export interface NudgePushPreferences {
  overdue: boolean;
  weekly_uninvoiced: boolean;
  calendar_sync: boolean;
  unpaid_check: boolean;
}

export const DEFAULT_NUDGE_PUSH_PREFS: NudgePushPreferences = {
  overdue: true,
  weekly_uninvoiced: true,
  calendar_sync: true,
  unpaid_check: true,
};

export const DEFAULT_NUDGE_WEEKLY_DAY = 5; // Friday
```

- [ ] **Step 2: Verify the file compiles**

Run: `cd /Users/bareloved/Github/seder && pnpm exec tsc --noEmit -p apps/web/tsconfig.json 2>&1 | head -30`

Expected: Type errors in files that still reference old types (compute.ts, settings, etc.) — that's fine, we'll fix them in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/nudges/types.ts
git commit -m "refactor(nudges): replace 7 nudge types with 4 focused types"
```

---

### Task 2: Rewrite computeNudges

**Files:**
- Modify: `apps/web/lib/nudges/compute.ts`

- [ ] **Step 1: Rewrite compute.ts**

Replace the entire file with the new 4-type computation:

```typescript
import type { Nudge, NudgeType } from "./types";

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
}

interface DismissedState {
  entryId: string | null;
  nudgeType: string;
  periodKey: string | null;
  dismissedAt: Date;
  snoozeUntil: Date | null;
  lastPushedAt?: Date | null;
}

const PRIORITY: Record<NudgeType, number> = {
  overdue: 1,
  weekly_uninvoiced: 2,
  calendar_sync: 3,
  unpaid_check: 4,
};

function daysBetween(dateStr: string | Date, now: Date): number {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function formatCurrency(amount: string): string {
  return `₪${Number(amount).toLocaleString("he-IL")}`;
}

function isDismissed(
  dismissed: DismissedState[],
  nudgeType: NudgeType,
  entryId: string | null,
  periodKey: string | null,
  now: Date
): boolean {
  return dismissed.some((d) => {
    if (d.nudgeType !== nudgeType) return false;
    if (entryId && d.entryId === entryId) {
      if (d.snoozeUntil && d.snoozeUntil < now) return false;
      return true;
    }
    if (periodKey && d.periodKey === periodKey) {
      if (d.snoozeUntil && d.snoozeUntil < now) return false;
      return true;
    }
    return false;
  });
}

function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

/**
 * Compute overdue nudges — sent invoices unpaid for 30+ days.
 */
function computeOverdue(entries: NudgeEntry[], dismissed: DismissedState[], now: Date): Nudge[] {
  const nudges: Nudge[] = [];

  for (const entry of entries) {
    if (entry.invoiceStatus !== "sent") continue;
    if (entry.paymentStatus === "paid") continue;

    const sentDate = entry.invoiceSentDate || entry.updatedAt;
    const days = daysBetween(sentDate, now);
    if (days < 30) continue;

    if (!isDismissed(dismissed, "overdue", entry.id, null, now)) {
      nudges.push({
        id: `overdue:${entry.id}`,
        nudgeType: "overdue",
        entryId: entry.id,
        periodKey: null,
        priority: PRIORITY.overdue,
        title: "חשבונית לא שולמה מעל 30 יום",
        description: `${entry.clientName} - ${entry.description} (${formatCurrency(entry.amountGross)})`,
        actionType: "mark_paid",
        entryDate: entry.date,
        entryDescription: entry.description,
        clientName: entry.clientName,
        amountGross: Number(entry.amountGross),
        daysSince: days,
      });
    }
  }

  return nudges;
}

/**
 * Compute weekly uninvoiced nudges — draft entries from the last 7 days.
 * Only runs on the user's chosen weekday (default Friday).
 */
function computeWeeklyUninvoiced(
  entries: NudgeEntry[],
  dismissed: DismissedState[],
  now: Date,
  weeklyDay: number
): Nudge[] {
  if (now.getDay() !== weeklyDay) return [];

  // Look back 7 days (e.g., Friday looks back to previous Saturday)
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 7);
  cutoff.setHours(0, 0, 0, 0);

  const uninvoiced = entries.filter(
    (e) => e.invoiceStatus === "draft" && new Date(e.date) >= cutoff
  );

  if (uninvoiced.length === 0) return [];

  const weekNum = getISOWeek(now);
  const periodKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;

  if (isDismissed(dismissed, "weekly_uninvoiced", null, periodKey, now)) return [];

  const totalAmount = uninvoiced.reduce((sum, e) => sum + Number(e.amountGross), 0);

  return [{
    id: `weekly_uninvoiced:${periodKey}`,
    nudgeType: "weekly_uninvoiced",
    entryId: null,
    periodKey,
    priority: PRIORITY.weekly_uninvoiced,
    title: "עבודות ממתינות לחשבונית",
    description: `יש לך ${uninvoiced.length} עבודות בסך ${formatCurrency(String(totalAmount))} שממתינות לחשבונית`,
    actionType: "view_entry",
    entryDate: now.toISOString().split("T")[0],
  }];
}

export function computeNudges(
  entries: NudgeEntry[],
  dismissed: DismissedState[],
  weeklyDay: number = 5
): Nudge[] {
  const now = new Date();
  const filtered = entries.filter(
    (e) => e.invoiceStatus !== "cancelled" &&
      !(e.invoiceStatus === "paid" && e.paymentStatus === "paid")
  );

  const nudges = [
    ...computeOverdue(filtered, dismissed, now),
    ...computeWeeklyUninvoiced(filtered, dismissed, now, weeklyDay),
  ];

  nudges.sort((a, b) => a.priority - b.priority);
  return nudges;
}
```

Note: `calendar_sync` and `unpaid_check` are generic reminders with no data lookup — they're handled entirely in the cron handler, not in `computeNudges`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/nudges/compute.ts
git commit -m "refactor(nudges): rewrite computeNudges with overdue + weekly_uninvoiced"
```

---

### Task 3: Rewrite tests for computeNudges

**Files:**
- Modify: `apps/web/lib/nudges/__tests__/compute.test.ts`

- [ ] **Step 1: Replace test file**

```typescript
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

describe("computeNudges", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- overdue (30+ days unpaid) ---

  describe("overdue", () => {
    it("returns overdue nudge when sent invoice is 30+ days old", () => {
      vi.setSystemTime(new Date("2026-04-05"));
      const entries = [baseEntry({
        invoiceStatus: "sent",
        invoiceSentDate: "2026-03-01", // 35 days ago
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
        invoiceSentDate: "2026-03-01", // 19 days ago
      })];
      const nudges = computeNudges(entries, []);
      expect(nudges).toHaveLength(0);
    });

    it("returns overdue at exact 30-day boundary", () => {
      vi.setSystemTime(new Date("2026-03-31"));
      const entries = [baseEntry({
        invoiceStatus: "sent",
        invoiceSentDate: "2026-03-01", // exactly 30 days
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

  // --- weekly_uninvoiced ---

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
      const nudges = computeNudges(entries, [], 5); // Friday
      expect(nudges.every(n => n.nudgeType !== "weekly_uninvoiced")).toBe(true);
    });

    it("includes entries from exactly 7 days ago (previous Saturday for Friday)", () => {
      vi.setSystemTime(new Date("2026-04-10")); // Friday
      const entries = [baseEntry({ date: "2026-04-03" })]; // previous Thursday — within 7 days
      const nudges = computeNudges(entries, [], 5);
      expect(nudges.some(n => n.nudgeType === "weekly_uninvoiced")).toBe(true);
    });

    it("excludes entries older than 7 days", () => {
      vi.setSystemTime(new Date("2026-04-10")); // Friday
      const entries = [baseEntry({ date: "2026-04-02" })]; // 8 days ago
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

  // --- general ---

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
        snoozeUntil: new Date("2026-04-04"), // expired yesterday
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
```

- [ ] **Step 2: Run tests**

Run: `cd /Users/bareloved/Github/seder && pnpm exec vitest run apps/web/lib/nudges/__tests__/compute.test.ts`

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/nudges/__tests__/compute.test.ts
git commit -m "test(nudges): rewrite compute tests for 4 nudge types"
```

---

### Task 4: Update DB schema and queries

**Files:**
- Modify: `apps/web/db/schema.ts:176-187`
- Modify: `apps/web/lib/nudges/queries.ts`

- [ ] **Step 1: Update userSettings schema**

In `apps/web/db/schema.ts`, replace the nudge settings columns (lines 177-187):

```typescript
  // Smart Nudges settings
  nudgeWeeklyDay: integer("nudge_weekly_day").default(5), // 0=Sun, 5=Fri
  nudgePushEnabled: json("nudge_push_enabled").$type<{
    overdue: boolean;
    weekly_uninvoiced: boolean;
    calendar_sync: boolean;
    unpaid_check: boolean;
  }>(),
```

This removes `nudgeInvoiceDays` and `nudgePaymentDays` columns from the schema definition and adds `nudgeWeeklyDay`. The old columns will remain in the DB but won't be used — a migration to drop them can be done later.

- [ ] **Step 2: Update queries.ts**

Replace `getNudgeSettings` to return the new shape:

```typescript
import { db } from "@/db/client";
import { incomeEntries, dismissedNudges, userSettings } from "@/db/schema";
import { eq, and, or, ne } from "drizzle-orm";
import { DEFAULT_NUDGE_PUSH_PREFS, DEFAULT_NUDGE_WEEKLY_DAY } from "./types";
import type { NudgePushPreferences } from "./types";

export async function fetchNudgeableEntries(userId: string) {
  return db
    .select()
    .from(incomeEntries)
    .where(
      and(
        eq(incomeEntries.userId, userId),
        ne(incomeEntries.invoiceStatus, "cancelled"),
        or(
          eq(incomeEntries.invoiceStatus, "draft"),
          and(
            eq(incomeEntries.invoiceStatus, "sent"),
            ne(incomeEntries.paymentStatus, "paid")
          )
        )
      )
    );
}

export async function fetchDismissedNudges(userId: string) {
  return db
    .select()
    .from(dismissedNudges)
    .where(eq(dismissedNudges.userId, userId));
}

export async function getNudgeSettings(userId: string) {
  const [settings] = await db
    .select({
      nudgeWeeklyDay: userSettings.nudgeWeeklyDay,
      nudgePushEnabled: userSettings.nudgePushEnabled,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return {
    nudgeWeeklyDay: settings?.nudgeWeeklyDay ?? DEFAULT_NUDGE_WEEKLY_DAY,
    nudgePushEnabled: (settings?.nudgePushEnabled ?? DEFAULT_NUDGE_PUSH_PREFS) as NudgePushPreferences,
  };
}

export async function dismissNudge(
  userId: string,
  nudgeType: string,
  entryId: string | null,
  periodKey: string | null,
  snoozeUntil: Date | null
) {
  if (entryId) {
    await db
      .insert(dismissedNudges)
      .values({ userId, entryId, nudgeType, dismissedAt: new Date(), snoozeUntil })
      .onConflictDoUpdate({
        target: [dismissedNudges.userId, dismissedNudges.entryId, dismissedNudges.nudgeType],
        set: { dismissedAt: new Date(), snoozeUntil },
      });
  } else {
    await db
      .insert(dismissedNudges)
      .values({ userId, nudgeType, periodKey, dismissedAt: new Date(), snoozeUntil })
      .onConflictDoUpdate({
        target: [dismissedNudges.userId, dismissedNudges.nudgeType, dismissedNudges.periodKey],
        set: { dismissedAt: new Date(), snoozeUntil },
      });
  }
}

export async function markNudgePushed(
  userId: string,
  nudgeType: string,
  entryId: string | null,
  periodKey: string | null
) {
  const now = new Date();
  if (entryId) {
    await db
      .insert(dismissedNudges)
      .values({ userId, entryId, nudgeType, dismissedAt: now, lastPushedAt: now })
      .onConflictDoUpdate({
        target: [dismissedNudges.userId, dismissedNudges.entryId, dismissedNudges.nudgeType],
        set: { lastPushedAt: now },
      });
  } else {
    await db
      .insert(dismissedNudges)
      .values({ userId, nudgeType, periodKey, dismissedAt: now, lastPushedAt: now })
      .onConflictDoUpdate({
        target: [dismissedNudges.userId, dismissedNudges.nudgeType, dismissedNudges.periodKey],
        set: { lastPushedAt: now },
      });
  }
}
```

- [ ] **Step 3: Generate migration**

Run: `cd /Users/bareloved/Github/seder/apps/web && pnpm db:generate`

Review the generated migration SQL. It should add `nudge_weekly_day` integer column. The old columns (`nudge_invoice_days`, `nudge_payment_days`) remain in DB but are no longer in the schema — Drizzle may generate a migration to drop them. If it does, review that it's safe (data loss is OK since these thresholds are being removed by design).

- [ ] **Step 4: Push schema**

Run: `cd /Users/bareloved/Github/seder/apps/web && pnpm db:push`

- [ ] **Step 5: Commit**

```bash
git add apps/web/db/schema.ts apps/web/lib/nudges/queries.ts apps/web/drizzle/
git commit -m "refactor(nudges): update schema and queries for new nudge types"
```

---

### Task 5: Update getNudgesForUser in data.ts

**Files:**
- Modify: `apps/web/app/income/data.ts:1517-1523`

- [ ] **Step 1: Update getNudgesForUser**

The function currently passes `settings` (with old shape) to `computeNudges`. Update it to pass `weeklyDay`:

```typescript
export async function getNudgesForUser(userId: string): Promise<Nudge[]> {
  const [entries, dismissed, settings] = await Promise.all([
    fetchNudgeableEntries(userId),
    fetchDismissedNudges(userId),
    getNudgeSettings(userId),
  ]);
  return computeNudges(entries, dismissed, settings.nudgeWeeklyDay);
}
```

Also update the `Nudge` import at the top of `data.ts` — ensure it imports from `@/lib/nudges/types` (check the existing import).

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/income/data.ts
git commit -m "refactor(nudges): update getNudgesForUser for new compute signature"
```

---

### Task 6: Rewrite cron handler

**Files:**
- Modify: `apps/web/app/api/cron/overdue-notifications/route.ts`

- [ ] **Step 1: Rewrite the cron handler**

```typescript
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { sendPushToUser } from "@/lib/pushNotifications";
import { apiSuccess, apiError } from "../../v1/_lib/response";
import { fetchNudgeableEntries, fetchDismissedNudges, getNudgeSettings, markNudgePushed } from "@/lib/nudges/queries";
import { computeNudges } from "@/lib/nudges/compute";
import type { NudgeType } from "@/lib/nudges/types";

const MAX_PUSH_PER_USER = 2;

// 7-day dedup for overdue (per-entry), 7-day for weekly types
const DEDUP_MS: Record<NudgeType, number> = {
  overdue: 7 * 24 * 60 * 60 * 1000,
  weekly_uninvoiced: 7 * 24 * 60 * 60 * 1000,
  calendar_sync: 28 * 24 * 60 * 60 * 1000,
  unpaid_check: 28 * 24 * 60 * 60 * 1000,
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const isFirstOfMonth = dayOfMonth === 1;
    const isLastOfMonth = dayOfMonth === lastDayOfMonth;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const users = await db.select({ id: user.id }).from(user);
    let notificationsSent = 0;

    for (const u of users) {
      const settings = await getNudgeSettings(u.id);
      let sent = 0;

      // --- 1. Overdue (daily) ---
      if (settings.nudgePushEnabled.overdue) {
        const [entries, dismissed] = await Promise.all([
          fetchNudgeableEntries(u.id),
          fetchDismissedNudges(u.id),
        ]);

        const nudges = computeNudges(entries, dismissed, settings.nudgeWeeklyDay);
        const overdueNudges = nudges.filter((n) => n.nudgeType === "overdue");

        for (const n of overdueNudges) {
          if (sent >= MAX_PUSH_PER_USER) break;

          const alreadyPushed = dismissed.some(
            (d) => d.nudgeType === "overdue" && d.entryId === n.entryId &&
              d.lastPushedAt && now.getTime() - new Date(d.lastPushedAt).getTime() < DEDUP_MS.overdue
          );
          if (alreadyPushed) continue;

          await sendPushToUser(u.id,
            "יש לך חשבונית שלא שולמה מעל 30 יום",
            `${n.clientName} - ${n.entryDescription} (₪${n.amountGross?.toLocaleString("he-IL")})`,
            { type: "nudge", nudgeType: "overdue" }
          );
          await markNudgePushed(u.id, "overdue", n.entryId, null);
          sent++;
          notificationsSent++;
        }
      }

      // --- 2. Weekly uninvoiced (user's chosen day) ---
      if (settings.nudgePushEnabled.weekly_uninvoiced && dayOfWeek === settings.nudgeWeeklyDay) {
        if (sent < MAX_PUSH_PER_USER) {
          const [entries, dismissed] = await Promise.all([
            fetchNudgeableEntries(u.id),
            fetchDismissedNudges(u.id),
          ]);

          const nudges = computeNudges(entries, dismissed, settings.nudgeWeeklyDay);
          const weeklyNudge = nudges.find((n) => n.nudgeType === "weekly_uninvoiced");

          if (weeklyNudge) {
            const alreadyPushed = dismissed.some(
              (d) => d.nudgeType === "weekly_uninvoiced" && d.periodKey === weeklyNudge.periodKey &&
                d.lastPushedAt && now.getTime() - new Date(d.lastPushedAt).getTime() < DEDUP_MS.weekly_uninvoiced
            );

            if (!alreadyPushed) {
              await sendPushToUser(u.id,
                "עבודות ממתינות לחשבונית",
                weeklyNudge.description,
                { type: "nudge", nudgeType: "weekly_uninvoiced" }
              );
              await markNudgePushed(u.id, "weekly_uninvoiced", null, weeklyNudge.periodKey);
              sent++;
              notificationsSent++;
            }
          }
        }
      }

      // --- 3. Calendar sync (1st of month) ---
      if (settings.nudgePushEnabled.calendar_sync && isFirstOfMonth) {
        if (sent < MAX_PUSH_PER_USER) {
          const dismissed = await fetchDismissedNudges(u.id);
          const alreadyPushed = dismissed.some(
            (d) => d.nudgeType === "calendar_sync" && d.periodKey === monthKey &&
              d.lastPushedAt && now.getTime() - new Date(d.lastPushedAt).getTime() < DEDUP_MS.calendar_sync
          );

          if (!alreadyPushed) {
            await sendPushToUser(u.id,
              "חודש חדש!",
              "יש ביומן עבודות לסנכרן עם סדר?",
              { type: "nudge", nudgeType: "calendar_sync" }
            );
            await markNudgePushed(u.id, "calendar_sync", null, monthKey);
            sent++;
            notificationsSent++;
          }
        }
      }

      // --- 4. Unpaid check (last day of month) ---
      if (settings.nudgePushEnabled.unpaid_check && isLastOfMonth) {
        if (sent < MAX_PUSH_PER_USER) {
          const dismissed = await fetchDismissedNudges(u.id);
          const alreadyPushed = dismissed.some(
            (d) => d.nudgeType === "unpaid_check" && d.periodKey === monthKey &&
              d.lastPushedAt && now.getTime() - new Date(d.lastPushedAt).getTime() < DEDUP_MS.unpaid_check
          );

          if (!alreadyPushed) {
            await sendPushToUser(u.id,
              "סוף חודש!",
              "יש עבודות ששולמו כבר ולא סומנו?",
              { type: "nudge", nudgeType: "unpaid_check" }
            );
            await markNudgePushed(u.id, "unpaid_check", null, monthKey);
            sent++;
            notificationsSent++;
          }
        }
      }
    }

    return apiSuccess({ notificationsSent });
  } catch (error) {
    return apiError(error);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/cron/overdue-notifications/route.ts
git commit -m "refactor(nudges): rewrite cron handler for 4 nudge types"
```

---

### Task 7: Wire up the cron in vercel.json

**Files:**
- Modify: `apps/web/vercel.json`

- [ ] **Step 1: Add cron entry**

Add the overdue-notifications cron to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/calendar/auto-sync",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/backup",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/overdue-notifications",
      "schedule": "0 8 * * *"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/vercel.json
git commit -m "fix(nudges): wire up overdue-notifications cron in vercel.json"
```

---

### Task 8: Update settings UI (web)

**Files:**
- Modify: `apps/web/app/settings/components/NotificationsSection.tsx`
- Modify: `apps/web/app/settings/actions.ts:54-85`

- [ ] **Step 1: Update updateNudgeSettings action**

In `apps/web/app/settings/actions.ts`, replace the `updateNudgeSettings` function (lines 66-85):

```typescript
export async function updateNudgeSettings(data: {
  nudgeWeeklyDay: number;
  nudgePushEnabled: NudgePushPreferences;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .update(userSettings)
    .set({
      nudgeWeeklyDay: data.nudgeWeeklyDay,
      nudgePushEnabled: data.nudgePushEnabled,
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, session.user.id));

  revalidatePath("/settings");
}
```

Also update `getNudgeSettingsAction` (lines 56-64):

```typescript
export async function getNudgeSettingsAction() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");

  const { getNudgeSettings } = await import("@/lib/nudges/queries");
  return getNudgeSettings(session.user.id);
}
```

- [ ] **Step 2: Rewrite NotificationsSection component**

Replace the entire `NotificationsSection.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateNudgeSettings } from "../actions";
import type { NudgePushPreferences } from "@/lib/nudges/types";
import { DEFAULT_NUDGE_PUSH_PREFS, DEFAULT_NUDGE_WEEKLY_DAY } from "@/lib/nudges/types";

interface NotificationsSectionProps {
  initialSettings: {
    nudgeWeeklyDay: number;
    nudgePushEnabled: NudgePushPreferences;
  };
}

const pushLabels: Record<keyof NudgePushPreferences, string> = {
  overdue: "חשבוניות שלא שולמו (30+ יום)",
  weekly_uninvoiced: "תזכורת שבועית לחשבוניות",
  calendar_sync: "סנכרון יומן (תחילת חודש)",
  unpaid_check: "בדיקת תשלומים (סוף חודש)",
};

const dayNames = [
  { value: "0", label: "ראשון" },
  { value: "1", label: "שני" },
  { value: "2", label: "שלישי" },
  { value: "3", label: "רביעי" },
  { value: "4", label: "חמישי" },
  { value: "5", label: "שישי" },
  { value: "6", label: "שבת" },
];

export function NotificationsSection({ initialSettings }: NotificationsSectionProps) {
  const [weeklyDay, setWeeklyDay] = useState(initialSettings.nudgeWeeklyDay);
  const [pushPrefs, setPushPrefs] = useState<NudgePushPreferences>(
    initialSettings.nudgePushEnabled
  );
  const [isPending, startTransition] = useTransition();

  function handleToggle(key: keyof NudgePushPreferences) {
    setPushPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSave() {
    startTransition(async () => {
      await updateNudgeSettings({
        nudgeWeeklyDay: weeklyDay,
        nudgePushEnabled: pushPrefs,
      });
    });
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>התראות Push</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.keys(pushLabels) as Array<keyof NudgePushPreferences>).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <Label>{pushLabels[key]}</Label>
              <Switch
                checked={pushPrefs[key]}
                onCheckedChange={() => handleToggle(key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>יום תזכורת שבועית</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>באיזה יום לשלוח תזכורת חשבוניות?</Label>
            <Select
              value={String(weeklyDay)}
              onValueChange={(v) => setWeeklyDay(Number(v))}
              dir="rtl"
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dayNames.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "שומר..." : "שמור שינויים"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Update settings page to pass new props**

In `apps/web/app/settings/page.tsx`, find where `NotificationsSection` is rendered and update the props to pass `nudgeWeeklyDay` instead of `nudgeInvoiceDays` / `nudgePaymentDays`. The exact change depends on how the page fetches settings — read the file and update the prop shape to match:

```typescript
initialSettings={{
  nudgeWeeklyDay: settings.nudgeWeeklyDay ?? DEFAULT_NUDGE_WEEKLY_DAY,
  nudgePushEnabled: settings.nudgePushEnabled ?? DEFAULT_NUDGE_PUSH_PREFS,
}}
```

- [ ] **Step 4: Verify build**

Run: `cd /Users/bareloved/Github/seder && pnpm build 2>&1 | tail -20`

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/settings/components/NotificationsSection.tsx apps/web/app/settings/actions.ts apps/web/app/settings/page.tsx
git commit -m "refactor(nudges): simplify settings UI to 4 toggles + day picker"
```

---

### Task 9: Update iOS models

**Files:**
- Modify: `apps/ios/Seder/Seder/Models/Settings.swift`

- [ ] **Step 1: Update NudgePushPreferences and UserSettings**

In `Settings.swift`, replace the `NudgePushPreferences` struct (lines 48-66):

```swift
nonisolated struct NudgePushPreferences: Codable, Sendable {
    var overdue: Bool
    var weekly_uninvoiced: Bool
    var calendar_sync: Bool
    var unpaid_check: Bool

    static let defaults = NudgePushPreferences(
        overdue: true,
        weekly_uninvoiced: true,
        calendar_sync: true,
        unpaid_check: true
    )
}
```

In `UserSettings` struct (lines 3-14), replace the nudge fields:

```swift
nonisolated struct UserSettings: Codable, Sendable {
    let language: String?
    let timezone: String?
    let theme: String?
    let dateFormat: String?
    let defaultCurrency: String?
    let onboardingCompleted: Bool?
    let calendarSettings: CalendarSettingsData?
    let nudgeWeeklyDay: Int?
    let nudgePushEnabled: NudgePushPreferences?
}
```

Replace `UpdateNudgeSettingsRequest` (lines 80-84):

```swift
nonisolated struct UpdateNudgeSettingsRequest: Encodable, Sendable {
    let nudgeWeeklyDay: Int
    let nudgePushEnabled: NudgePushPreferences
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Models/Settings.swift
git commit -m "refactor(ios): update nudge models for 4 nudge types"
```

---

### Task 10: Update iOS settings view and view model

**Files:**
- Modify: `apps/ios/Seder/Seder/ViewModels/SettingsViewModel.swift`
- Modify: `apps/ios/Seder/Seder/Views/Settings/SettingsView.swift`

- [ ] **Step 1: Update SettingsViewModel**

Read the full `SettingsViewModel.swift` file. Replace nudge-related properties and `saveNudgeSettings`:

Replace the nudge published properties:

```swift
// Nudge settings
@Published var nudgeWeeklyDay: Int = 5
@Published var nudgePushPrefs: NudgePushPreferences = .defaults
```

In `loadSettings()` (or equivalent), replace the nudge property assignments:

```swift
nudgeWeeklyDay = s.nudgeWeeklyDay ?? 5
nudgePushPrefs = s.nudgePushEnabled ?? .defaults
```

In `saveNudgeSettings()`, replace the request body:

```swift
let body = UpdateNudgeSettingsRequest(
    nudgeWeeklyDay: nudgeWeeklyDay,
    nudgePushEnabled: nudgePushPrefs
)
```

- [ ] **Step 2: Update NotificationsSettingsSection in SettingsView.swift**

Read the full `SettingsView.swift`. Find `NotificationsSettingsSection` (around line 488) and replace it:

Replace `thresholdRows` and `pushToggleRows` with:

```swift
var body: some View {
    SettingsSection(title: "תזכורות") {
        VStack(spacing: 0) {
            weeklyDayPicker
            Divider().padding(.horizontal, 16)
            pushToggle(label: "חשבוניות שלא שולמו (30+ יום)", icon: "exclamationmark.triangle", isOn: $viewModel.nudgePushPrefs.overdue)
            Divider().padding(.horizontal, 16)
            pushToggle(label: "תזכורת שבועית לחשבוניות", icon: "doc.on.doc", isOn: $viewModel.nudgePushPrefs.weekly_uninvoiced)
            Divider().padding(.horizontal, 16)
            pushToggle(label: "סנכרון יומן (תחילת חודש)", icon: "calendar", isOn: $viewModel.nudgePushPrefs.calendar_sync)
            Divider().padding(.horizontal, 16)
            pushToggle(label: "בדיקת תשלומים (סוף חודש)", icon: "creditcard", isOn: $viewModel.nudgePushPrefs.unpaid_check)
        }
    }
}

private var weeklyDayPicker: some View {
    let dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
    return HStack {
        HStack(spacing: 8) {
            Image(systemName: "calendar.badge.clock")
                .font(.body)
                .foregroundStyle(SederTheme.textSecondary)
            Text("יום תזכורת שבועית")
                .font(.body)
        }
        Spacer()
        Picker("", selection: $viewModel.nudgeWeeklyDay) {
            ForEach(0..<7, id: \.self) { i in
                Text(dayNames[i]).tag(i)
            }
        }
        .pickerStyle(.menu)
        .tint(SederTheme.brandGreen)
        .onChange(of: viewModel.nudgeWeeklyDay) {
            Task { await viewModel.saveNudgeSettings() }
        }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 10)
}
```

Remove the old `thresholdRows` computed property and `thresholdRow` function entirely.

- [ ] **Step 3: Verify iOS build**

Open in Xcode and verify it compiles: `xcodebuild -project apps/ios/Seder/Seder.xcodeproj -scheme Seder -destination 'platform=iOS Simulator,name=iPhone 16' build 2>&1 | tail -10`

- [ ] **Step 4: Commit**

```bash
git add apps/ios/Seder/Seder/ViewModels/SettingsViewModel.swift apps/ios/Seder/Seder/Views/Settings/SettingsView.swift
git commit -m "refactor(ios): update settings UI for 4 nudge types + day picker"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run all tests**

Run: `cd /Users/bareloved/Github/seder && pnpm test`

Expected: All tests pass.

- [ ] **Step 2: Run full build**

Run: `cd /Users/bareloved/Github/seder && pnpm build`

Expected: Build succeeds.

- [ ] **Step 3: Verify cron endpoint manually**

Run the dev server and hit the cron endpoint:

```bash
cd /Users/bareloved/Github/seder && pnpm dev:web &
sleep 5
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3001/api/cron/overdue-notifications
```

Expected: Returns `{"data":{"notificationsSent":0}}` or similar (0 is fine if no entries match).

- [ ] **Step 4: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore(nudges): final cleanup for push notifications redesign"
```
