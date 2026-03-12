# Smart Nudges (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a proactive nudge system that reminds freelancers about uninvoiced gigs, overdue payments, and unlogged calendar events — both in-app and via push notifications.

**Architecture:** Nudges are computed on-the-fly from existing `incomeEntries` data (no event sourcing). A new `dismissed_nudges` table tracks dismissals/snoozes. Nudge settings extend the existing `userSettings` table. The existing overdue cron job is refactored into a general nudge push cron. The web UI adds a collapsible banner to the income page; iOS adds a section to the income list.

**Tech Stack:** Next.js (App Router, Server Actions), Drizzle ORM, PostgreSQL, Vitest, SwiftUI, APNs via Expo Push API

**Spec:** `docs/superpowers/specs/2026-03-12-feature-positioning-and-smart-nudges-design.md` — Part B

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `apps/web/lib/nudges/types.ts` | Nudge type definitions, NudgeType enum, Nudge interface |
| `apps/web/lib/nudges/compute.ts` | Pure functions: compute nudges from entries + settings + dismissed state |
| `apps/web/lib/nudges/queries.ts` | DB queries: fetch entries needing nudges, fetch/upsert dismissed nudges |
| `apps/web/lib/nudges/__tests__/compute.test.ts` | Unit tests for nudge computation logic |
| `apps/web/app/income/components/NudgeBanner.tsx` | Collapsible in-app nudge banner component |
| `apps/web/app/income/actions-nudges.ts` | Server actions: dismiss, snooze nudges |
| `apps/web/app/api/v1/nudges/route.ts` | REST API for iOS: GET nudges, POST dismiss/snooze |

### Modified Files
| File | Change |
|------|--------|
| `apps/web/db/schema.ts` | Add `dismissedNudges` table, add nudge settings columns to `userSettings` |
| `apps/web/app/income/data.ts` | Add `getNudgesForUser()` that calls compute + queries |
| `apps/web/app/income/IncomePageClient.tsx` | Add NudgeBanner above entry list |
| `apps/web/app/income/page.tsx` | Fetch nudges server-side, pass to client |
| `apps/web/app/settings/components/NotificationsSection.tsx` | New settings tab for nudge preferences |
| `apps/web/app/settings/page.tsx` | Add "notifications" tab |
| `apps/web/app/settings/actions.ts` | Add `updateNudgeSettings()` server action |
| `apps/web/app/api/cron/overdue-notifications/route.ts` | Refactor to use nudge computation |
| `apps/web/lib/pushNotifications.ts` | No changes (reuse as-is) |

### iOS Files (new)
| File | Responsibility |
|------|---------------|
| `apps/ios/Seder/Seder/Models/Nudge.swift` | Nudge Codable model |
| `apps/ios/Seder/Seder/ViewModels/NudgeViewModel.swift` | Fetch + manage nudge state |
| `apps/ios/Seder/Seder/Views/Income/NudgeSection.swift` | Swipeable nudge cards UI |

### iOS Files (modified)
| File | Change |
|------|--------|
| `apps/ios/Seder/Seder/Views/Income/IncomeListView.swift` | Add NudgeSection at top of list |
| `apps/ios/Seder/Seder/Services/APIClient.swift` | Add nudge API methods |

---

## Chunk 1: Data Model & Nudge Computation Engine

### Task 1: Add nudge types and dismissed_nudges table to schema

**Files:**
- Create: `apps/web/lib/nudges/types.ts`
- Modify: `apps/web/db/schema.ts`

- [ ] **Step 1: Create nudge type definitions**

Create `apps/web/lib/nudges/types.ts`:

```typescript
export const nudgeTypes = [
  "uninvoiced",
  "batch_invoice",
  "overdue_payment",
  "way_overdue",
  "partial_stale",
  "unlogged_calendar",
  "month_end",
] as const;

export type NudgeType = (typeof nudgeTypes)[number];

export interface Nudge {
  id: string; // composite key for dedup: `${nudgeType}:${entryId || periodKey}`
  nudgeType: NudgeType;
  entryId: string | null;       // null for aggregate nudges
  periodKey: string | null;     // e.g. '2026-W11', '2026-03' for aggregate nudges
  priority: number;             // lower = higher priority (1=overdue, 2=uninvoiced, 3=suggestion)
  title: string;                // Hebrew display title
  description: string;          // Hebrew description with amounts/dates
  actionType: "mark_sent" | "mark_paid" | "import_calendar" | "view_entry";
  entryDescription?: string;    // entry description for context
  clientName?: string;
  amountGross?: number;
  daysSince?: number;           // days since the triggering event
}

export interface NudgePushPreferences {
  uninvoiced: boolean;
  batch_invoice: boolean;
  overdue_payment: boolean;
  way_overdue: boolean;
  partial_stale: boolean;
  unlogged_calendar: boolean;
  month_end: boolean;
}

export const DEFAULT_NUDGE_PUSH_PREFS: NudgePushPreferences = {
  uninvoiced: true,
  batch_invoice: true,
  overdue_payment: true,
  way_overdue: true,
  partial_stale: true,
  unlogged_calendar: false,
  month_end: true,
};

export const DEFAULT_NUDGE_INVOICE_DAYS = 3;
export const DEFAULT_NUDGE_PAYMENT_DAYS = 14;
```

- [ ] **Step 2: Add dismissed_nudges table and nudge settings to schema**

In `apps/web/db/schema.ts`, add after the `deviceTokens` table:

