# Client Intelligence (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the Clients page with per-client analytics — payment health, activity trends, income percentage, and late payment rate — turning the client list from a contact directory into a business intelligence tool.

**Architecture:** Extend the existing `ClientWithAnalytics` type with 7 new fields. All computation happens server-side in a single SQL query with CTEs. No new tables needed. The API, web UI, and iOS app all consume the extended type.

**Deferred scope:** The spec calls for a period selector for `incomePercentage` (scoped to selected period). This plan computes `incomePercentage` all-time for simplicity. A period selector can be added as a follow-up. The spec also mentions "Gig frequency" in the expandable detail — `activityTrend` covers this concept, so a separate frequency stat is not added.

**Tech Stack:** TypeScript, Drizzle ORM (PostgreSQL), Next.js Server Components/Actions, React, Swift/SwiftUI, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `packages/shared/src/types/client.ts` | Modify | Add new fields to `ClientWithAnalytics` |
| `packages/shared/src/utils/client-intelligence.ts` | Create | Pure `computePaymentHealth` and `computeActivityTrend` functions |
| `packages/shared/src/utils/index.ts` | Modify | Re-export new utils |
| `apps/web/app/clients/types.ts` | Modify | Add new fields to web `ClientWithAnalytics` |
| `apps/web/app/clients/data.ts` | Modify | Extend `getClientsWithAnalytics` SQL with new CTEs |
| `apps/web/app/clients/components/ClientAnalyticsPanel.tsx` | Modify | Add new stats, payment health dot, expandable detail |
| `apps/web/app/clients/ClientsPageClient.tsx` | Modify | Add new sort options, payment health dot on client rows |
| `apps/ios/Seder/Seder/Models/Client.swift` | Modify | Add new optional fields |
| `apps/ios/Seder/Seder/ViewModels/ClientsViewModel.swift` | Modify | Add new sort options |
| `apps/ios/Seder/Seder/Views/Clients/ClientsView.swift` | Modify | Payment health dot on rows, new stats in detail sheet |
| `packages/shared/src/utils/__tests__/client-intelligence.test.ts` | Create | Tests for pure computation functions |
| `apps/web/app/clients/__tests__/data.test.ts` | Create | Integration tests for analytics query |

---

## Chunk 1: Shared Types & Pure Logic

### Task 1: Extend `ClientWithAnalytics` type in shared package

**Files:**
- Modify: `packages/shared/src/types/client.ts:17-26`

- [ ] **Step 1: Add new fields to `ClientWithAnalytics`**

```typescript
// In packages/shared/src/types/client.ts
// Add these fields after the existing ones in ClientWithAnalytics:

export interface ClientWithAnalytics extends Client {
  // Existing fields (do NOT rename — iOS depends on these)
  totalEarned: number;
  thisMonthRevenue: number;
  thisYearRevenue: number;
  averagePerJob: number;
  jobCount: number;
  outstandingAmount: number;
  avgDaysToPayment: number | null;
  overdueInvoices: number;

  // New fields (Phase 2 — Client Intelligence)
  totalInvoiced: number;
  incomePercentage: number; // 0-100, for selected period
  latePaymentRate: number; // 0-100, uses fixed 30-day threshold
  lastGigDate: string | null; // ISO date
  lastActiveMonths: number | null; // months since last gig, null if no gigs
  activityTrend: "up" | "down" | "stable" | null; // null if < 2 gigs
  paymentHealth: "good" | "warning" | "bad";
}
```

- [ ] **Step 2: Build shared package**

Run: `cd packages/shared && pnpm build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types/client.ts
git commit -m "feat(shared): add Phase 2 client intelligence fields to ClientWithAnalytics"
```

---

### Task 2: Create pure computation utilities in shared package

**Files:**
- Create: `packages/shared/src/utils/client-intelligence.ts`
- Modify: `packages/shared/src/utils/index.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/shared/src/utils/__tests__/client-intelligence.test.ts`:

