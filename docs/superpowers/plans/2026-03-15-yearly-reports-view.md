# Yearly Reports View Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a yearly aggregation mode to the iOS reports page with a "שנה שלמה" toggle in the month picker, year-scoped KPIs/charts/breakdowns, and sparkline data.

**Architecture:** Extend existing API endpoints with a `period=year` query param. Add 4 new data functions in `data.ts`. On iOS, add `AnalyticsPeriod` enum to ViewModel, update the month picker popover, conditionally hide invoice tracking, and add a `MiniSparkline` component for breakdown rows.

**Tech Stack:** Next.js API routes, Drizzle ORM (PostgreSQL), Swift/SwiftUI with Swift Charts

**Spec:** `docs/superpowers/specs/2026-03-15-yearly-reports-view-design.md`

---

## Chunk 1: Backend — Data Layer Functions

### Task 1: Add `getIncomeAggregatesForYear` to data.ts

**Files:**
- Modify: `apps/web/app/income/data.ts:647` (after `getIncomeAggregatesForMonth`)

- [ ] **Step 1: Add the yearly KPI aggregation function**

Insert after the closing of `getIncomeAggregatesForMonth` (line 647), before the CRUD section:

```typescript
export async function getIncomeAggregatesForYear({ year, userId }: { year: number; userId: string }): Promise<IncomeAggregates> {
  const startDate = `${year}-01-01`;
  const endDate = `${year + 1}-01-01`;
  const today = getTodayString();

  // Determine comparison period
  const now = new Date();
  const currentYear = now.getFullYear();
  const isCurrentYear = year === currentYear;
  const compMonth = isCurrentYear ? now.getMonth() + 1 : 12;

  // Comparison period: same months of previous year
  const prevStart = `${year - 1}-01-01`;
  const prevEnd = isCurrentYear
    ? `${year - 1}-${String(compMonth + 1).padStart(2, "0")}-01`
    : `${year}-01-01`;

  const [
    yearStatsResult,
    vatTotalResult,
    outstandingStatsResult,
    readyToInvoiceStatsResult,
    overdueStatsResult,
    prevPeriodStatsResult
  ] = await Promise.all([
    // 1. Year Aggregates
    db
      .select({
        totalGross: sql<string>`sum(${incomeEntries.amountGross})`.mapWith(Number),
        totalPaid: sql<string>`sum(${incomeEntries.amountPaid})`.mapWith(Number),
        jobsCount: count(),
      })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.userId, userId),
          gte(incomeEntries.date, startDate),
          lt(incomeEntries.date, endDate)
        )
      ),

    // 2. VAT Total
    db
      .select({
        vatTotal: sql<string>`sum(
          CASE
            WHEN ${incomeEntries.includesVat} THEN
              (${incomeEntries.amountGross} - (${incomeEntries.amountGross} / (1 + ${incomeEntries.vatRate} / 100)))
            ELSE
              (${incomeEntries.amountGross} * (${incomeEntries.vatRate} / 100))
          END
        )`.mapWith(Number)
      })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.userId, userId),
          gte(incomeEntries.date, startDate),
          lt(incomeEntries.date, endDate)
        )
      ),

    // 3. Outstanding (invoiced but not paid)
    db
      .select({
        totalGross: sql<string>`sum(${incomeEntries.amountGross})`.mapWith(Number),
        totalPaid: sql<string>`sum(${incomeEntries.amountPaid})`.mapWith(Number),
        count: count(),
      })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.userId, userId),
          gte(incomeEntries.date, startDate),
          lt(incomeEntries.date, endDate),
          eq(incomeEntries.invoiceStatus, "sent"),
          sql`${incomeEntries.paymentStatus} != 'paid'`
        )
      ),

    // 4. Ready to Invoice
    db
      .select({
        total: sql<string>`sum(${incomeEntries.amountGross})`.mapWith(Number),
        count: count(),
      })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.userId, userId),
          gte(incomeEntries.date, startDate),
          lt(incomeEntries.date, endDate),
          eq(incomeEntries.invoiceStatus, "draft"),
          lt(incomeEntries.date, today)
        )
      ),

    // 5. Overdue Count
    db
      .select({ count: count() })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.userId, userId),
          gte(incomeEntries.date, startDate),
          lt(incomeEntries.date, endDate),
          eq(incomeEntries.invoiceStatus, "sent"),
          sql`${incomeEntries.paymentStatus} != 'paid'`,
          sql`${incomeEntries.invoiceSentDate} < CURRENT_DATE - INTERVAL '30 days'`
        )
      ),

    // 6. Previous period paid (for trend)
    db
      .select({
        totalPaid: sql<string>`sum(${incomeEntries.amountPaid})`.mapWith(Number),
      })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.userId, userId),
          gte(incomeEntries.date, prevStart),
          lt(incomeEntries.date, prevEnd),
          eq(incomeEntries.paymentStatus, "paid")
        )
      )
  ]);

  const yearStats = yearStatsResult[0];
  const outstandingStats = outstandingStatsResult[0];
  const readyToInvoiceStats = readyToInvoiceStatsResult[0];
  const overdueStats = overdueStatsResult[0];
  const prevPeriodStats = prevPeriodStatsResult[0];
  const vatTotal = vatTotalResult[0]?.vatTotal || 0;

  const outstanding = Currency.subtract(
    outstandingStats?.totalGross || 0,
    outstandingStats?.totalPaid || 0
  );
  const totalGross = yearStats?.totalGross || 0;
  const totalPaid = yearStats?.totalPaid || 0;
  const totalUnpaid = Currency.subtract(totalGross, totalPaid);
  const previousMonthPaid = prevPeriodStats?.totalPaid || 0;

  const trend = previousMonthPaid > 0
    ? Currency.multiply(Currency.divide(Currency.subtract(totalPaid, previousMonthPaid), previousMonthPaid), 100)
    : 0;

  return {
    totalGross,
    totalPaid,
    totalUnpaid,
    vatTotal,
    jobsCount: yearStats?.jobsCount || 0,
    outstanding,
    readyToInvoice: readyToInvoiceStats?.total || 0,
    readyToInvoiceCount: readyToInvoiceStats?.count || 0,
    invoicedCount: outstandingStats?.count || 0,
    overdueCount: overdueStats?.count || 0,
    previousMonthPaid,
    trend,
  };
}
```