```typescript
// Dismissed/snoozed nudges for the Smart Nudges system
export const dismissedNudges = pgTable("dismissed_nudges", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  entryId: uuid("entry_id").references(() => incomeEntries.id, { onDelete: "cascade" }),
  nudgeType: varchar("nudge_type", { length: 30 }).notNull(),
  periodKey: varchar("period_key", { length: 20 }),
  dismissedAt: timestamp("dismissed_at").defaultNow().notNull(),
  snoozeUntil: timestamp("snooze_until"),
  lastPushedAt: timestamp("last_pushed_at"),
}, (table) => ({
  userEntryTypeUnique: uniqueIndex("dismissed_nudges_user_entry_type_key")
    .on(table.userId, table.entryId, table.nudgeType),
  userTypePeriodUnique: uniqueIndex("dismissed_nudges_user_type_period_key")
    .on(table.userId, table.nudgeType, table.periodKey),
  userIdx: index("dismissed_nudges_user_idx").on(table.userId),
}));

export type DismissedNudge = typeof dismissedNudges.$inferSelect;
```

Add nudge settings columns to `userSettings` — modify the existing table definition by adding these columns:

```typescript
  nudgeInvoiceDays: numeric("nudge_invoice_days", { precision: 3, scale: 0 }).default("3"),
  nudgePaymentDays: numeric("nudge_payment_days", { precision: 3, scale: 0 }).default("14"),
  nudgePushEnabled: json("nudge_push_enabled").$type<NudgePushPreferences>(),
```

Import `NudgePushPreferences` from `@/lib/nudges/types` at the top of schema.ts.

- [ ] **Step 3: Generate and run migration**

```bash
cd apps/web && pnpm db:generate
```

Review the generated migration, then:

```bash
pnpm db:push
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/nudges/types.ts apps/web/db/schema.ts drizzle/
git commit -m "feat(nudges): add nudge types and dismissed_nudges schema"
```

---

### Task 2: Write nudge computation engine with tests

**Files:**
- Create: `apps/web/lib/nudges/__tests__/compute.test.ts`
- Create: `apps/web/lib/nudges/compute.ts`

- [ ] **Step 1: Write failing tests for nudge computation**

Create `apps/web/lib/nudges/__tests__/compute.test.ts`:

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { computeNudges } from "../compute";
import type { NudgePushPreferences } from "../types";
import { DEFAULT_NUDGE_PUSH_PREFS } from "../types";