```typescript
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
    expect(computeActivityTrend(5, 2)).toBe("up"); // 150% increase
    expect(computeActivityTrend(3, 0)).toBe("up"); // all recent
  });

  it("returns 'down' when recent count is >20% lower", () => {
    expect(computeActivityTrend(2, 5)).toBe("down"); // 60% decrease
    expect(computeActivityTrend(0, 3)).toBe("down"); // all prior
  });

  it("returns 'stable' when within 20%", () => {
    expect(computeActivityTrend(5, 5)).toBe("stable");
    expect(computeActivityTrend(6, 5)).toBe("stable"); // 20% higher — exactly on boundary (1.2, not > 1.2)
    expect(computeActivityTrend(4, 5)).toBe("stable"); // 20% lower — edge
  });

  it("handles edge: both zero with prior gigs via totalGigs check", () => {
    // This shouldn't happen if totalGigs >= 2, but guard anyway
    expect(computeActivityTrend(0, 0)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/shared && pnpm vitest run src/utils/__tests__/client-intelligence.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement the utilities**

Create `packages/shared/src/utils/client-intelligence.ts`:

```typescript
/**
 * Compute payment health indicator for a client.
 * Evaluated in order — first match wins.
 *
 * Bad:     overdueInvoices >= 3 OR latePaymentRate >= 50%
 * Warning: overdueInvoices > 0 OR latePaymentRate >= 20%
 * Good:    everything else
 */
export function computePaymentHealth(
  overdueInvoices: number,
  latePaymentRate: number
): "good" | "warning" | "bad" {
  if (overdueInvoices >= 3 || latePaymentRate >= 50) return "bad";
  if (overdueInvoices > 0 || latePaymentRate >= 20) return "warning";
  return "good";
}

/**
 * Compute activity trend by comparing last 3 months gig count vs prior 3 months.
 *
 * up:    last3mo count > prior3mo by >20%
 * down:  last3mo count < prior3mo by >20%
 * stable: within 20%
 * null:  fewer than 2 gigs total
 */
export function computeActivityTrend(
  last3moCount: number,
  prior3moCount: number
): "up" | "down" | "stable" | null {
  const total = last3moCount + prior3moCount;
  if (total < 2) return null;

  // Handle zero in prior period
  if (prior3moCount === 0) return "up";
  if (last3moCount === 0) return "down";

  const ratio = last3moCount / prior3moCount;
  if (ratio > 1.2) return "up";
  if (ratio < 0.8) return "down";
  return "stable";
}
```

- [ ] **Step 4: Re-export from utils index**

Add to `packages/shared/src/utils/index.ts`:

```typescript
export { computePaymentHealth, computeActivityTrend } from "./client-intelligence";
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd packages/shared && pnpm vitest run src/utils/__tests__/client-intelligence.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Build shared package**

Run: `cd packages/shared && pnpm build`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/utils/client-intelligence.ts packages/shared/src/utils/__tests__/client-intelligence.test.ts packages/shared/src/utils/index.ts
git commit -m "feat(shared): add computePaymentHealth and computeActivityTrend utilities"
```

---

## Chunk 2: Web Data Layer — Extended SQL Query

### Task 3: Extend web `ClientWithAnalytics` type

**Files:**
- Modify: `apps/web/app/clients/types.ts:10-19`

- [ ] **Step 1: Add new fields to web ClientWithAnalytics**

The web `ClientWithAnalytics` extends `DBClient` (Drizzle-inferred) instead of shared `Client`. Add the same new fields:

```typescript
// In apps/web/app/clients/types.ts
export interface ClientWithAnalytics extends DBClient {
  // Existing
  totalEarned: number;
  thisMonthRevenue: number;
  thisYearRevenue: number;
  averagePerJob: number;
  jobCount: number;
  outstandingAmount: number;
  avgDaysToPayment: number | null;
  overdueInvoices: number;

  // New (Phase 2)
  totalInvoiced: number;
  incomePercentage: number;
  latePaymentRate: number;
  lastGigDate: string | null;
  lastActiveMonths: number | null;
  activityTrend: "up" | "down" | "stable" | null;
  paymentHealth: "good" | "warning" | "bad";
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/clients/types.ts
git commit -m "feat(web): extend ClientWithAnalytics type with Phase 2 fields"
```

---

### Task 4: Extend `getClientsWithAnalytics` SQL query

**Files:**
- Modify: `apps/web/app/clients/data.ts:205-257`

This is the core task. We extend the existing analytics query to compute the 7 new fields. The strategy:

1. Add `totalInvoiced` and `lastGigDate` to the existing aggregation
2. Add a `latePaymentRate` computation (% of entries where days-to-pay > 30)
3. Add a `last3moCount` and `prior3moCount` for activity trend (separate CTE)
4. Compute `incomePercentage` using a subquery for total user revenue
5. Derive `lastActiveMonths`, `activityTrend`, and `paymentHealth` in the JS mapping layer using shared utils

- [ ] **Step 1: Modify `getClientsWithAnalytics` in data.ts**

Replace the `getClientsWithAnalytics` function (lines 205-257) with:

```typescript
import { computePaymentHealth, computeActivityTrend } from "@seder/shared/utils";

export async function getClientsWithAnalytics(userId: string): Promise<ClientWithAnalytics[]> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const yearStart = `${currentYear}-01-01`;
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Date boundaries for activity trend (last 3mo vs prior 3mo)
  const threeMonthsAgo = new Date(currentYear, now.getMonth() - 3, 1).toISOString().split("T")[0];
  const sixMonthsAgo = new Date(currentYear, now.getMonth() - 6, 1).toISOString().split("T")[0];