- [ ] **Step 2: Verify the web app builds**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors in data.ts

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/income/data.ts
git commit -m "feat: add getIncomeAggregatesForYear data function"
```

---

### Task 2: Add `getYearTrends` to data.ts

**Files:**
- Modify: `apps/web/app/income/data.ts` (after `getEnhancedTrends`, ~line 284)

- [ ] **Step 1: Add the yearly trends function**

Insert after `getEnhancedTrends` return statement (after line 284):

```typescript
export async function getYearTrends({ year, userId }: { year: number; userId: string }) {
  const months = Array.from({ length: 12 }, (_, i) => ({ year, month: i + 1 }));

  const results = await Promise.all(
    months.map(async ({ year: y, month }) => {
      const startDate = `${y}-${String(month).padStart(2, "0")}-01`;
      const endDate =
        month === 12
          ? `${y + 1}-01-01`
          : `${y}-${String(month + 1).padStart(2, "0")}-01`;

      const [row] = await db
        .select({
          totalGross: sql<string>`COALESCE(SUM(${incomeEntries.amountGross}), 0)`,
          totalPaid: sql<string>`COALESCE(SUM(${incomeEntries.amountPaid}), 0)`,
          jobsCount: sql<number>`COUNT(*)::int`,
          unpaidCount: sql<number>`COUNT(*) FILTER (WHERE ${incomeEntries.paymentStatus} != 'paid' AND ${incomeEntries.date} < CURRENT_DATE)::int`,
        })
        .from(incomeEntries)
        .where(
          and(
            eq(incomeEntries.userId, userId),
            gte(incomeEntries.date, startDate),
            lt(incomeEntries.date, endDate)
          )
        );

      const totalGross = Number(row?.totalGross ?? 0);
      const totalPaid = Number(row?.totalPaid ?? 0);
      const jobsCount = row?.jobsCount ?? 0;
      const unpaidCount = row?.unpaidCount ?? 0;

      let status: "all-paid" | "has-unpaid" | "empty" = "empty";
      if (jobsCount > 0) {
        status = unpaidCount > 0 ? "has-unpaid" : "all-paid";
      }

      return { month, year: y, status, totalGross, totalPaid, jobsCount };
    })
  );

  return results;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/income/data.ts
git commit -m "feat: add getYearTrends data function"
```

---

### Task 3: Add `getCategoryBreakdownYearly` to data.ts

**Files:**
- Modify: `apps/web/app/income/data.ts` (after `getCategoryBreakdown`, ~line 344)

- [ ] **Step 1: Add the yearly category breakdown function**

Insert after `getCategoryBreakdown`:

```typescript
export async function getCategoryBreakdownYearly({ year, userId }: { year: number; userId: string }) {
  const startDate = `${year}-01-01`;
  const endDate = `${year + 1}-01-01`;

  // Single query: group by category + month
  const rows = await db
    .select({
      categoryId: incomeEntries.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      month: sql<number>`EXTRACT(MONTH FROM ${incomeEntries.date}::date)::int`,
      amount: sql<string>`COALESCE(SUM(${incomeEntries.amountGross}), 0)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(incomeEntries)
    .leftJoin(categories, eq(incomeEntries.categoryId, categories.id))
    .where(
      and(
        eq(incomeEntries.userId, userId),
        gte(incomeEntries.date, startDate),
        lt(incomeEntries.date, endDate)
      )
    )
    .groupBy(incomeEntries.categoryId, categories.name, categories.color, sql`EXTRACT(MONTH FROM ${incomeEntries.date}::date)`)
    .orderBy(sql`SUM(${incomeEntries.amountGross}) DESC`);

  // Aggregate per category
  const catMap = new Map<string | null, {
    categoryId: string | null;
    categoryName: string;
    categoryColor: string;
    totalAmount: number;
    totalCount: number;
    monthlyAmounts: number[];
  }>();

  for (const row of rows) {
    const key = row.categoryId;
    if (!catMap.has(key)) {
      catMap.set(key, {
        categoryId: row.categoryId,
        categoryName: row.categoryName ?? "ללא קטגוריה",
        categoryColor: row.categoryColor ?? "#9ca3af",
        totalAmount: 0,
        totalCount: 0,
        monthlyAmounts: new Array(12).fill(0),
      });
    }
    const entry = catMap.get(key)!;
    const amt = Number(row.amount);
    entry.totalAmount += amt;
    entry.totalCount += row.count;
    entry.monthlyAmounts[row.month - 1] += amt;
  }

  // Sort by total amount descending
  const sorted = Array.from(catMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  const totalAmount = sorted.reduce((sum, c) => sum + c.totalAmount, 0);

  const top5 = sorted.slice(0, 5).map((c) => ({
    categoryId: c.categoryId,
    categoryName: c.categoryName,
    categoryColor: c.categoryColor,
    amount: c.totalAmount,
    count: c.totalCount,
    percentage: totalAmount > 0 ? Math.round((c.totalAmount / totalAmount) * 100 * 10) / 10 : 0,
    monthlyAmounts: c.monthlyAmounts,
  }));

  if (sorted.length > 5) {
    const others = sorted.slice(5);
    const otherAmount = others.reduce((sum, c) => sum + c.totalAmount, 0);
    const otherCount = others.reduce((sum, c) => sum + c.totalCount, 0);
    const otherMonthly = new Array(12).fill(0);
    for (const c of others) {
      for (let i = 0; i < 12; i++) {
        otherMonthly[i] += c.monthlyAmounts[i];
      }
    }
    top5.push({
      categoryId: null,
      categoryName: "אחר",
      categoryColor: "#9ca3af",
      amount: otherAmount,
      count: otherCount,
      percentage: totalAmount > 0 ? Math.round((otherAmount / totalAmount) * 100 * 10) / 10 : 0,
      monthlyAmounts: otherMonthly,
    });
  }

  return top5;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/income/data.ts
git commit -m "feat: add getCategoryBreakdownYearly data function"
```

---

### Task 4: Add `getClientBreakdownYearly` to data.ts

**Files:**
- Modify: `apps/web/app/income/data.ts` (after `getClientBreakdown`, ~line 396)

- [ ] **Step 1: Add the yearly client breakdown function**

Insert after `getClientBreakdown`:

```typescript
export async function getClientBreakdownYearly({ year, userId }: { year: number; userId: string }) {
  const startDate = `${year}-01-01`;
  const endDate = `${year + 1}-01-01`;

  const rows = await db
    .select({
      clientName: incomeEntries.clientName,
      month: sql<number>`EXTRACT(MONTH FROM ${incomeEntries.date}::date)::int`,
      amount: sql<string>`COALESCE(SUM(${incomeEntries.amountGross}), 0)`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(incomeEntries)
    .where(
      and(
        eq(incomeEntries.userId, userId),
        gte(incomeEntries.date, startDate),
        lt(incomeEntries.date, endDate)
      )
    )
    .groupBy(incomeEntries.clientName, sql`EXTRACT(MONTH FROM ${incomeEntries.date}::date)`)
    .orderBy(sql`SUM(${incomeEntries.amountGross}) DESC`);

  const clientMap = new Map<string, {
    clientName: string;
    totalAmount: number;
    totalCount: number;
    monthlyAmounts: number[];
  }>();

  for (const row of rows) {
    const key = row.clientName || "ללא לקוח";
    if (!clientMap.has(key)) {
      clientMap.set(key, {
        clientName: key,
        totalAmount: 0,
        totalCount: 0,
        monthlyAmounts: new Array(12).fill(0),
      });
    }
    const entry = clientMap.get(key)!;
    const amt = Number(row.amount);
    entry.totalAmount += amt;
    entry.totalCount += row.count;
    entry.monthlyAmounts[row.month - 1] += amt;
  }

  const sorted = Array.from(clientMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  const totalAmount = sorted.reduce((sum, c) => sum + c.totalAmount, 0);

  const top5 = sorted.slice(0, 5).map((c) => ({
    clientName: c.clientName,
    amount: c.totalAmount,
    count: c.totalCount,
    percentage: totalAmount > 0 ? Math.round((c.totalAmount / totalAmount) * 100 * 10) / 10 : 0,
    monthlyAmounts: c.monthlyAmounts,
  }));

  if (sorted.length > 5) {
    const others = sorted.slice(5);
    const otherAmount = others.reduce((sum, c) => sum + c.totalAmount, 0);
    const otherCount = others.reduce((sum, c) => sum + c.totalCount, 0);
    const otherMonthly = new Array(12).fill(0);
    for (const c of others) {
      for (let i = 0; i < 12; i++) {
        otherMonthly[i] += c.monthlyAmounts[i];
      }
    }
    top5.push({
      clientName: "אחר",
      amount: otherAmount,
      count: otherCount,
      percentage: totalAmount > 0 ? Math.round((otherAmount / totalAmount) * 100 * 10) / 10 : 0,
      monthlyAmounts: otherMonthly,
    });
  }

  return top5;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/income/data.ts
git commit -m "feat: add getClientBreakdownYearly data function"
```

---

## Chunk 2: Backend — API Route Changes

### Task 5: Update KPIs route to support `period=year`

**Files:**
- Modify: `apps/web/app/api/v1/analytics/kpis/route.ts`

- [ ] **Step 1: Update the route handler**

Replace the entire file content:

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { getIncomeAggregatesForMonth, getIncomeAggregatesForYear } from "@/app/income/data";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const month = request.nextUrl.searchParams.get("month");
    const period = request.nextUrl.searchParams.get("period");

    let year: number;
    let m: number;

    if (month) {
      const parts = month.split("-").map(Number);
      year = parts[0];
      m = parts[1];
    } else {
      const now = new Date();
      year = now.getFullYear();
      m = now.getMonth() + 1;
    }

    if (period === "year") {
      const kpis = await getIncomeAggregatesForYear({ year, userId });
      return apiSuccess(kpis);
    }

    const kpis = await getIncomeAggregatesForMonth({ year, month: m, userId });
    return apiSuccess(kpis);
  } catch (error) {
    return apiError(error);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/v1/analytics/kpis/route.ts
git commit -m "feat: support period=year in kpis endpoint"
```

---

### Task 6: Update trends route to support `period=year`

**Files:**
- Modify: `apps/web/app/api/v1/analytics/trends/route.ts`

- [ ] **Step 1: Update the route handler**

Replace the entire file content:

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { getEnhancedTrends, getYearTrends } from "@/app/income/data";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const monthParam = request.nextUrl.searchParams.get("month");
    const countParam = request.nextUrl.searchParams.get("count");
    const period = request.nextUrl.searchParams.get("period");

    let endYear: number;
    let endMonth: number;

    if (monthParam) {
      const parts = monthParam.split("-").map(Number);
      endYear = parts[0];
      endMonth = parts[1];
    } else {
      const now = new Date();
      endYear = now.getFullYear();
      endMonth = now.getMonth() + 1;
    }

    if (period === "year") {
      const trends = await getYearTrends({ year: endYear, userId });
      return apiSuccess(trends);
    }

    const count = countParam ? Number(countParam) : 6;
    const trends = await getEnhancedTrends({ endMonth, endYear, count, userId });
    return apiSuccess(trends);
  } catch (error) {
    return apiError(error);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/v1/analytics/trends/route.ts
git commit -m "feat: support period=year in trends endpoint"
```

---

### Task 7: Update categories route to support `period=year`

**Files:**
- Modify: `apps/web/app/api/v1/analytics/categories/route.ts`

- [ ] **Step 1: Update the route handler**

Replace the entire file content:

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { getCategoryBreakdown, getCategoryBreakdownYearly } from "@/app/income/data";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const monthParam = request.nextUrl.searchParams.get("month");
    const period = request.nextUrl.searchParams.get("period");

    let year: number;
    let month: number;

    if (monthParam) {
      const parts = monthParam.split("-").map(Number);
      year = parts[0];
      month = parts[1];
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    if (period === "year") {
      const breakdown = await getCategoryBreakdownYearly({ year, userId });
      return apiSuccess(breakdown);
    }

    const breakdown = await getCategoryBreakdown({ year, month, userId });
    return apiSuccess(breakdown);
  } catch (error) {
    return apiError(error);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/api/v1/analytics/categories/route.ts
git commit -m "feat: support period=year in categories endpoint"
```

---

### Task 8: Update clients route to support `period=year`

**Files:**
- Modify: `apps/web/app/api/v1/analytics/clients/route.ts`

- [ ] **Step 1: Update the route handler**

Replace the entire file content:

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { getClientBreakdown, getClientBreakdownYearly } from "@/app/income/data";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const monthParam = request.nextUrl.searchParams.get("month");
    const period = request.nextUrl.searchParams.get("period");

    let year: number;
    let month: number;

    if (monthParam) {
      const parts = monthParam.split("-").map(Number);
      year = parts[0];
      month = parts[1];
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
    }

    if (period === "year") {
      const breakdown = await getClientBreakdownYearly({ year, userId });
      return apiSuccess(breakdown);
    }

    const breakdown = await getClientBreakdown({ year, month, userId });
    return apiSuccess(breakdown);
  } catch (error) {
    return apiError(error);
  }
}
```

- [ ] **Step 2: Verify web app builds**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/api/v1/analytics/clients/route.ts
git commit -m "feat: support period=year in clients endpoint"
```

---

## Chunk 3: iOS — Models & ViewModel

### Task 9: Add `monthlyAmounts` to Swift models

**Files:**
- Modify: `apps/ios/Seder/Seder/Models/Analytics.swift`

- [ ] **Step 1: Add optional `monthlyAmounts` to `CategoryBreakdown`**

In `Analytics.swift`, change `CategoryBreakdown` from:

```swift
nonisolated struct CategoryBreakdown: Codable, Sendable {
    let categoryId: String?
    let categoryName: String
    let categoryColor: String
    let amount: Double
    let count: Int
    let percentage: Double
}
```

To:

```swift
nonisolated struct CategoryBreakdown: Codable, Sendable {
    let categoryId: String?
    let categoryName: String
    let categoryColor: String
    let amount: Double
    let count: Int
    let percentage: Double
    let monthlyAmounts: [Double]?
}
```

- [ ] **Step 2: Add optional `monthlyAmounts` to `ClientBreakdown`**

Change `ClientBreakdown` from:

```swift
nonisolated struct ClientBreakdown: Codable, Sendable, Identifiable {
    let clientName: String
    let amount: Double
    let count: Int
    let percentage: Double

    var id: String { clientName }
}
```

To:

```swift
nonisolated struct ClientBreakdown: Codable, Sendable, Identifiable {
    let clientName: String
    let amount: Double
    let count: Int
    let percentage: Double
    let monthlyAmounts: [Double]?

    var id: String { clientName }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Seder/Seder/Models/Analytics.swift
git commit -m "feat(ios): add optional monthlyAmounts to breakdown models"
```

---

### Task 10: Add `AnalyticsPeriod` enum and update ViewModel

**Files:**
- Modify: `apps/ios/Seder/Seder/ViewModels/AnalyticsViewModel.swift`

- [ ] **Step 1: Add `AnalyticsPeriod` enum and `period` property**

Replace the `ReportSection` enum block and add below it:

```swift
enum ReportSection: Hashable {
    case incomeChart
    case invoiceTracking
    case categoryBreakdown
    case clientBreakdown
    case vatSummary
}

enum AnalyticsPeriod {
    case monthly, yearly
}
```

Then add to the `// MARK: - State` section, after `@Published var selectedMonth = Date()`:

```swift
@Published var period: AnalyticsPeriod = .monthly
```

- [ ] **Step 2: Add a helper for building query items**

Add after the `monthString` computed property:

```swift
private var periodQueryItems: [URLQueryItem] {
    var items = [URLQueryItem(name: "month", value: monthString)]
    if period == .yearly {
        items.append(URLQueryItem(name: "period", value: "year"))
    }
    return items
}

private var trendsQueryItems: [URLQueryItem] {
    if period == .yearly {
        return [
            URLQueryItem(name: "month", value: monthString),
            URLQueryItem(name: "period", value: "year"),
        ]
    }
    return [
        URLQueryItem(name: "month", value: monthString),
        URLQueryItem(name: "count", value: "6"),
    ]
}
```

- [ ] **Step 3: Rewrite `loadAll()` to use the helpers**

Replace the entire `loadAll()` method body:

```swift
func loadAll() async {
    let isInitial = aggregates == nil
    if isInitial {
        isLoading = true
    } else {
        isReloading = true
    }
    defer {
        isLoading = false
        isReloading = false
    }

    // Reset errors
    kpiError = false
    trendsError = false
    categoriesError = false
    clientBreakdownError = false
    attentionError = false

    async let kpis: IncomeAggregates = api.request(
        endpoint: "/api/v1/analytics/kpis",
        queryItems: periodQueryItems
    )
    async let monthTrends: [EnhancedMonthTrend] = api.request(
        endpoint: "/api/v1/analytics/trends",
        queryItems: trendsQueryItems
    )
    async let cats: [CategoryBreakdown] = api.request(
        endpoint: "/api/v1/analytics/categories",
        queryItems: periodQueryItems
    )
    async let clients: [ClientBreakdown] = api.request(
        endpoint: "/api/v1/analytics/clients",
        queryItems: periodQueryItems
    )

    // Fire attention concurrently only in monthly mode
    if period == .monthly {
        async let att: AttentionResponse = api.request(
            endpoint: "/api/v1/analytics/attention",
            queryItems: [URLQueryItem(name: "month", value: monthString)]
        )
        // Settle each independently
        do { aggregates = try await kpis } catch { kpiError = true }
        do { trends = try await monthTrends } catch { trendsError = true }
        do { categories = try await cats } catch { categoriesError = true }
        do { clientBreakdown = try await clients } catch { clientBreakdownError = true }
        do { attention = try await att } catch { attentionError = true }
    } else {
        attention = nil
        do { aggregates = try await kpis } catch { kpiError = true }
        do { trends = try await monthTrends } catch { trendsError = true }
        do { categories = try await cats } catch { categoriesError = true }
        do { clientBreakdown = try await clients } catch { clientBreakdownError = true }
    }
}
```

- [ ] **Step 4: Rewrite `retrySection()` to respect period**

Replace the entire `retrySection()` method:

```swift
func retrySection(_ section: ReportSection) async {
    switch section {
    case .incomeChart:
        trendsError = false
        do {
            trends = try await api.request(
                endpoint: "/api/v1/analytics/trends",
                queryItems: trendsQueryItems
            )
        } catch { trendsError = true }
    case .invoiceTracking:
        guard period == .monthly else { return }
        attentionError = false
        do {
            attention = try await api.request(
                endpoint: "/api/v1/analytics/attention",
                queryItems: [URLQueryItem(name: "month", value: monthString)]
            )
        } catch { attentionError = true }
    case .categoryBreakdown:
        categoriesError = false
        do {
            categories = try await api.request(
                endpoint: "/api/v1/analytics/categories",
                queryItems: periodQueryItems
            )
        } catch { categoriesError = true }
    case .clientBreakdown:
        clientBreakdownError = false
        do {
            clientBreakdown = try await api.request(
                endpoint: "/api/v1/analytics/clients",
                queryItems: periodQueryItems
            )
        } catch { clientBreakdownError = true }
    case .vatSummary:
        kpiError = false
        do {
            aggregates = try await api.request(
                endpoint: "/api/v1/analytics/kpis",
                queryItems: periodQueryItems
            )
        } catch { kpiError = true }
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/ios/Seder/Seder/ViewModels/AnalyticsViewModel.swift
git commit -m "feat(ios): add AnalyticsPeriod enum and update loadAll/retrySection"
```

---

## Chunk 4: iOS — View Changes (Selector, Sections, Sparkline)

### Task 11: Update month selector with "שנה שלמה" option

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Analytics/AnalyticsView.swift`

- [ ] **Step 1: Update the month picker button label**

In the `monthSelector` computed property, find the month name button (the `Button { showMonthPicker.toggle() }` block). Change:

```swift
Text(months[currentMonthIndex - 1])
    .font(SederTheme.ploni(15))
    .foregroundStyle(SederTheme.textPrimary)
```

To:

```swift
Text(viewModel.period == .yearly ? "שנה שלמה" : months[currentMonthIndex - 1])
    .font(SederTheme.ploni(15))
    .foregroundStyle(viewModel.period == .yearly ? SederTheme.brandGreen : SederTheme.textPrimary)
```

- [ ] **Step 2: Update chevron navigation to step by year when yearly**

Find the left chevron button (the one with `value: -1`). Change:

```swift
viewModel.selectedMonth = Calendar.current.date(byAdding: .month, value: -1, to: viewModel.selectedMonth)!
```

To:

```swift
let unit: Calendar.Component = viewModel.period == .yearly ? .year : .month
viewModel.selectedMonth = Calendar.current.date(byAdding: unit, value: -1, to: viewModel.selectedMonth)!
```

Do the same for the right chevron (the one with `value: 1`):

```swift
let unit: Calendar.Component = viewModel.period == .yearly ? .year : .month
viewModel.selectedMonth = Calendar.current.date(byAdding: unit, value: 1, to: viewModel.selectedMonth)!
```

- [ ] **Step 3: Add "שנה שלמה" as first item in month picker popover**

In the `monthPickerList` computed property, add the yearly option before the `ForEach(0..<12)`. Inside the `VStack(alignment: .leading, spacing: 0)`, insert at the top:

```swift
// Full year option
Button {
    viewModel.period = .yearly
    showMonthPicker = false
} label: {
    HStack(spacing: 10) {
        Text("שנה שלמה")
            .font(SederTheme.ploni(16, weight: viewModel.period == .yearly ? .semibold : .regular))
            .foregroundStyle(viewModel.period == .yearly ? SederTheme.brandGreen : SederTheme.textPrimary)
        Spacer()
        if viewModel.period == .yearly {
            Image(systemName: "checkmark")
                .font(.caption)
                .foregroundStyle(SederTheme.brandGreen)
        }
    }
    .padding(.horizontal, 16)
    .padding(.vertical, 11)
    .background(viewModel.period == .yearly ? SederTheme.subtleBg : Color.clear)
}

Divider().padding(.horizontal, 12)
```

- [ ] **Step 4: Update month selection to set period back to monthly**

In each month button's action inside the `ForEach(0..<12)`, set period back to monthly before updating the date. Since `onChange(of: selectedMonth)` already triggers `loadAll()`, and period is set synchronously before the date change, `loadAll()` will use the correct (monthly) period. Change:

```swift
Button {
    var components = Calendar.current.dateComponents([.year, .month, .day], from: viewModel.selectedMonth)
    components.month = monthNum
    if let newDate = Calendar.current.date(from: components) {
        viewModel.selectedMonth = newDate
    }
    showMonthPicker = false
}
```

To:

```swift
Button {
    viewModel.period = .monthly
    var components = Calendar.current.dateComponents([.year, .month, .day], from: viewModel.selectedMonth)
    components.month = monthNum
    if let newDate = Calendar.current.date(from: components) {
        viewModel.selectedMonth = newDate
    }
    showMonthPicker = false
}
```

Note: Do NOT add a separate `onChange(of: viewModel.period)` — it would cause double-fire with `onChange(of: selectedMonth)`. Period changes that don't change the month (i.e., selecting "שנה שלמה") are handled by adding an explicit reload. Update the existing `onChange(of: viewModel.selectedMonth)` to also fire on period changes:

- [ ] **Step 5: Update onChange to handle both month and period changes**

Replace the existing `.onChange(of: viewModel.selectedMonth)`:

```swift
.onChange(of: viewModel.selectedMonth) {
    Task { await viewModel.loadAll() }
}
```

With:

```swift
.onChange(of: viewModel.selectedMonth) {
    Task { await viewModel.loadAll() }
}
.onChange(of: viewModel.period) {
    // Only reload if selectedMonth didn't also change (which would already trigger loadAll)
    // This fires when user taps "שנה שלמה" without changing the month
    Task { await viewModel.loadAll() }
}
```

> **Implementation note:** In practice, when switching from yearly→monthly by tapping a month, both `period` and `selectedMonth` change. SwiftUI batches `@Published` changes within the same synchronous scope, so `loadAll()` will be called twice but each call is very fast to start (resets state + fires async requests). The second call effectively replaces the first. This is acceptable — the alternative (a debounce mechanism) adds unnecessary complexity.

- [ ] **Step 6: Hide invoice tracking section in yearly mode**

In the `body`, wrap the `InvoiceTrackingSection` with a condition:

```swift
if viewModel.period == .monthly {
    InvoiceTrackingSection(
        attention: viewModel.attention,
        isExpanded: viewModel.isSectionExpanded(.invoiceTracking),
        hasError: viewModel.attentionError,
        onToggle: { viewModel.toggleSection(.invoiceTracking) },
        onRetry: { Task { await viewModel.retrySection(.invoiceTracking) } },
        onItemTap: { entryId in
            appState.navigateToEntry(id: entryId)
        }
    )
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Analytics/AnalyticsView.swift
git commit -m "feat(ios): add yearly mode toggle to month selector"
```

---

### Task 12: Update `IncomeChartSection` for yearly mode

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Analytics/Components/IncomeChartSection.swift`

- [ ] **Step 1: Add `isYearly` prop and hide amount labels**

Add a new property **before** `onMonthTap` (so the memberwise initializer order matches the call site):

```swift
let onRetry: () -> Void
var isYearly: Bool = false      // ← insert here
let onMonthTap: (Int, Int) -> Void
```

Then wrap the amount labels HStack with a condition. Change:

```swift
// Amount labels below chart
HStack(spacing: 0) {
    ForEach(trends) { trend in
        ...
    }
}
```

To:

```swift
// Amount labels below chart (hidden in yearly — too many bars)
if !isYearly {
    HStack(spacing: 0) {
        ForEach(trends) { trend in
            HStack(alignment: .firstTextBaseline, spacing: 0) {
                Text("₪")
                    .font(.system(size: 6, weight: .semibold, design: .rounded))
                Text(AmountFormatter.abbreviatedNumber(trend.totalGross))
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
            }
            .foregroundStyle(SederTheme.textSecondary)
            .environment(\.layoutDirection, .leftToRight)
            .frame(maxWidth: .infinity)
        }
    }
}
```

- [ ] **Step 2: Update the chart title conditionally**

Change the section title from a hardcoded string. In the `ExpandableSection` initializer, change:

```swift
title: "הכנסות לאורך זמן",
```

To:

```swift
title: isYearly ? "הכנסות לאורך השנה" : "הכנסות לאורך זמן",
```

- [ ] **Step 3: Pass `isYearly` from AnalyticsView**

In `AnalyticsView.swift`, update the `IncomeChartSection` call to pass the new prop. Add after `onRetry:`:

Find:

```swift
IncomeChartSection(
    trends: viewModel.trends,
    isExpanded: viewModel.isSectionExpanded(.incomeChart),
    hasError: viewModel.trendsError,
    onToggle: { viewModel.toggleSection(.incomeChart) },
    onRetry: { Task { await viewModel.retrySection(.incomeChart) } },
    onMonthTap: { month, year in
```

Add `isYearly: viewModel.period == .yearly,` after `onRetry`:

```swift
IncomeChartSection(
    trends: viewModel.trends,
    isExpanded: viewModel.isSectionExpanded(.incomeChart),
    hasError: viewModel.trendsError,
    onToggle: { viewModel.toggleSection(.incomeChart) },
    onRetry: { Task { await viewModel.retrySection(.incomeChart) } },
    isYearly: viewModel.period == .yearly,
    onMonthTap: { month, year in
```

- [ ] **Step 4: Update `onMonthTap` to switch back to monthly**

In `AnalyticsView.swift`, in the `onMonthTap` closure, set period to monthly before setting selectedMonth:

```swift
onMonthTap: { month, year in
    viewModel.period = .monthly
    var components = DateComponents()
    components.year = year
    components.month = month
    components.day = 1
    if let date = Calendar.current.date(from: components) {
        viewModel.selectedMonth = date
    }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Analytics/Components/IncomeChartSection.swift apps/ios/Seder/Seder/Views/Analytics/AnalyticsView.swift
git commit -m "feat(ios): adapt income chart for yearly mode"
```

---

### Task 13: Create `MiniSparkline` component

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Analytics/Components/MiniSparkline.swift`

- [ ] **Step 1: Create the MiniSparkline view**

```swift
import SwiftUI

struct MiniSparkline: View {
    let values: [Double]

    private var maxValue: Double {
        max(values.max() ?? 1, 1)
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 1.5) {
            ForEach(Array(values.enumerated()), id: \.offset) { _, value in
                RoundedRectangle(cornerRadius: 1)
                    .fill(value > 0 ? SederTheme.brandGreen : SederTheme.subtleBg)
                    .frame(width: 4, height: max(2, CGFloat(value / maxValue) * 32))
            }
        }
        .frame(height: 34)
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Analytics/Components/MiniSparkline.swift
git commit -m "feat(ios): add MiniSparkline component"
```

---

### Task 14: Update `CategoryBreakdownSection` with sparkline

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Analytics/Components/CategoryBreakdownSection.swift`

- [ ] **Step 1: Replace progress bar with sparkline when `monthlyAmounts` present**

In the `CategoryBar` struct, replace the `GeometryReader` block with a conditional:

Change the entire `body` of `CategoryBar`:

```swift
var body: some View {
    VStack(spacing: 3) {
        HStack {
            Text(category.categoryName)
                .font(SederTheme.ploni(14, weight: .medium))
                .foregroundStyle(SederTheme.textPrimary)
            Spacer()
            HStack(spacing: 4) {
                CurrencyText(amount: category.amount, size: 13, color: SederTheme.textSecondary)
                Text("(\(Int(category.percentage))%)")
                    .font(SederTheme.ploni(13))
                    .foregroundStyle(SederTheme.textSecondary)
            }
        }

        if let monthly = category.monthlyAmounts {
            MiniSparkline(values: monthly)
        } else {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(SederTheme.subtleBg)
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(resolveColor(category.categoryColor))
                        .frame(width: geo.size.width * (category.percentage / 100), height: 8)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .frame(height: 8)
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Analytics/Components/CategoryBreakdownSection.swift
git commit -m "feat(ios): show sparkline in category breakdown for yearly mode"
```

---

### Task 15: Update `ClientPieChartSection` with sparkline

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Analytics/Components/ClientPieChartSection.swift`

- [ ] **Step 1: Add sparkline below amount/percentage in legend rows**

In the legend `ForEach`, after the `HStack` with amount and percentage, add the sparkline. Change the inner content of the `ForEach`:

```swift
ForEach(Array(clients.enumerated()), id: \.element.id) { index, client in
    VStack(spacing: 4) {
        HStack {
            Circle()
                .fill(sliceColors[index % sliceColors.count])
                .frame(width: 10, height: 10)

            Text(client.clientName)
                .font(SederTheme.ploni(14, weight: .medium))
                .foregroundStyle(SederTheme.textPrimary)
                .lineLimit(1)

            Spacer()

            HStack(spacing: 4) {
                CurrencyText(amount: client.amount, size: 13, color: SederTheme.textSecondary)
                Text("(\(Int(client.percentage))%)")
                    .font(SederTheme.ploni(13))
                    .foregroundStyle(SederTheme.textSecondary)
            }
        }

        if let monthly = client.monthlyAmounts {
            MiniSparkline(values: monthly)
                .padding(.leading, 20) // align with text after circle
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Analytics/Components/ClientPieChartSection.swift
git commit -m "feat(ios): show sparkline in client legend for yearly mode"
```

---

## Chunk 5: Cross-Platform Sync & Final Verification

### Task 16: Run cross-platform sync

- [ ] **Step 1: Generate API contract**

Run: `pnpm sync:contract`
Expected: `docs/api-contract.json` updated

- [ ] **Step 2: Check iOS model alignment**

Run: `pnpm sync:check-ios`
Expected: No critical mismatches (the new `monthlyAmounts` field is optional so should be fine)

- [ ] **Step 3: Verify web app builds**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit sync output**

```bash
git add docs/api-contract.json
git commit -m "chore: update API contract for yearly endpoints"
```

---

### Task 17: Final integration test

- [ ] **Step 1: Start web dev server and test endpoints**

Run: `pnpm dev:web`

Test monthly (should work as before):
```
curl -s http://localhost:3001/api/v1/analytics/kpis?month=2025-03 | head -c 200
```

Test yearly:
```
curl -s "http://localhost:3001/api/v1/analytics/kpis?month=2025-03&period=year" | head -c 200
curl -s "http://localhost:3001/api/v1/analytics/trends?month=2025-03&period=year" | head -c 200
curl -s "http://localhost:3001/api/v1/analytics/categories?month=2025-03&period=year" | head -c 200
curl -s "http://localhost:3001/api/v1/analytics/clients?month=2025-03&period=year" | head -c 200
```

Expected: All return valid JSON with data (trends should have 12 items, breakdowns should include `monthlyAmounts` arrays)

- [ ] **Step 2: Build iOS in Xcode**

Open `apps/ios/Seder/Seder.xcodeproj` and build for simulator. Verify:
- Reports page loads in monthly mode (unchanged behavior)
- Month picker shows "שנה שלמה" as first option
- Selecting it switches to yearly mode with year-scoped data
- 12-bar chart shows, no amount labels
- Category/client breakdowns show sparklines
- Invoice tracking section is hidden
- Tapping a chart bar drills back to monthly
- Chevrons step by year in yearly mode

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: yearly reports view — complete implementation"
```