// Minimal income entry shape for testing
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

  it("skips fully paid entries", () => {
    const entries = [baseEntry({
      invoiceStatus: "paid",
      paymentStatus: "paid",
      date: "2026-02-01",
    })];
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges).toHaveLength(0);
  });

  it("includes entry at exact threshold boundary (>= not >)", () => {
    const entries = [baseEntry({ date: "2026-03-09" })]; // exactly 3 days ago
    const nudges = computeNudges(entries, [], defaultSettings);
    expect(nudges).toHaveLength(1);
    expect(nudges[0].nudgeType).toBe("uninvoiced");
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

  afterEach(() => {
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/web && pnpm vitest run lib/nudges/__tests__/compute.test.ts
```

Expected: FAIL — module `../compute` does not exist.

- [ ] **Step 3: Implement the nudge computation engine**

Create `apps/web/lib/nudges/compute.ts`:

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
}

interface NudgeSettings {
  nudgeInvoiceDays: number;
  nudgePaymentDays: number;
}

const PRIORITY: Record<NudgeType, number> = {
  way_overdue: 1,
  overdue_payment: 2,
  partial_stale: 3,
  uninvoiced: 4,
  batch_invoice: 5,
  month_end: 6,
  unlogged_calendar: 7,
};

function daysBetween(dateStr: string | Date, now: Date): number {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function isLastDaysOfMonth(now: Date, days: number): boolean {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return now.getDate() > lastDay - days;
}

function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function getMonthEndPeriodKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
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

    // Match by entryId for per-entry nudges
    if (entryId && d.entryId === entryId) {
      // If snoozed and snooze expired, it's NOT dismissed
      if (d.snoozeUntil && d.snoozeUntil < now) return false;
      return true;
    }

    // Match by periodKey for aggregate nudges
    if (periodKey && d.periodKey === periodKey) {
      if (d.snoozeUntil && d.snoozeUntil < now) return false;
      return true;
    }

    return false;
  });
}

function formatCurrency(amount: string): string {
  return `₪${Number(amount).toLocaleString("he-IL")}`;
}

export function computeNudges(
  entries: NudgeEntry[],
  dismissed: DismissedState[],
  settings: NudgeSettings
): Nudge[] {
  const now = new Date();
  const nudges: Nudge[] = [];
  let hasUninvoicedGigs = false;
  const uninvoicedEntries: NudgeEntry[] = [];

  for (const entry of entries) {
    if (entry.invoiceStatus === "cancelled") continue;
    if (entry.invoiceStatus === "paid" && entry.paymentStatus === "paid") continue;

    // --- Uninvoiced gig ---
    if (entry.invoiceStatus === "draft") {
      const days = daysBetween(entry.date, now);
      if (days >= settings.nudgeInvoiceDays) {
        hasUninvoicedGigs = true;
        uninvoicedEntries.push(entry);
        if (!isDismissed(dismissed, "uninvoiced", entry.id, null, now)) {
          nudges.push({
            id: `uninvoiced:${entry.id}`,
            nudgeType: "uninvoiced",
            entryId: entry.id,
            periodKey: null,
            priority: PRIORITY.uninvoiced,
            title: "עבודה ללא חשבונית",
            description: `${entry.description} (${formatCurrency(entry.amountGross)}) — ${days} ימים בלי חשבונית`,
            actionType: "mark_sent",
            entryDescription: entry.description,
            clientName: entry.clientName,
            amountGross: Number(entry.amountGross),
            daysSince: days,
          });
        }
      }
    }

    // --- Overdue payment / Way overdue ---
    if (entry.invoiceStatus === "sent" && entry.paymentStatus !== "paid") {
      const sentDate = entry.invoiceSentDate || entry.updatedAt;
      const days = daysBetween(sentDate, now);

      // Way overdue (30+ days)
      if (days >= 30) {
        if (!isDismissed(dismissed, "way_overdue", entry.id, null, now)) {
          nudges.push({
            id: `way_overdue:${entry.id}`,
            nudgeType: "way_overdue",
            entryId: entry.id,
            periodKey: null,
            priority: PRIORITY.way_overdue,
            title: "תשלום באיחור חמור",
            description: `${entry.clientName} — ${formatCurrency(entry.amountGross)} — ${days} יום מאז שליחת החשבונית`,
            actionType: "mark_paid",
            entryDescription: entry.description,
            clientName: entry.clientName,
            amountGross: Number(entry.amountGross),
            daysSince: days,
          });
        }
      }
      // Overdue payment (14+ days, but not way_overdue)
      else if (days >= settings.nudgePaymentDays) {
        if (!isDismissed(dismissed, "overdue_payment", entry.id, null, now)) {
          nudges.push({
            id: `overdue_payment:${entry.id}`,
            nudgeType: "overdue_payment",
            entryId: entry.id,
            periodKey: null,
            priority: PRIORITY.overdue_payment,
            title: "ממתין לתשלום",
            description: `${entry.clientName} — ${formatCurrency(entry.amountGross)} — ${days} יום מאז שליחת החשבונית`,
            actionType: "mark_paid",
            entryDescription: entry.description,
            clientName: entry.clientName,
            amountGross: Number(entry.amountGross),
            daysSince: days,
          });
        }
      }

      // Partial payment stale
      if (entry.paymentStatus === "partial") {
        const lastActivity = daysBetween(entry.updatedAt, now);
        if (lastActivity >= settings.nudgePaymentDays) {
          if (!isDismissed(dismissed, "partial_stale", entry.id, null, now)) {
            nudges.push({
              id: `partial_stale:${entry.id}`,
              nudgeType: "partial_stale",
              entryId: entry.id,
              periodKey: null,
              priority: PRIORITY.partial_stale,
              title: "תשלום חלקי תקוע",
              description: `${entry.clientName} — שולם חלקית, ${lastActivity} יום בלי פעילות`,
              actionType: "mark_paid",
              entryDescription: entry.description,
              clientName: entry.clientName,
              amountGross: Number(entry.amountGross),
              daysSince: lastActivity,
            });
          }
        }
      }
    }
  }

  // --- Batch invoice reminder (weekly aggregate) ---
  const weekDay = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
  if ((weekDay === 0 || weekDay === 5) && uninvoicedEntries.length >= 2) {
    const weekNum = getISOWeek(now);
    const periodKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
    if (!isDismissed(dismissed, "batch_invoice", null, periodKey, now)) {
      const totalAmount = uninvoicedEntries.reduce((sum, e) => sum + Number(e.amountGross), 0);
      nudges.push({
        id: `batch_invoice:${periodKey}`,
        nudgeType: "batch_invoice",
        entryId: null,
        periodKey,
        priority: PRIORITY.batch_invoice,
        title: "עבודות ממתינות לחשבונית",
        description: `יש ${uninvoicedEntries.length} עבודות בסך ${formatCurrency(String(totalAmount))} שממתינות לחשבונית`,
        actionType: "view_entry",
      });
    }
  }

  // --- Month-end closing nudge (aggregate) ---
  if (isLastDaysOfMonth(now, 3) && hasUninvoicedGigs) {
    const periodKey = getMonthEndPeriodKey(now);
    if (!isDismissed(dismissed, "month_end", null, periodKey, now)) {
      nudges.push({
        id: `month_end:${periodKey}`,
        nudgeType: "month_end",
        entryId: null,
        periodKey,
        priority: PRIORITY.month_end,
        title: "סוף חודש מתקרב",
        description: `יש ${uninvoicedEntries.length} עבודות בלי חשבונית לפני סוף החודש`,
        actionType: "view_entry",
      });
    }
  }

  // Sort by priority (lower number = higher priority)
  nudges.sort((a, b) => a.priority - b.priority);

  return nudges;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/web && pnpm vitest run lib/nudges/__tests__/compute.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/nudges/
git commit -m "feat(nudges): add nudge computation engine with tests"
```

---

### Task 3: Add nudge database queries

**Files:**
- Create: `apps/web/lib/nudges/queries.ts`

- [ ] **Step 1: Create database query functions**

Create `apps/web/lib/nudges/queries.ts`:

```typescript
import { db } from "@/db/client";
import { incomeEntries, dismissedNudges, userSettings } from "@/db/schema";
import { eq, and, or, lt, isNull, ne } from "drizzle-orm";
import { DEFAULT_NUDGE_INVOICE_DAYS, DEFAULT_NUDGE_PAYMENT_DAYS, DEFAULT_NUDGE_PUSH_PREFS } from "./types";
import type { NudgePushPreferences } from "./types";

/**
 * Fetch entries that could generate nudges:
 * - drafts (potential uninvoiced nudges)
 * - sent + not fully paid (potential overdue/partial nudges)
 * Excludes cancelled and fully-paid entries.
 */
export async function fetchNudgeableEntries(userId: string) {
  return db
    .select()
    .from(incomeEntries)
    .where(
      and(
        eq(incomeEntries.userId, userId),
        ne(incomeEntries.invoiceStatus, "cancelled"),
        // Include drafts OR sent-but-not-paid
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

/**
 * Fetch all active dismissed/snoozed nudges for a user.
 * Permanently dismissed (snoozeUntil IS NULL) are always returned.
 * Snoozed nudges are always returned — the compute engine checks expiry.
 */
export async function fetchDismissedNudges(userId: string) {
  return db
    .select()
    .from(dismissedNudges)
    .where(eq(dismissedNudges.userId, userId));
}

/**
 * Get user's nudge settings with defaults.
 */
export async function getNudgeSettings(userId: string) {
  const [settings] = await db
    .select({
      nudgeInvoiceDays: userSettings.nudgeInvoiceDays,
      nudgePaymentDays: userSettings.nudgePaymentDays,
      nudgePushEnabled: userSettings.nudgePushEnabled,
    })
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return {
    nudgeInvoiceDays: settings?.nudgeInvoiceDays
      ? Number(settings.nudgeInvoiceDays)
      : DEFAULT_NUDGE_INVOICE_DAYS,
    nudgePaymentDays: settings?.nudgePaymentDays
      ? Number(settings.nudgePaymentDays)
      : DEFAULT_NUDGE_PAYMENT_DAYS,
    nudgePushEnabled: (settings?.nudgePushEnabled ?? DEFAULT_NUDGE_PUSH_PREFS) as NudgePushPreferences,
  };
}

/**
 * Dismiss or snooze a nudge.
 * Uses upsert to handle re-dismissing a previously snoozed nudge.
 */
export async function dismissNudge(
  userId: string,
  nudgeType: string,
  entryId: string | null,
  periodKey: string | null,
  snoozeUntil: Date | null
) {
  // Use separate paths for per-entry vs aggregate nudges to match the correct unique index
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

/**
 * Update lastPushedAt for a nudge (push dedup tracking).
 */
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

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/nudges/queries.ts
git commit -m "feat(nudges): add database query functions for nudge system"
```

---

### Task 4: Wire up getNudgesForUser in income data layer

**Files:**
- Modify: `apps/web/app/income/data.ts`

- [ ] **Step 1: Add getNudgesForUser function**

Add to the end of `apps/web/app/income/data.ts`:

```typescript
import { computeNudges } from "@/lib/nudges/compute";
import { fetchNudgeableEntries, fetchDismissedNudges, getNudgeSettings } from "@/lib/nudges/queries";
import type { Nudge } from "@/lib/nudges/types";

/**
 * Compute all active nudges for a user.
 * Fetches nudgeable entries, dismissed state, and settings, then runs computation.
 *
 * NOTE: This coexists with the existing `getAttentionItems()` function which serves
 * the analytics "needs attention" table. They are complementary:
 * - getAttentionItems: month-scoped, used for analytics KPIs, fixed 30-day threshold
 * - getNudgesForUser: cross-month, configurable thresholds, dismiss/snooze state
 * Both can coexist for Phase 1. Consider unifying later.
 */
export async function getNudgesForUser(userId: string): Promise<Nudge[]> {
  const [entries, dismissed, settings] = await Promise.all([
    fetchNudgeableEntries(userId),
    fetchDismissedNudges(userId),
    getNudgeSettings(userId),
  ]);

  return computeNudges(entries, dismissed, settings);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/income/data.ts
git commit -m "feat(nudges): wire up getNudgesForUser in income data layer"
```

---

## Chunk 2: Web UI — Nudge Banner & Server Actions

### Task 5: Create nudge server actions

**Files:**
- Create: `apps/web/app/income/actions-nudges.ts`

- [ ] **Step 1: Create nudge dismiss/snooze server actions**

Create `apps/web/app/income/actions-nudges.ts`:

```typescript
"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { dismissNudge } from "@/lib/nudges/queries";
import { revalidatePath } from "next/cache";

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function dismissNudgeAction(
  nudgeType: string,
  entryId: string | null,
  periodKey: string | null
) {
  const userId = await requireUserId();
  await dismissNudge(userId, nudgeType, entryId, periodKey, null);
  revalidatePath("/income");
}

export async function snoozeNudgeAction(
  nudgeType: string,
  entryId: string | null,
  periodKey: string | null
) {
  const userId = await requireUserId();
  const snoozeUntil = new Date();
  snoozeUntil.setDate(snoozeUntil.getDate() + 3);
  await dismissNudge(userId, nudgeType, entryId, periodKey, snoozeUntil);
  revalidatePath("/income");
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/income/actions-nudges.ts
git commit -m "feat(nudges): add dismiss and snooze server actions"
```

---

### Task 6: Build the NudgeBanner component

**Files:**
- Create: `apps/web/app/income/components/NudgeBanner.tsx`

- [ ] **Step 1: Create the NudgeBanner component**

Create `apps/web/app/income/components/NudgeBanner.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, X, Clock, FileText, Wallet, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dismissNudgeAction, snoozeNudgeAction } from "../actions-nudges";
import type { Nudge } from "@/lib/nudges/types";

interface NudgeBannerProps {
  nudges: Nudge[];
}

const nudgeIcon: Record<string, typeof FileText> = {
  uninvoiced: FileText,
  batch_invoice: FileText,
  overdue_payment: Wallet,
  way_overdue: AlertTriangle,
  partial_stale: Wallet,
  unlogged_calendar: Calendar,
  month_end: Clock,
};

const nudgeColor: Record<string, string> = {
  uninvoiced: "text-sky-600 bg-sky-50",
  batch_invoice: "text-sky-600 bg-sky-50",
  overdue_payment: "text-orange-600 bg-orange-50",
  way_overdue: "text-red-600 bg-red-50",
  partial_stale: "text-orange-600 bg-orange-50",
  unlogged_calendar: "text-purple-600 bg-purple-50",
  month_end: "text-amber-600 bg-amber-50",
};

export function NudgeBanner({ nudges }: NudgeBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [localDismissed, setLocalDismissed] = useState<Set<string>>(new Set());

  const visibleNudges = nudges.filter((n) => !localDismissed.has(n.id));

  if (visibleNudges.length === 0) return null;

  function handleDismiss(nudge: Nudge) {
    setLocalDismissed((prev) => new Set(prev).add(nudge.id));
    startTransition(() => {
      dismissNudgeAction(nudge.nudgeType, nudge.entryId, nudge.periodKey);
    });
  }

  function handleSnooze(nudge: Nudge) {
    setLocalDismissed((prev) => new Set(prev).add(nudge.id));
    startTransition(() => {
      snoozeNudgeAction(nudge.nudgeType, nudge.entryId, nudge.periodKey);
    });
  }

  const actionLabel: Record<string, string> = {
    mark_sent: "שלח חשבונית",
    mark_paid: "סמן כשולם",
    import_calendar: "ייבא מהיומן",
    view_entry: "צפה",
  };

  return (
    <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl mb-4" dir="rtl">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-start"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="font-medium text-amber-900 text-sm">
            {visibleNudges.length} פריטים דורשים טיפול
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-amber-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-600" />
        )}
      </button>

      {/* Expandable list */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {visibleNudges.map((nudge) => {
            const Icon = nudgeIcon[nudge.nudgeType] || FileText;
            const colorClass = nudgeColor[nudge.nudgeType] || "text-slate-600 bg-slate-50";

            return (
              <div
                key={nudge.id}
                className="flex items-center gap-3 bg-white rounded-lg p-3 border border-slate-100"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">
                    {nudge.title}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {nudge.description}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2 text-slate-400 hover:text-slate-600"
                    onClick={() => handleSnooze(nudge)}
                    disabled={isPending}
                  >
                    <Clock className="w-3 h-3 me-1" />
                    אח״כ
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                    onClick={() => handleDismiss(nudge)}
                    disabled={isPending}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/income/components/NudgeBanner.tsx
git commit -m "feat(nudges): add NudgeBanner component for income page"
```

---

### Task 7: Wire NudgeBanner into the income page

**Files:**
- Modify: `apps/web/app/income/page.tsx`
- Modify: `apps/web/app/income/IncomePageClient.tsx`

- [ ] **Step 1: Fetch nudges in the server component**

Read `apps/web/app/income/page.tsx` to understand the current data fetching pattern. Add a `getNudgesForUser` call alongside existing data fetches and pass the result to `IncomePageClient`.

In `page.tsx`, add to the imports:
```typescript
import { getNudgesForUser } from "./data";
```

Add to the data fetching (alongside existing `Promise.all`):
```typescript
const nudges = await getNudgesForUser(session.user.id);
```

Pass to client component:
```typescript
<IncomePageClient ... nudges={nudges} />
```

- [ ] **Step 2: Add NudgeBanner to IncomePageClient**

In `IncomePageClient.tsx`, add to the imports:
```typescript
import { NudgeBanner } from "./components/NudgeBanner";
import type { Nudge } from "@/lib/nudges/types";
```

Add `nudges` to the component props interface:
```typescript
nudges: Nudge[];
```

Render `<NudgeBanner nudges={nudges} />` above the existing income entry list/table, after KPICards and before IncomeTable.

- [ ] **Step 3: Verify the income page loads without errors**

```bash
cd apps/web && pnpm dev
```

Open `http://localhost:3001/income` in the browser. Verify:
- Page loads without console errors
- If no nudges exist, no banner appears
- If nudges exist, collapsible banner shows at top

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/income/page.tsx apps/web/app/income/IncomePageClient.tsx
git commit -m "feat(nudges): wire NudgeBanner into income page"
```

---

## Chunk 3: Settings UI & Push Notification Cron

### Task 8: Add notifications settings section

**Files:**
- Create: `apps/web/app/settings/components/NotificationsSection.tsx`
- Modify: `apps/web/app/settings/page.tsx`
- Modify: `apps/web/app/settings/actions.ts`

- [ ] **Step 1: Add updateNudgeSettings server action**

In `apps/web/app/settings/actions.ts`, add:

```typescript
import type { NudgePushPreferences } from "@/lib/nudges/types";

export async function updateNudgeSettings(data: {
  nudgeInvoiceDays: number;
  nudgePaymentDays: number;
  nudgePushEnabled: NudgePushPreferences;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .update(userSettings)
    .set({
      nudgeInvoiceDays: String(data.nudgeInvoiceDays),
      nudgePaymentDays: String(data.nudgePaymentDays),
      nudgePushEnabled: data.nudgePushEnabled,
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, session.user.id));

  revalidatePath("/settings");
}
```

- [ ] **Step 2: Create NotificationsSection component**

Create `apps/web/app/settings/components/NotificationsSection.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateNudgeSettings } from "../actions";
import type { NudgePushPreferences } from "@/lib/nudges/types";
import { DEFAULT_NUDGE_PUSH_PREFS } from "@/lib/nudges/types";

interface NotificationsSectionProps {
  initialSettings: {
    nudgeInvoiceDays: number;
    nudgePaymentDays: number;
    nudgePushEnabled: NudgePushPreferences;
  };
}

const pushLabels: Record<keyof NudgePushPreferences, string> = {
  uninvoiced: "עבודות ללא חשבונית",
  batch_invoice: "תזכורת שבועית לחשבוניות",
  overdue_payment: "תשלומים באיחור",
  way_overdue: "תשלומים באיחור חמור",
  partial_stale: "תשלום חלקי תקוע",
  unlogged_calendar: "אירועי יומן לא מיובאים",
  month_end: "תזכורת סוף חודש",
};

export function NotificationsSection({ initialSettings }: NotificationsSectionProps) {
  const [invoiceDays, setInvoiceDays] = useState(initialSettings.nudgeInvoiceDays);
  const [paymentDays, setPaymentDays] = useState(initialSettings.nudgePaymentDays);
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
        nudgeInvoiceDays: invoiceDays,
        nudgePaymentDays: paymentDays,
        nudgePushEnabled: pushPrefs,
      });
    });
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle>ספים לתזכורות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>ימים עד תזכורת חשבונית</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={invoiceDays}
              onChange={(e) => setInvoiceDays(Number(e.target.value))}
              className="w-20 text-center"
              dir="ltr"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>ימים עד תזכורת תשלום</Label>
            <Input
              type="number"
              min={1}
              max={60}
              value={paymentDays}
              onChange={(e) => setPaymentDays(Number(e.target.value))}
              className="w-20 text-center"
              dir="ltr"
            />
          </div>
        </CardContent>
      </Card>

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

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "שומר..." : "שמור שינויים"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Add notifications tab to settings page**

In `apps/web/app/settings/page.tsx`, add the "notifications" tab to the tabs array and render `NotificationsSection` when selected. Fetch nudge settings server-side and pass as props.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/settings/components/NotificationsSection.tsx apps/web/app/settings/page.tsx apps/web/app/settings/actions.ts
git commit -m "feat(nudges): add notifications settings section"
```

---

### Task 9: Refactor overdue cron to use nudge system

**Files:**
- Modify: `apps/web/app/api/cron/overdue-notifications/route.ts`

- [ ] **Step 1: Refactor the cron to use nudge computation**

Replace the contents of `apps/web/app/api/cron/overdue-notifications/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { sendPushToUser } from "@/lib/pushNotifications";
import { apiSuccess, apiError } from "../../v1/_lib/response";
import { fetchNudgeableEntries, fetchDismissedNudges, getNudgeSettings, markNudgePushed } from "@/lib/nudges/queries";
import { computeNudges } from "@/lib/nudges/compute";
import type { NudgeType } from "@/lib/nudges/types";

// Push thresholds: only push for high-priority nudges
const PUSH_NUDGE_TYPES: NudgeType[] = [
  "overdue_payment",
  "way_overdue",
  "uninvoiced",
  "batch_invoice",
  "month_end",
];

// Only push uninvoiced at 7+ days (higher than in-app 3-day threshold)
const PUSH_UNINVOICED_MIN_DAYS = 7;

const MAX_PUSH_PER_USER = 2;

const nudgeMessages: Record<NudgeType, { title: string; bodyFn: (count: number) => string }> = {
  way_overdue: {
    title: "תשלומים באיחור חמור",
    bodyFn: (c) => `יש לך ${c} חשבוניות שלא שולמו מעל 30 יום`,
  },
  overdue_payment: {
    title: "ממתין לתשלום",
    bodyFn: (c) => `יש לך ${c} חשבוניות שממתינות לתשלום`,
  },
  uninvoiced: {
    title: "עבודות ללא חשבונית",
    bodyFn: (c) => `יש לך ${c} עבודות בלי חשבונית כבר מעל שבוע`,
  },
  batch_invoice: {
    title: "עבודות ממתינות לחשבונית",
    bodyFn: (c) => `יש לך ${c} עבודות שממתינות לחשבונית השבוע`,
  },
  month_end: {
    title: "סוף חודש מתקרב",
    bodyFn: (c) => `יש ${c} עבודות בלי חשבונית לפני סוף החודש`,
  },
  partial_stale: {
    title: "תשלום חלקי תקוע",
    bodyFn: (c) => `יש לך ${c} תשלומים חלקיים תקועים`,
  },
  unlogged_calendar: {
    title: "אירועים לא מיובאים",
    bodyFn: (c) => `יש ${c} אירועים מהיומן שלא יובאו`,
  },
};

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Get all users
    const users = await db.select({ id: user.id }).from(user);

    let notificationsSent = 0;

    for (const u of users) {
      const settings = await getNudgeSettings(u.id);
      const [entries, dismissed] = await Promise.all([
        fetchNudgeableEntries(u.id),
        fetchDismissedNudges(u.id),
      ]);

      const nudges = computeNudges(entries, dismissed, settings);

      // Filter to push-eligible nudges
      const pushable = nudges.filter((n) => {
        if (!PUSH_NUDGE_TYPES.includes(n.nudgeType)) return false;
        if (!settings.nudgePushEnabled[n.nudgeType]) return false;
        // Uninvoiced only at 7+ days for push
        if (n.nudgeType === "uninvoiced" && (n.daysSince ?? 0) < PUSH_UNINVOICED_MIN_DAYS) return false;
        return true;
      });

      if (pushable.length === 0) continue;

      // Group by nudge type and send max MAX_PUSH_PER_USER notifications
      const byType = new Map<NudgeType, typeof pushable>();
      for (const n of pushable) {
        const arr = byType.get(n.nudgeType) || [];
        arr.push(n);
        byType.set(n.nudgeType, arr);
      }

      let sent = 0;
      for (const [type, typeNudges] of byType) {
        if (sent >= MAX_PUSH_PER_USER) break;

        // Check lastPushedAt dedup — skip if already pushed today
        const alreadyPushed = dismissed.some(
          (d) => d.nudgeType === type && d.lastPushedAt &&
            new Date().getTime() - new Date(d.lastPushedAt).getTime() < 24 * 60 * 60 * 1000
        );
        if (alreadyPushed) continue;

        const msg = nudgeMessages[type];
        await sendPushToUser(u.id, msg.title, msg.bodyFn(typeNudges.length), {
          type: "nudge",
          nudgeType: type,
        });

        // Mark as pushed for dedup
        for (const n of typeNudges) {
          await markNudgePushed(u.id, n.nudgeType, n.entryId, n.periodKey);
        }

        sent++;
        notificationsSent++;
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
git commit -m "refactor(nudges): use nudge engine in push notification cron"
```

---

## Chunk 4: REST API for iOS & iOS Implementation

### Task 10: Add nudge REST API for iOS

**Files:**
- Create: `apps/web/app/api/v1/nudges/route.ts`

- [ ] **Step 1: Create the nudge API endpoint**

Create `apps/web/app/api/v1/nudges/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { getNudgesForUser } from "@/app/income/data";
import { dismissNudge } from "@/lib/nudges/queries";

// GET /api/v1/nudges — fetch all active nudges for the user
export async function GET() {
  try {
    const userId = await requireAuth();
    const nudges = await getNudgesForUser(userId);
    return apiSuccess(nudges);
  } catch (error) {
    return apiError(error);
  }
}

// POST /api/v1/nudges/dismiss — dismiss or snooze a nudge
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();

    const { nudgeType, entryId, periodKey, snooze } = body as {
      nudgeType: string;
      entryId: string | null;
      periodKey: string | null;
      snooze?: boolean;
    };

    let snoozeUntil: Date | null = null;
    if (snooze) {
      snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + 3);
    }

    await dismissNudge(userId, nudgeType, entryId, periodKey, snoozeUntil);

    return apiSuccess({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/v1/nudges/route.ts
git commit -m "feat(nudges): add REST API endpoint for iOS nudge support"
```

---

### Task 11: Add iOS Nudge model

**Files:**
- Create: `apps/ios/Seder/Seder/Models/Nudge.swift`

- [ ] **Step 1: Create the Swift Nudge model**

Create `apps/ios/Seder/Seder/Models/Nudge.swift`:

```swift
import Foundation

nonisolated struct Nudge: Codable, Identifiable, Sendable {
    let id: String
    let nudgeType: String
    let entryId: String?
    let periodKey: String?
    let priority: Int
    let title: String
    let description: String
    let actionType: String
    let entryDescription: String?
    let clientName: String?
    let amountGross: Double?
    let daysSince: Int?
}

nonisolated struct DismissNudgeRequest: Codable, Sendable {
    let nudgeType: String
    let entryId: String?
    let periodKey: String?
    let snooze: Bool?
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Models/Nudge.swift
git commit -m "feat(ios): add Nudge Swift model"
```

---

### Task 12: Add iOS NudgeViewModel and API methods

**Files:**
- Create: `apps/ios/Seder/Seder/ViewModels/NudgeViewModel.swift`
- Modify: `apps/ios/Seder/Seder/Services/APIClient.swift`

- [ ] **Step 1: Add nudge API methods to APIClient**

In `apps/ios/Seder/Seder/Services/APIClient.swift`, add:

```swift
// MARK: - Nudges

func fetchNudges() async throws -> [Nudge] {
    return try await request(endpoint: "/api/v1/nudges", method: "GET")
}

func dismissNudge(_ nudgeType: String, entryId: String?, periodKey: String?, snooze: Bool = false) async throws {
    let body = DismissNudgeRequest(
        nudgeType: nudgeType,
        entryId: entryId,
        periodKey: periodKey,
        snooze: snooze
    )
    let _: EmptyData = try await request(endpoint: "/api/v1/nudges", method: "POST", body: body)
}
```

Check existing `APIClient.swift` for the exact `request` method signature and `EmptyResponse` type — adapt as needed.

- [ ] **Step 2: Create NudgeViewModel**

Create `apps/ios/Seder/Seder/ViewModels/NudgeViewModel.swift`:

```swift
import Foundation
import SwiftUI

@MainActor
class NudgeViewModel: ObservableObject {
    @Published var nudges: [Nudge] = []
    @Published var isLoading = false

    private let apiClient = APIClient.shared

    func fetchNudges() async {
        isLoading = true
        defer { isLoading = false }

        do {
            nudges = try await apiClient.fetchNudges()
        } catch {
            print("Failed to fetch nudges: \(error)")
            nudges = []
        }
    }

    func dismiss(_ nudge: Nudge) {
        withAnimation {
            nudges.removeAll { $0.id == nudge.id }
        }
        Task {
            try? await apiClient.dismissNudge(
                nudge.nudgeType,
                entryId: nudge.entryId,
                periodKey: nudge.periodKey
            )
        }
    }

    func snooze(_ nudge: Nudge) {
        withAnimation {
            nudges.removeAll { $0.id == nudge.id }
        }
        Task {
            try? await apiClient.dismissNudge(
                nudge.nudgeType,
                entryId: nudge.entryId,
                periodKey: nudge.periodKey,
                snooze: true
            )
        }
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Seder/Seder/ViewModels/NudgeViewModel.swift apps/ios/Seder/Seder/Services/APIClient.swift
git commit -m "feat(ios): add NudgeViewModel and API methods"
```

---

### Task 13: Build iOS NudgeSection view and wire into IncomeListView

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Income/NudgeSection.swift`
- Modify: `apps/ios/Seder/Seder/Views/Income/IncomeListView.swift`

- [ ] **Step 1: Create NudgeSection view**

Create `apps/ios/Seder/Seder/Views/Income/NudgeSection.swift`. Reference existing `apps/ios/Seder/Seder/Theme.swift` for colors and fonts. The section should:

- Display a collapsible header "X פריטים דורשים טיפול" with a chevron
- Show nudge cards in a `LazyVStack`
- Each card: icon (SF Symbol based on nudge type), title, description, swipe actions (dismiss, snooze)
- Use `swipeActions` modifier: leading = snooze (clock icon), trailing = dismiss (X)
- Color-code by nudge type (use Theme colors)
- Hebrew RTL layout (HStack — remember first item = RIGHT side in RTL)

```swift
import SwiftUI

struct NudgeSection: View {
    @ObservedObject var viewModel: NudgeViewModel
    @State private var isExpanded = false

    var body: some View {
        if !viewModel.nudges.isEmpty {
            VStack(spacing: 0) {
                // Header
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isExpanded.toggle()
                    }
                } label: {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                            .font(.system(size: 14))
                        Text("\(viewModel.nudges.count) פריטים דורשים טיפול")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.primary)
                        Spacer()
                        Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                            .foregroundColor(.secondary)
                            .font(.system(size: 12))
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }

                if isExpanded {
                    ForEach(viewModel.nudges) { nudge in
                        NudgeCard(nudge: nudge)
                            .swipeActions(edge: .leading) {
                                Button {
                                    viewModel.snooze(nudge)
                                } label: {
                                    Label("אח״כ", systemImage: "clock")
                                }
                                .tint(.blue)
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    viewModel.dismiss(nudge)
                                } label: {
                                    Label("סגור", systemImage: "xmark")
                                }
                            }
                    }
                }
            }
            .background(Color.orange.opacity(0.05))
            .cornerRadius(12)
            .padding(.horizontal, 12)
            .padding(.bottom, 8)
        }
    }
}

struct NudgeCard: View {
    let nudge: Nudge

    private var iconName: String {
        switch nudge.nudgeType {
        case "uninvoiced": return "doc.text"
        case "overdue_payment": return "creditcard"
        case "way_overdue": return "exclamationmark.triangle"
        case "partial_stale": return "creditcard"
        case "unlogged_calendar": return "calendar"
        case "month_end": return "clock"
        default: return "bell"
        }
    }

    private var iconColor: Color {
        switch nudge.nudgeType {
        case "uninvoiced": return .blue
        case "overdue_payment": return .orange
        case "way_overdue": return .red
        case "partial_stale": return .orange
        case "unlogged_calendar": return .purple
        case "month_end": return .yellow
        default: return .gray
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: iconName)
                .foregroundColor(iconColor)
                .font(.system(size: 16))
                .frame(width: 32, height: 32)
                .background(iconColor.opacity(0.1))
                .cornerRadius(8)

            // Text
            VStack(alignment: .leading, spacing: 2) {
                Text(nudge.title)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.primary)
                Text(nudge.description)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
}
```

- [ ] **Step 2: Wire NudgeSection into IncomeListView**

In `apps/ios/Seder/Seder/Views/Income/IncomeListView.swift`:

Add a `@StateObject private var nudgeVM = NudgeViewModel()` property.

Add `NudgeSection(viewModel: nudgeVM)` at the top of the income list, before the entries. Call `nudgeVM.fetchNudges()` in the same `.task` modifier where other data is fetched.

- [ ] **Step 3: Verify in Xcode**

Open `apps/ios/Seder/Seder.xcodeproj` in Xcode. Build and run on simulator. Verify:
- NudgeSection appears at top of income list when nudges exist
- Swipe actions work (dismiss/snooze)
- Section is collapsible

- [ ] **Step 4: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Income/NudgeSection.swift apps/ios/Seder/Seder/Views/Income/IncomeListView.swift
git commit -m "feat(ios): add NudgeSection to income list with swipe actions"
```

---

## Implementation Notes

**`unlogged_calendar` nudge:** The type is defined but computation is NOT implemented in `computeNudges`. This nudge requires a calendar fetch (Google Calendar API call) which is side-effectful and shouldn't live in the pure computation engine. Implementation: extend `getNudgesForUser` in `data.ts` to check for unlogged calendar events by calling the existing auto-sync endpoint and comparing fetched events against imported entries (via `calendarEventId`). If the user's OAuth token is expired, skip silently. This can be added as a follow-up task after the core nudge system is working.

**Cron performance:** The refactored cron queries each user individually (3 queries per user). This is fine for the current small user base. If user count grows significantly, batch the queries: fetch all nudgeable entries across all users in one query grouped by userId, and process in memory.

---

## Chunk 5: Final Integration & Verification

### Task 14: End-to-end verification

- [ ] **Step 1: Run all tests**

```bash
cd /Users/bareloved/Github/seder && pnpm test
```

Expected: All tests pass, including new nudge computation tests.

- [ ] **Step 2: Verify web app end-to-end**

```bash
cd apps/web && pnpm dev
```

Test manually:
1. Create a draft income entry dated 5+ days ago → nudge banner appears
2. Dismiss a nudge → it disappears, doesn't reappear on reload
3. Snooze a nudge → it disappears, reappears after snooze period
4. Mark entry as "sent" and wait threshold → overdue nudge appears
5. Check Settings → Notifications tab → toggle push prefs, change thresholds, save

- [ ] **Step 3: Verify iOS app**

Open Xcode, build and run on simulator:
1. NudgeSection appears with entries from API
2. Swipe to dismiss works
3. Swipe to snooze works
4. Collapsible header works
5. Tab badge shows nudge count

- [ ] **Step 4: Run build to verify no type errors**

```bash
cd /Users/bareloved/Github/seder && pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(nudges): complete Smart Nudges Phase 1 implementation"
```