  // Get all clients
  const allClients = await getUserClients(userId);

  // Get total user revenue (denominator for incomePercentage)
  const [totalRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${incomeEntries.amountPaid}), 0)`.mapWith(Number),
    })
    .from(incomeEntries)
    .where(eq(incomeEntries.userId, userId));
  const totalUserRevenue = totalRow?.total ?? 0;

  // Get aggregated analytics for all clients
  const analytics = await db
    .select({
      clientId: incomeEntries.clientId,
      totalEarned: sql<string>`COALESCE(SUM(${incomeEntries.amountPaid}), 0)`.mapWith(Number),
      totalInvoiced: sql<string>`COALESCE(SUM(${incomeEntries.amountGross}), 0)`.mapWith(Number),
      thisMonthRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${incomeEntries.date} >= ${monthStart} THEN ${incomeEntries.amountPaid} ELSE 0 END), 0)`.mapWith(Number),
      thisYearRevenue: sql<string>`COALESCE(SUM(CASE WHEN ${incomeEntries.date} >= ${yearStart} THEN ${incomeEntries.amountPaid} ELSE 0 END), 0)`.mapWith(Number),
      jobCount: count(),
      outstandingAmount: sql<string>`COALESCE(SUM(CASE WHEN ${incomeEntries.invoiceStatus} = 'sent' AND ${incomeEntries.paymentStatus} != 'paid' THEN (${incomeEntries.amountGross} - ${incomeEntries.amountPaid}) ELSE 0 END), 0)`.mapWith(Number),
      overdueInvoices: sql<number>`COUNT(CASE WHEN ${incomeEntries.invoiceStatus} = 'sent' AND ${incomeEntries.paymentStatus} != 'paid' AND ${incomeEntries.invoiceSentDate} < ${thirtyDaysAgo} THEN 1 END)`.mapWith(Number),
      avgDaysToPayment: sql<number | null>`AVG(CASE WHEN ${incomeEntries.paidDate} IS NOT NULL AND ${incomeEntries.invoiceSentDate} IS NOT NULL THEN EXTRACT(DAY FROM (${incomeEntries.paidDate}::timestamp - ${incomeEntries.invoiceSentDate}::timestamp)) END)`.mapWith(Number),
      lastGigDate: sql<string | null>`MAX(${incomeEntries.date})`,
      // Late payment: count entries paid >30 days after sent, vs total paid entries with both dates
      totalPaidWithDates: sql<number>`COUNT(CASE WHEN ${incomeEntries.paidDate} IS NOT NULL AND ${incomeEntries.invoiceSentDate} IS NOT NULL THEN 1 END)`.mapWith(Number),
      latePaidCount: sql<number>`COUNT(CASE WHEN ${incomeEntries.paidDate} IS NOT NULL AND ${incomeEntries.invoiceSentDate} IS NOT NULL AND EXTRACT(DAY FROM (${incomeEntries.paidDate}::timestamp - ${incomeEntries.invoiceSentDate}::timestamp)) > 30 THEN 1 END)`.mapWith(Number),
      // Activity trend: last 3 months vs prior 3 months
      last3moCount: sql<number>`COUNT(CASE WHEN ${incomeEntries.date} >= ${threeMonthsAgo} THEN 1 END)`.mapWith(Number),
      prior3moCount: sql<number>`COUNT(CASE WHEN ${incomeEntries.date} >= ${sixMonthsAgo} AND ${incomeEntries.date} < ${threeMonthsAgo} THEN 1 END)`.mapWith(Number),
    })
    .from(incomeEntries)
    .where(
      and(
        eq(incomeEntries.userId, userId),
        sql`${incomeEntries.clientId} IS NOT NULL`
      )
    )
    .groupBy(incomeEntries.clientId);

  // Map analytics to clients
  const analyticsMap = new Map(analytics.map((a) => [a.clientId, a]));

  return allClients.map((client) => {
    const a = analyticsMap.get(client.id);
    const jobCount = a?.jobCount ?? 0;
    const totalEarned = a?.totalEarned ?? 0;
    const overdueInvoices = a?.overdueInvoices ?? 0;
    const latePaymentRate = a?.totalPaidWithDates
      ? Math.round((a.latePaidCount / a.totalPaidWithDates) * 100)
      : 0;

    // lastActiveMonths: months since last gig
    let lastActiveMonths: number | null = null;
    const lastGigDate = a?.lastGigDate ?? null;
    if (lastGigDate) {
      const lastGig = new Date(lastGigDate);
      lastActiveMonths =
        (now.getFullYear() - lastGig.getFullYear()) * 12 +
        (now.getMonth() - lastGig.getMonth());
    }

    return {
      ...client,
      totalEarned,
      totalInvoiced: a?.totalInvoiced ?? 0,
      thisMonthRevenue: a?.thisMonthRevenue ?? 0,
      thisYearRevenue: a?.thisYearRevenue ?? 0,
      averagePerJob: jobCount > 0 ? totalEarned / jobCount : 0,
      jobCount,
      outstandingAmount: a?.outstandingAmount ?? 0,
      avgDaysToPayment: a?.avgDaysToPayment ?? null,
      overdueInvoices,
      incomePercentage: totalUserRevenue > 0 ? Math.round((totalEarned / totalUserRevenue) * 100) : 0,
      latePaymentRate,
      lastGigDate,
      lastActiveMonths,
      activityTrend: computeActivityTrend(a?.last3moCount ?? 0, a?.prior3moCount ?? 0),
      paymentHealth: computePaymentHealth(overdueInvoices, latePaymentRate),
    };
  });
}
```

- [ ] **Step 2: Add the import at the top of data.ts**

Add after existing imports:

```typescript
import { computePaymentHealth, computeActivityTrend } from "@seder/shared/utils";
```

- [ ] **Step 3: Verify the web app builds**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds (or at least no TypeScript errors in data.ts)

- [ ] **Step 4: Test manually via dev server**

Run: `pnpm dev:web`
Navigate to the clients page. Verify the API still returns data without errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/clients/data.ts
git commit -m "feat(web): extend getClientsWithAnalytics with Phase 2 stats"
```

---

**Note:** The API route at `apps/web/app/api/v1/clients/route.ts` already calls `getClientsWithAnalytics()` when `?analytics=true` is passed. Since we're extending the return type of that function, the API automatically returns the new fields — no route changes needed.

---

## Chunk 3: Web UI — Payment Health & New Stats

### Task 5: Add payment health dot and new stats to client rows

**Files:**
- Modify: `apps/web/app/clients/ClientsPageClient.tsx`

- [ ] **Step 1: Add new sort options**

Find the sort options (currently: `name|jobs|outstanding|total`) and add `lastActivity`. You need to update THREE places:
1. The `sortBy` state type union (add `"lastActivity"`)
2. The localStorage validation array (around line 89: `["name", "jobs", "outstanding", "total"]` → add `"lastActivity"`)
3. The sort switch/case logic

Add `"lastActivity"` to the sort type and add the sort case:

```typescript
// In the sort handler, add:
case "lastActivity":
  sorted.sort((a, b) => {
    const dateA = a.lastGigDate ? new Date(a.lastGigDate).getTime() : 0;
    const dateB = b.lastGigDate ? new Date(b.lastGigDate).getTime() : 0;
    return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
  });
  break;
```

Add the sort button in the UI:

```tsx
<Button variant={sortBy === "lastActivity" ? "default" : "outline"} size="sm" onClick={() => handleSort("lastActivity")}>
  פעילות אחרונה
</Button>
```

- [ ] **Step 2: Add payment health dot to each client row**

Find the client list item rendering. Add a small colored dot before or after the client name:

```tsx
// Helper function
function healthDotColor(health: "good" | "warning" | "bad") {
  switch (health) {
    case "good": return "bg-green-400";
    case "warning": return "bg-amber-400";
    case "bad": return "bg-red-400";
  }
}

// In the client row, add near the client name:
<span className={cn("inline-block w-2 h-2 rounded-full ms-2", healthDotColor(client.paymentHealth))} />
```

- [ ] **Step 3: Add `lastGigDate` to the summary line on each client row**

In the client row stats area (where jobCount and totalEarned are shown), add last activity:

```tsx
{client.lastGigDate && (
  <span className="text-xs text-slate-400">
    {client.lastActiveMonths === 0
      ? "פעיל החודש"
      : client.lastActiveMonths === 1
        ? "לפני חודש"
        : `לפני ${client.lastActiveMonths} חודשים`}
  </span>
)}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/clients/ClientsPageClient.tsx
git commit -m "feat(web): add payment health dot, last activity, and sort option to client list"
```

---

### Task 6: Enhance `ClientAnalyticsPanel` with new stats

**Files:**
- Modify: `apps/web/app/clients/components/ClientAnalyticsPanel.tsx`

- [ ] **Step 1: Add payment health badge to panel header**

After the client name in the header:

```tsx
<span className={cn(
  "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
  client.paymentHealth === "good" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  client.paymentHealth === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  client.paymentHealth === "bad" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
)}>
  {client.paymentHealth === "good" ? "תקין" : client.paymentHealth === "warning" ? "לתשומת לב" : "בעייתי"}
</span>
```

- [ ] **Step 2: Add new stats rows**

After the existing stats, add a new section with the Phase 2 stats:

```tsx
{/* Income Share */}
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
    <PieChart className="h-4 w-4" />
    חלק מסה״כ הכנסות
  </div>
  <span className="font-semibold text-slate-900 dark:text-white">
    {client.incomePercentage}%
  </span>
</div>

{/* Total Invoiced */}
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
    <FileText className="h-4 w-4" />
    סה״כ חויב
  </div>
  <span className="font-semibold text-slate-900 dark:text-white">
    {formatCurrency(client.totalInvoiced)}
  </span>
</div>

{/* Late Payment Rate */}
{client.latePaymentRate > 0 && (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <Clock className="h-4 w-4" />
      אחוז תשלום מאוחר
    </div>
    <span className={cn(
      "font-semibold",
      client.latePaymentRate >= 50 ? "text-red-600" : client.latePaymentRate >= 20 ? "text-amber-600" : "text-slate-900 dark:text-white"
    )}>
      {client.latePaymentRate}%
    </span>
  </div>
)}

{/* Activity Trend */}
{client.activityTrend && (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <TrendingUp className="h-4 w-4" />
      מגמת פעילות
    </div>
    <span className="font-semibold text-slate-900 dark:text-white">
      {client.activityTrend === "up" ? "↑ עולה" : client.activityTrend === "down" ? "↓ יורדת" : "→ יציבה"}
    </span>
  </div>
)}

{/* Last Active */}
{client.lastGigDate && (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <Calendar className="h-4 w-4" />
      עבודה אחרונה
    </div>
    <span className="font-semibold text-slate-900 dark:text-white">
      {client.lastActiveMonths === 0
        ? "החודש"
        : client.lastActiveMonths === 1
          ? "לפני חודש"
          : `לפני ${client.lastActiveMonths} חודשים`}
    </span>
  </div>
)}
```

- [ ] **Step 3: Add `PieChart` import from lucide-react**

```typescript
import { PieChart } from "lucide-react";
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/clients/components/ClientAnalyticsPanel.tsx
git commit -m "feat(web): add Phase 2 stats to ClientAnalyticsPanel"
```

---

## Chunk 4: iOS — Model, ViewModel & Views

### Task 7: Update iOS `Client` model with new fields

**Files:**
- Modify: `apps/ios/Seder/Seder/Models/Client.swift`

- [ ] **Step 1: Add new optional analytics fields**

After the existing analytics fields in the `Client` struct, add:

```swift
// Phase 2 — Client Intelligence
var totalInvoiced: Double?
var incomePercentage: Double?
var latePaymentRate: Double?
var lastGigDate: String?
var lastActiveMonths: Int?
var activityTrend: String?    // "up" | "down" | "stable" | null
var paymentHealth: String?    // "good" | "warning" | "bad"
```

- [ ] **Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Models/Client.swift
git commit -m "feat(ios): add Phase 2 client intelligence fields to Client model"
```

---

### Task 8: Add new sort options to iOS `ClientsViewModel`

**Files:**
- Modify: `apps/ios/Seder/Seder/ViewModels/ClientsViewModel.swift:3-14`

- [ ] **Step 1: Add `lastActivity` sort option**

```swift
enum ClientSortOption: String, CaseIterable {
    case name, revenue, jobs, outstanding, lastActivity

    var label: String {
        switch self {
        case .name: return "שם"
        case .revenue: return "הכנסות"
        case .jobs: return "עבודות"
        case .outstanding: return "חוב"
        case .lastActivity: return "פעילות אחרונה"
        }
    }
}
```

- [ ] **Step 2: Add sort case in `filteredClients`**

In the `switch sortOption` block (around line 48-57), add:

```swift
case .lastActivity:
    let dateA = a.lastGigDate ?? ""
    let dateB = b.lastGigDate ?? ""
    cmp = dateA < dateB
```

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Seder/Seder/ViewModels/ClientsViewModel.swift
git commit -m "feat(ios): add lastActivity sort option to ClientsViewModel"
```

---

### Task 9: Update iOS `ClientsView` with payment health and new stats

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Clients/ClientsView.swift`

- [ ] **Step 1: Add payment health dot to client row**

In the `clientRow()` function, add a small colored circle near the client name:

```swift
// Payment health indicator
if let health = client.paymentHealth {
    Circle()
        .fill(healthColor(health))
        .frame(width: 6, height: 6)
}
```

Add a helper function:

```swift
private func healthColor(_ health: String) -> Color {
    switch health {
    case "bad": return .red
    case "warning": return .orange
    default: return .green
    }
}
```

- [ ] **Step 2: Add last active label to client row**

Below the existing email/phone line in clientRow:

```swift
if let months = client.lastActiveMonths {
    Text(months == 0 ? "פעיל החודש" : months == 1 ? "לפני חודש" : "לפני \(months) חודשים")
        .font(.system(size: 11))
        .foregroundStyle(.secondary)
}
```

- [ ] **Step 3: Add new stats to ClientDetailSheet analytics grid**

In the `ClientDetailSheet` analytics grid (around line 337-350), add new cards:

```swift
// After the existing analytics cards:
if let percentage = client.incomePercentage, percentage > 0 {
    analyticsCard(label: "חלק מההכנסות", value: "\(Int(percentage))%")
}
if let lateRate = client.latePaymentRate, lateRate > 0 {
    analyticsCard(label: "תשלום מאוחר", value: "\(Int(lateRate))%")
}
if let trend = client.activityTrend {
    let trendText = trend == "up" ? "↑ עולה" : trend == "down" ? "↓ יורדת" : "→ יציבה"
    analyticsCard(label: "מגמה", value: trendText)
}
if let months = client.lastActiveMonths {
    let text = months == 0 ? "החודש" : months == 1 ? "לפני חודש" : "לפני \(months) חודשים"
    analyticsCard(label: "עבודה אחרונה", value: text)
}
```

- [ ] **Step 4: Add payment health badge to ClientDetailSheet header**

Near the client name in the detail sheet header:

```swift
if let health = client.paymentHealth {
    Text(health == "good" ? "תקין" : health == "warning" ? "לתשומת לב" : "בעייתי")
        .font(.system(size: 11, weight: .medium))
        .padding(.horizontal, 8)
        .padding(.vertical, 2)
        .background(healthColor(health).opacity(0.15))
        .foregroundColor(healthColor(health))
        .clipShape(Capsule())
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Clients/ClientsView.swift
git commit -m "feat(ios): add payment health, activity trend, and new stats to client views"
```

---

## Chunk 5: Cross-Platform Sync & Final Verification

### Task 10: Update API contract and verify iOS sync

**Files:**
- Run: `pnpm sync:contract`
- Run: `pnpm sync:check-ios`

- [ ] **Step 1: Generate updated API contract**

Run: `pnpm sync:contract`
Expected: `docs/api-contract.json` updated with new `ClientWithAnalytics` fields

- [ ] **Step 2: Check iOS sync**

Run: `pnpm sync:check-ios`
Expected: No mismatches (or only expected optional field differences)

- [ ] **Step 3: Build everything**

Run: `pnpm build`
Expected: All packages and apps build successfully

- [ ] **Step 4: Verify iOS builds**

Run: `cd apps/ios/Seder && xcodebuild -project Seder.xcodeproj -scheme Seder -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build 2>&1 | tail -5`
Expected: `** BUILD SUCCEEDED **`

- [ ] **Step 5: Final commit and push**

```bash
git add docs/api-contract.json
git commit -m "chore: update API contract with Phase 2 client intelligence fields"
git push origin clientintelligence
```
