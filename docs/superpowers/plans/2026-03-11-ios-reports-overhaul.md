# iOS Reports Page Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the minimal iOS reports page with a scrollable dashboard featuring 6 KPIs (3×2 grid), income chart, invoice tracking, category breakdown, and VAT summary — backed by 2 new API endpoints and 1 enhanced endpoint.

**Architecture:** Backend-first approach. Add/enhance 3 API endpoints in Next.js (`/api/v1/analytics/`), then build iOS models, ViewModel, and SwiftUI views. Deep link navigation via a new shared `AppState` object enables tapping attention items to jump to the income tab.

**Tech Stack:** Next.js API routes + Drizzle ORM (backend), Swift/SwiftUI + Swift Charts (iOS), Vitest (backend tests)

**Spec:** `docs/superpowers/specs/2026-03-11-ios-reports-overhaul-design.md`

---

## File Structure

### Backend (apps/web/)

| File | Action | Responsibility |
|------|--------|---------------|
| `app/income/data.ts` | Modify | Add `getEnhancedTrends()`, `getCategoryBreakdown()`, `getAttentionItems()` |
| `app/api/v1/analytics/trends/route.ts` | Modify | Switch to `month` + `count` params, return amounts |
| `app/api/v1/analytics/categories/route.ts` | Create | New endpoint for category breakdown |
| `app/api/v1/analytics/attention/route.ts` | Create | New endpoint for needs-attention items |

### iOS (apps/ios/Seder/Seder/)

| File | Action | Responsibility |
|------|--------|---------------|
| `Models/Analytics.swift` | Modify | Add `EnhancedMonthTrend`, `CategoryBreakdown`, `AttentionResponse`, `AttentionSummary`, `AttentionItem` |
| `ViewModels/AnalyticsViewModel.swift` | Rewrite | 4 endpoints, section expansion state, per-section error handling |
| `Models/AppState.swift` | Create | Shared deep link state (`deepLinkEntryId`, `selectedTab`) |
| `Views/Analytics/AnalyticsView.swift` | Rewrite | Compose sub-views into scrollable dashboard |
| `Views/Analytics/Components/ExpandableSection.swift` | Create | Reusable collapse/expand container with header + badge |
| `Views/Analytics/Components/ReportsKPIGrid.swift` | Create | 3×2 KPI card grid |
| `Views/Analytics/Components/IncomeChartSection.swift` | Create | 6-month rolling bar chart (Swift Charts) |
| `Views/Analytics/Components/InvoiceTrackingSection.swift` | Create | Summary counters + tappable item list |
| `Views/Analytics/Components/CategoryBreakdownSection.swift` | Create | Horizontal progress bars by category |
| `Views/Analytics/Components/VATSummarySection.swift` | Create | Gross → VAT → Net table |
| `Views/Analytics/Helpers/AmountFormatter.swift` | Create | ₪X.Xk formatting + abbreviated month names |
| `Views/MainTabView.swift` | Modify | Add `@State selectedTab`, observe `AppState.deepLinkEntryId` |
| `Views/Income/IncomeListView.swift` | Modify | React to `deepLinkEntryId` — scroll to entry + open edit sheet |
| `SederApp.swift` | Modify | Create and inject `AppState` as `@EnvironmentObject` |

---

## Chunk 1: Backend API Endpoints

### Task 1: Add `getEnhancedTrends()` to data.ts

**Files:**
- Modify: `apps/web/app/income/data.ts` (after `getMonthPaymentStatuses` ~line 216)

- [ ] **Step 1: Write the data function**

Add this function after `getMonthPaymentStatuses` in `data.ts`:

```typescript
export async function getEnhancedTrends({
  endMonth,
  endYear,
  count = 6,
  userId,
}: {
  endMonth: number;
  endYear: number;
  count?: number;
  userId: string;
}) {
  // Uses `db` imported from "@/db/client" at top of data.ts

  // Build list of (year, month) pairs going backwards from endMonth/endYear
  const months: { year: number; month: number }[] = [];
  let y = endYear;
  let m = endMonth;
  for (let i = 0; i < count; i++) {
    months.unshift({ year: y, month: m });
    m--;
    if (m === 0) {
      m = 12;
      y--;
    }
  }

  const results = await Promise.all(
    months.map(async ({ year, month }) => {
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate =
        month === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(month + 1).padStart(2, "0")}-01`;

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

      return { month, year, status, totalGross, totalPaid, jobsCount };
    })
  );

  return results;
}
```

- [ ] **Step 2: Update the trends route**

Rewrite `apps/web/app/api/v1/analytics/trends/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { getEnhancedTrends } from "@/app/income/data";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const monthParam = request.nextUrl.searchParams.get("month");
    const countParam = request.nextUrl.searchParams.get("count");

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

    const count = countParam ? Number(countParam) : 6;

    const trends = await getEnhancedTrends({
      endMonth,
      endYear,
      count,
      userId,
    });
    return apiSuccess(trends);
  } catch (error) {
    return apiError(error);
  }
}
```

- [ ] **Step 3: Verify build**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds without errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/income/data.ts apps/web/app/api/v1/analytics/trends/route.ts
git commit -m "feat(api): enhance trends endpoint with amounts and rolling window"
```

---

### Task 2: Add categories breakdown endpoint

**Files:**
- Modify: `apps/web/app/income/data.ts`
- Create: `apps/web/app/api/v1/analytics/categories/route.ts`

- [ ] **Step 1: Write the data function**

Add to `data.ts` after `getEnhancedTrends`:

```typescript
export async function getCategoryBreakdown({
  year,
  month,
  userId,
}: MonthFilter) {
  // Uses `db` imported from "@/db/client" at top of data.ts
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const rows = await db
    .select({
      categoryId: incomeEntries.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
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
    .groupBy(incomeEntries.categoryId, categories.name, categories.color)
    .orderBy(sql`SUM(${incomeEntries.amountGross}) DESC`);

  const totalAmount = rows.reduce((sum, r) => sum + Number(r.amount), 0);

  // Top 5 + "other" grouping
  const top5 = rows.slice(0, 5).map((r) => ({
    categoryId: r.categoryId,
    categoryName: r.categoryName ?? "ללא קטגוריה",
    categoryColor: r.categoryColor ?? "#9ca3af",
    amount: Number(r.amount),
    count: r.count,
    percentage: totalAmount > 0 ? Math.round((Number(r.amount) / totalAmount) * 100 * 10) / 10 : 0,
  }));

  if (rows.length > 5) {
    const otherRows = rows.slice(5);
    const otherAmount = otherRows.reduce((sum, r) => sum + Number(r.amount), 0);
    const otherCount = otherRows.reduce((sum, r) => sum + r.count, 0);
    top5.push({
      categoryId: null,
      categoryName: "אחר",
      categoryColor: "#9ca3af",
      amount: otherAmount,
      count: otherCount,
      percentage: totalAmount > 0 ? Math.round((otherAmount / totalAmount) * 100 * 10) / 10 : 0,
    });
  }

  return top5;
}
```

- [ ] **Step 2: Create the route**

Create `apps/web/app/api/v1/analytics/categories/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { getCategoryBreakdown } from "@/app/income/data";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const monthParam = request.nextUrl.searchParams.get("month");

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

    const breakdown = await getCategoryBreakdown({ year, month, userId });
    return apiSuccess(breakdown);
  } catch (error) {
    return apiError(error);
  }
}
```

- [ ] **Step 3: Verify build**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/income/data.ts apps/web/app/api/v1/analytics/categories/route.ts
git commit -m "feat(api): add category breakdown analytics endpoint"
```

---

### Task 3: Add attention items endpoint

**Files:**
- Modify: `apps/web/app/income/data.ts`
- Create: `apps/web/app/api/v1/analytics/attention/route.ts`

- [ ] **Step 1: Write the data function**

Add to `data.ts` after `getCategoryBreakdown`:

```typescript
export async function getAttentionItems({
  year,
  month,
  userId,
}: MonthFilter) {
  // Uses `db` imported from "@/db/client" at top of data.ts
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

  const baseWhere = and(
    eq(incomeEntries.userId, userId),
    gte(incomeEntries.date, startDate),
    lt(incomeEntries.date, endDate),
    sql`${incomeEntries.paymentStatus} != 'paid'`,
    sql`${incomeEntries.invoiceStatus} != 'cancelled'`
  );

  // Fetch ALL matching rows for accurate summary counts (no LIMIT)
  const allRows = await db
    .select({
      id: incomeEntries.id,
      clientName: incomeEntries.clientName,
      description: incomeEntries.description,
      date: incomeEntries.date,
      amountGross: incomeEntries.amountGross,
      invoiceStatus: incomeEntries.invoiceStatus,
      paymentStatus: incomeEntries.paymentStatus,
      invoiceSentDate: incomeEntries.invoiceSentDate,
    })
    .from(incomeEntries)
    .where(baseWhere)
    .orderBy(sql`${incomeEntries.amountGross} DESC`);

  // Classify each item into buckets
  const summary = {
    drafts: { count: 0, amount: 0 },
    sent: { count: 0, amount: 0 },
    overdue: { count: 0, amount: 0 },
  };

  const classifiedItems = allRows.map((row) => {
    const amount = Number(row.amountGross);
    let status: "draft" | "sent" | "overdue";

    if (row.invoiceStatus === "draft") {
      status = "draft";
      summary.drafts.count++;
      summary.drafts.amount += amount;
    } else if (
      row.invoiceStatus === "sent" &&
      row.invoiceSentDate &&
      String(row.invoiceSentDate) < thirtyDaysAgoStr
    ) {
      status = "overdue";
      summary.overdue.count++;
      summary.overdue.amount += amount;
    } else {
      status = "sent";
      summary.sent.count++;
      summary.sent.amount += amount;
    }

    return {
      id: row.id,
      clientName: row.clientName,
      description: row.description,
      date: String(row.date),
      amountGross: amount,
      status,
      invoiceStatus: row.invoiceStatus,
      paymentStatus: row.paymentStatus,
    };
  });

  // Return full summary but limit items list to 20
  return { summary, items: classifiedItems.slice(0, 20) };
}
```

- [ ] **Step 2: Create the route**

Create `apps/web/app/api/v1/analytics/attention/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { getAttentionItems } from "@/app/income/data";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const monthParam = request.nextUrl.searchParams.get("month");

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

    const attention = await getAttentionItems({ year, month, userId });
    return apiSuccess(attention);
  } catch (error) {
    return apiError(error);
  }
}
```

- [ ] **Step 3: Verify build**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds.

- [ ] **Step 4: Run cross-platform sync**

Run: `pnpm sync:contract` to update `docs/api-contract.json` with the new endpoints.
Run: `pnpm sync:check-ios` to see what Swift models need updating.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/income/data.ts apps/web/app/api/v1/analytics/attention/route.ts docs/api-contract.json
git commit -m "feat(api): add attention items analytics endpoint"
```

---

## Chunk 2: iOS Models & ViewModel

### Task 4: Add new Swift models

**Files:**
- Modify: `apps/ios/Seder/Seder/Models/Analytics.swift`

- [ ] **Step 1: Add new model structs**

Replace the entire file with:

```swift
import Foundation

// MARK: - KPI Aggregates (existing, unchanged)

nonisolated struct IncomeAggregates: Codable, Sendable {
    let totalGross: Double
    let totalPaid: Double
    let totalUnpaid: Double
    let vatTotal: Double
    let jobsCount: Int
    let outstanding: Double
    let readyToInvoice: Double
    let readyToInvoiceCount: Int
    let invoicedCount: Int
    let overdueCount: Int
    let previousMonthPaid: Double
    let trend: Double
}

// MARK: - Enhanced Trends (replaces MonthTrend)

nonisolated struct EnhancedMonthTrend: Codable, Sendable, Identifiable {
    let month: Int
    let year: Int
    let status: String // "all-paid" | "has-unpaid" | "empty"
    let totalGross: Double
    let totalPaid: Double
    let jobsCount: Int

    var id: String { "\(year)-\(month)" }
}

// MARK: - Category Breakdown

nonisolated struct CategoryBreakdown: Codable, Sendable {
    let categoryId: String?
    let categoryName: String
    let categoryColor: String
    let amount: Double
    let count: Int
    let percentage: Double
}

// MARK: - Attention Items

nonisolated struct AttentionResponse: Codable, Sendable {
    let summary: AttentionSummary
    let items: [AttentionItem]
}

nonisolated struct AttentionSummary: Codable, Sendable {
    let drafts: AttentionBucket
    let sent: AttentionBucket
    let overdue: AttentionBucket
}

nonisolated struct AttentionBucket: Codable, Sendable {
    let count: Int
    let amount: Double
}

nonisolated struct AttentionItem: Codable, Sendable, Identifiable {
    let id: String
    let clientName: String
    let description: String
    let date: String
    let amountGross: Double
    let status: String // "draft" | "sent" | "overdue"
    let invoiceStatus: String
    let paymentStatus: String
}

// MARK: - Legacy (keep for backward compat during migration)

nonisolated struct MonthTrend: Codable, Sendable {
    let month: Int
    let status: String
}
```

- [ ] **Step 2: Build in Xcode**

Open `apps/ios/Seder/Seder.xcodeproj` in Xcode and build (⌘B).
Expected: Build succeeds — models are just data structs.

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Seder/Seder/Models/Analytics.swift
git commit -m "feat(ios): add analytics models for enhanced trends, categories, attention"
```

---

### Task 5: Create AppState for deep linking

**Files:**
- Create: `apps/ios/Seder/Seder/Models/AppState.swift`
- Modify: `apps/ios/Seder/Seder/SederApp.swift`

- [ ] **Step 1: Create AppState**

Create `apps/ios/Seder/Seder/Models/AppState.swift`:

```swift
import SwiftUI

@MainActor
class AppState: ObservableObject {
    @Published var selectedTab: Int = 0
    @Published var deepLinkEntryId: String?

    func navigateToEntry(id: String) {
        deepLinkEntryId = id
        selectedTab = 0 // Income tab
    }

    func clearDeepLink() {
        deepLinkEntryId = nil
    }
}
```

- [ ] **Step 2: Inject into SederApp**

In `apps/ios/Seder/Seder/SederApp.swift`, add `@StateObject private var appState = AppState()` alongside the existing `authViewModel`, and inject it with `.environmentObject(appState)` on the root view (same place where `authViewModel` is injected).

Find the line that has `.environmentObject(authViewModel)` and add `.environmentObject(appState)` next to it. Also add the `@StateObject` declaration near the existing one.

- [ ] **Step 3: Build in Xcode**

Build (⌘B). Expected: Succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/ios/Seder/Seder/Models/AppState.swift apps/ios/Seder/Seder/SederApp.swift
git commit -m "feat(ios): add AppState for cross-tab deep linking"
```

---

### Task 6: Rewrite AnalyticsViewModel

**Files:**
- Rewrite: `apps/ios/Seder/Seder/ViewModels/AnalyticsViewModel.swift`

- [ ] **Step 1: Rewrite the ViewModel**

Replace the entire file:

```swift
import Combine
import Foundation

enum ReportSection: Hashable {
    case incomeChart
    case invoiceTracking
    case categoryBreakdown
    case vatSummary
}

@MainActor
class AnalyticsViewModel: ObservableObject {
    // MARK: - Data
    @Published var aggregates: IncomeAggregates?
    @Published var trends: [EnhancedMonthTrend] = []
    @Published var categories: [CategoryBreakdown] = []
    @Published var attention: AttentionResponse?

    // MARK: - State
    @Published var isLoading = false
    @Published var isReloading = false
    @Published var selectedMonth = Date()
    @Published var expandedSections: Set<ReportSection> = [.incomeChart]

    // MARK: - Per-section errors
    @Published var kpiError = false
    @Published var trendsError = false
    @Published var categoriesError = false
    @Published var attentionError = false

    private let api = APIClient.shared

    // MARK: - Computed

    var monthString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: selectedMonth)
    }

    var hasData: Bool {
        aggregates != nil && (aggregates?.jobsCount ?? 0) > 0
    }

    var attentionCount: Int {
        guard let s = attention?.summary else { return 0 }
        return s.drafts.count + s.sent.count + s.overdue.count
    }

    // MARK: - Section Toggle

    func toggleSection(_ section: ReportSection) {
        if expandedSections.contains(section) {
            expandedSections.remove(section)
        } else {
            expandedSections.insert(section)
        }
    }

    func isSectionExpanded(_ section: ReportSection) -> Bool {
        expandedSections.contains(section)
    }

    // MARK: - Data Loading

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
        attentionError = false

        async let kpis: IncomeAggregates = api.request(
            endpoint: "/api/v1/analytics/kpis",
            queryItems: [URLQueryItem(name: "month", value: monthString)]
        )
        async let monthTrends: [EnhancedMonthTrend] = api.request(
            endpoint: "/api/v1/analytics/trends",
            queryItems: [
                URLQueryItem(name: "month", value: monthString),
                URLQueryItem(name: "count", value: "6"),
            ]
        )
        async let cats: [CategoryBreakdown] = api.request(
            endpoint: "/api/v1/analytics/categories",
            queryItems: [URLQueryItem(name: "month", value: monthString)]
        )
        async let att: AttentionResponse = api.request(
            endpoint: "/api/v1/analytics/attention",
            queryItems: [URLQueryItem(name: "month", value: monthString)]
        )

        // Settle each independently
        do { aggregates = try await kpis } catch { kpiError = true }
        do { trends = try await monthTrends } catch { trendsError = true }
        do { categories = try await cats } catch { categoriesError = true }
        do { attention = try await att } catch { attentionError = true }
    }

    func retrySection(_ section: ReportSection) async {
        switch section {
        case .incomeChart:
            trendsError = false
            do {
                trends = try await api.request(
                    endpoint: "/api/v1/analytics/trends",
                    queryItems: [
                        URLQueryItem(name: "month", value: monthString),
                        URLQueryItem(name: "count", value: "6"),
                    ]
                )
            } catch { trendsError = true }
        case .invoiceTracking:
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
                    queryItems: [URLQueryItem(name: "month", value: monthString)]
                )
            } catch { categoriesError = true }
        case .vatSummary:
            // VAT uses KPI data
            kpiError = false
            do {
                aggregates = try await api.request(
                    endpoint: "/api/v1/analytics/kpis",
                    queryItems: [URLQueryItem(name: "month", value: monthString)]
                )
            } catch { kpiError = true }
        }
    }
}
```

- [ ] **Step 2: Build in Xcode**

Build (⌘B). Expected: May have warnings about unused `MonthTrend` — that's fine (legacy compat).

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Seder/Seder/ViewModels/AnalyticsViewModel.swift
git commit -m "feat(ios): rewrite AnalyticsViewModel with 4 endpoints and section state"
```

---

## Chunk 3: iOS Views — Foundation Components

### Task 7: Create AmountFormatter helper

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Analytics/Helpers/AmountFormatter.swift`

- [ ] **Step 1: Create the helper**

```swift
import Foundation

enum AmountFormatter {
    /// Abbreviated Hebrew month names for chart X-axis
    static let abbreviatedMonths = [
        1: "ינו׳", 2: "פבר׳", 3: "מרץ", 4: "אפר׳", 5: "מאי", 6: "יוני",
        7: "יולי", 8: "אוג׳", 9: "ספט׳", 10: "אוק׳", 11: "נוב׳", 12: "דצמ׳",
    ]

    /// Format amount as ₪X.Xk for chart labels
    static func abbreviated(_ amount: Double) -> String {
        if amount >= 1000 {
            let k = amount / 1000
            if k == k.rounded() {
                return "₪\(Int(k))k"
            }
            return "₪\(String(format: "%.1f", k))k"
        }
        return "₪\(Int(amount))"
    }

    /// Full formatted amount with thousands separator
    static func full(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        formatter.locale = Locale(identifier: "he_IL")
        let number = formatter.string(from: NSNumber(value: amount)) ?? "\(Int(amount))"
        return "₪\(number)"
    }

    /// Month name from month number
    static func monthName(_ month: Int) -> String {
        abbreviatedMonths[month] ?? ""
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Analytics/Helpers/AmountFormatter.swift
git commit -m "feat(ios): add AmountFormatter helper for chart labels"
```

---

### Task 8: Create ExpandableSection component

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Analytics/Components/ExpandableSection.swift`

- [ ] **Step 1: Create the reusable component**

```swift
import SwiftUI

struct ExpandableSection<Content: View, Badge: View>: View {
    let title: String
    let isExpanded: Bool
    let hasError: Bool
    let onToggle: () -> Void
    let onRetry: (() -> Void)?
    @ViewBuilder let badge: () -> Badge
    @ViewBuilder let content: () -> Content

    init(
        title: String,
        isExpanded: Bool,
        hasError: Bool = false,
        onToggle: @escaping () -> Void,
        onRetry: (() -> Void)? = nil,
        @ViewBuilder badge: @escaping () -> Badge = { EmptyView() },
        @ViewBuilder content: @escaping () -> Content
    ) {
        self.title = title
        self.isExpanded = isExpanded
        self.hasError = hasError
        self.onToggle = onToggle
        self.onRetry = onRetry
        self.badge = badge
        self.content = content
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            Button(action: onToggle) {
                HStack {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(SederTheme.textPrimary)

                    Spacer()

                    if !isExpanded {
                        badge()
                    }

                    Image(systemName: isExpanded ? "chevron.down" : "chevron.left")
                        .font(.caption)
                        .foregroundStyle(SederTheme.textTertiary)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
            }
            .buttonStyle(.plain)

            if isExpanded {
                Divider()
                    .padding(.horizontal, 12)

                if hasError {
                    // Error state
                    VStack(spacing: 8) {
                        Text("שגיאה בטעינה")
                            .font(.caption)
                            .foregroundStyle(SederTheme.textSecondary)
                        if let onRetry {
                            Button("נסה שוב") {
                                onRetry()
                            }
                            .font(.caption.weight(.medium))
                            .foregroundStyle(SederTheme.brandGreen)
                        }
                    }
                    .padding(.vertical, 16)
                } else {
                    content()
                }
            }
        }
        .background(SederTheme.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(SederTheme.cardBorder, lineWidth: 1)
        )
        .animation(.easeInOut(duration: 0.2), value: isExpanded)
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Analytics/Components/ExpandableSection.swift
git commit -m "feat(ios): add ExpandableSection reusable component"
```

---

### Task 9: Create ReportsKPIGrid

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Analytics/Components/ReportsKPIGrid.swift`

- [ ] **Step 1: Create the KPI grid**

```swift
import SwiftUI

struct ReportsKPIGrid: View {
    let aggregates: IncomeAggregates

    private var netIncome: Double {
        aggregates.totalGross - aggregates.vatTotal
    }

    private var averagePerJob: Double {
        aggregates.jobsCount > 0 ? aggregates.totalGross / Double(aggregates.jobsCount) : 0
    }

    var body: some View {
        let columns = [
            GridItem(.flexible(), spacing: 6),
            GridItem(.flexible(), spacing: 6),
            GridItem(.flexible(), spacing: 6),
        ]

        LazyVGrid(columns: columns, spacing: 6) {
            // Row 1
            KPICell(title: "הכנסה ברוטו", value: AmountFormatter.full(aggregates.totalGross), color: SederTheme.paidColor)
            KPICell(title: "נטו (אחרי מע\"מ)", value: AmountFormatter.full(netIncome), color: SederTheme.brandGreen)
            KPICell(title: "לא שולם", value: AmountFormatter.full(aggregates.totalUnpaid), color: SederTheme.sentColor)

            // Row 2
            KPICell(title: "עבודות", value: "\(aggregates.jobsCount)", color: SederTheme.draftColor)
            KPICell(title: "ממוצע לעבודה", value: AmountFormatter.full(averagePerJob), color: SederTheme.textPrimary)
            trendCell
        }
    }

    private var trendCell: some View {
        let trend = aggregates.trend
        let isPositive = trend >= 0
        let arrow = isPositive ? "↑" : "↓"
        let color = isPositive ? SederTheme.paidColor : SederTheme.unpaidColor
        let value = "\(arrow) \(Int(abs(trend)))%"

        return KPICell(title: "מגמה חודשית", value: value, color: color)
    }
}

private struct KPICell: View {
    let title: String
    let value: String
    var color: Color = .primary

    var body: some View {
        VStack(alignment: .trailing, spacing: 3) {
            Text(title)
                .font(.system(size: 9))
                .foregroundStyle(SederTheme.textSecondary)

            Text(value)
                .font(.system(size: 15, weight: .bold, design: .rounded))
                .foregroundStyle(color)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
        .padding(8)
        .background(SederTheme.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(SederTheme.cardBorder, lineWidth: 1)
        )
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Analytics/Components/ReportsKPIGrid.swift
git commit -m "feat(ios): add ReportsKPIGrid 3x2 KPI card grid"
```

---

## Chunk 4: iOS Views — Expandable Sections

### Task 10: Create IncomeChartSection

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Analytics/Components/IncomeChartSection.swift`

- [ ] **Step 1: Create the chart section**

```swift
import Charts
import SwiftUI

struct IncomeChartSection: View {
    let trends: [EnhancedMonthTrend]
    let isExpanded: Bool
    let hasError: Bool
    let onToggle: () -> Void
    let onRetry: () -> Void

    var body: some View {
        ExpandableSection(
            title: "הכנסות לאורך זמן",
            isExpanded: isExpanded,
            hasError: hasError,
            onToggle: onToggle,
            onRetry: onRetry
        ) {
            VStack(spacing: 8) {
                if trends.isEmpty {
                    Text("אין נתונים")
                        .font(.caption)
                        .foregroundStyle(SederTheme.textTertiary)
                        .padding(.vertical, 20)
                } else {
                    Chart(trends) { trend in
                        BarMark(
                            x: .value("חודש", AmountFormatter.monthName(trend.month)),
                            y: .value("סכום", trend.totalGross)
                        )
                        .foregroundStyle(barColor(trend.status))
                        .cornerRadius(4)
                    }
                    .chartYAxis(.hidden)
                    .chartXAxis {
                        AxisMarks { _ in
                            AxisValueLabel()
                                .font(.system(size: 9))
                                .foregroundStyle(SederTheme.textSecondary)
                        }
                    }
                    .frame(height: 120)

                    // Amount labels below chart
                    HStack(spacing: 0) {
                        ForEach(trends) { trend in
                            Text(AmountFormatter.abbreviated(trend.totalGross))
                                .font(.system(size: 8, weight: .semibold, design: .rounded))
                                .foregroundStyle(SederTheme.textSecondary)
                                .frame(maxWidth: .infinity)
                        }
                    }

                    // Legend
                    HStack(spacing: 12) {
                        LegendDot(color: SederTheme.paidColor, label: "שולם")
                        LegendDot(color: SederTheme.sentColor, label: "חלקי")
                    }
                    .padding(.top, 4)
                }
            }
            .padding(12)
        }
    }

    private func barColor(_ status: String) -> Color {
        switch status {
        case "all-paid": return SederTheme.paidColor
        case "has-unpaid": return SederTheme.sentColor
        default: return SederTheme.subtleBg
        }
    }
}

private struct LegendDot: View {
    let color: Color
    let label: String

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text(label)
                .font(.system(size: 9))
                .foregroundStyle(SederTheme.textSecondary)
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Analytics/Components/IncomeChartSection.swift
git commit -m "feat(ios): add IncomeChartSection with Swift Charts bar chart"
```

---

### Task 11: Create InvoiceTrackingSection

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Analytics/Components/InvoiceTrackingSection.swift`

- [ ] **Step 1: Create the section**

```swift
import SwiftUI

struct InvoiceTrackingSection: View {
    let attention: AttentionResponse?
    let isExpanded: Bool
    let hasError: Bool
    let onToggle: () -> Void
    let onRetry: () -> Void
    let onItemTap: (String) -> Void // entry ID

    private var totalCount: Int {
        guard let s = attention?.summary else { return 0 }
        return s.drafts.count + s.sent.count + s.overdue.count
    }

    var body: some View {
        ExpandableSection(
            title: "מעקב חשבוניות",
            isExpanded: isExpanded,
            hasError: hasError,
            onToggle: onToggle,
            onRetry: onRetry,
            badge: {
                if totalCount > 0 {
                    Text("\(totalCount) דורשות טיפול")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(SederTheme.sentColor)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(SederTheme.sentColor.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
        ) {
            if let attention {
                VStack(spacing: 0) {
                    if totalCount == 0 {
                        // Empty state
                        VStack(spacing: 6) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.title2)
                                .foregroundStyle(SederTheme.paidColor)
                            Text("הכל מטופל!")
                                .font(.caption.weight(.medium))
                                .foregroundStyle(SederTheme.textSecondary)
                        }
                        .padding(.vertical, 20)
                    } else {
                        // Summary counters
                        HStack(spacing: 0) {
                            SummaryCounter(label: "טיוטות", count: attention.summary.drafts.count, amount: attention.summary.drafts.amount, color: SederTheme.textSecondary)
                            Divider().frame(height: 40)
                            SummaryCounter(label: "נשלחו", count: attention.summary.sent.count, amount: attention.summary.sent.amount, color: SederTheme.sentColor)
                            Divider().frame(height: 40)
                            SummaryCounter(label: "באיחור", count: attention.summary.overdue.count, amount: attention.summary.overdue.amount, color: SederTheme.unpaidColor)
                        }
                        .padding(.vertical, 8)

                        Divider()

                        // Item list
                        ForEach(attention.items) { item in
                            Button {
                                onItemTap(item.id)
                            } label: {
                                AttentionItemRow(item: item)
                            }
                            .buttonStyle(.plain)

                            if item.id != attention.items.last?.id {
                                Divider().padding(.horizontal, 12)
                            }
                        }
                    }
                }
            }
        }
    }
}

private struct SummaryCounter: View {
    let label: String
    let count: Int
    let amount: Double
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text(label)
                .font(.system(size: 9))
                .foregroundStyle(SederTheme.textSecondary)
            Text("\(count)")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(color)
            Text(AmountFormatter.full(amount))
                .font(.system(size: 8))
                .foregroundStyle(SederTheme.textTertiary)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct AttentionItemRow: View {
    let item: AttentionItem

    var body: some View {
        HStack {
            // Right side: client + description
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(item.clientName) — \(item.description)")
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(SederTheme.textPrimary)
                    .lineLimit(1)
                Text(item.date)
                    .font(.system(size: 9))
                    .foregroundStyle(SederTheme.textTertiary)
            }

            Spacer()

            // Left side: amount + badge + chevron
            HStack(spacing: 6) {
                Text(AmountFormatter.full(item.amountGross))
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(SederTheme.textPrimary)

                StatusPill(status: item.status)

                Image(systemName: "chevron.left")
                    .font(.system(size: 10))
                    .foregroundStyle(SederTheme.textTertiary)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
}

private struct StatusPill: View {
    let status: String

    private var label: String {
        switch status {
        case "draft": return "טיוטה"
        case "sent": return "נשלחה"
        case "overdue": return "באיחור"
        default: return status
        }
    }

    private var color: Color {
        switch status {
        case "draft": return SederTheme.textSecondary
        case "sent": return SederTheme.sentColor
        case "overdue": return SederTheme.unpaidColor
        default: return SederTheme.textSecondary
        }
    }

    var body: some View {
        Text(label)
            .font(.system(size: 8, weight: .medium))
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Analytics/Components/InvoiceTrackingSection.swift
git commit -m "feat(ios): add InvoiceTrackingSection with summary + tappable items"
```

---

### Task 12: Create CategoryBreakdownSection

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Analytics/Components/CategoryBreakdownSection.swift`

- [ ] **Step 1: Create the section**

```swift
import SwiftUI

struct CategoryBreakdownSection: View {
    let categories: [CategoryBreakdown]
    let isExpanded: Bool
    let hasError: Bool
    let onToggle: () -> Void
    let onRetry: () -> Void

    var body: some View {
        ExpandableSection(
            title: "פילוח לפי קטגוריה",
            isExpanded: isExpanded,
            hasError: hasError,
            onToggle: onToggle,
            onRetry: onRetry
        ) {
            if categories.isEmpty {
                Text("אין נתונים")
                    .font(.caption)
                    .foregroundStyle(SederTheme.textTertiary)
                    .padding(.vertical, 20)
                    .frame(maxWidth: .infinity)
            } else {
                VStack(spacing: 10) {
                    ForEach(categories, id: \.categoryName) { cat in
                        CategoryBar(category: cat)
                    }
                }
                .padding(12)
            }
        }
    }
}

private struct CategoryBar: View {
    let category: CategoryBreakdown

    var body: some View {
        VStack(spacing: 3) {
            HStack {
                Text(category.categoryName)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(SederTheme.textPrimary)
                Spacer()
                Text("\(AmountFormatter.full(category.amount)) (\(Int(category.percentage))%)")
                    .font(.system(size: 10))
                    .foregroundStyle(SederTheme.textSecondary)
            }

            GeometryReader { geo in
                ZStack(alignment: .trailing) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(SederTheme.subtleBg)
                        .frame(height: 8)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(SederTheme.color(hex: category.categoryColor))
                        .frame(width: geo.size.width * (category.percentage / 100), height: 8)
                        .frame(maxWidth: .infinity, alignment: .trailing)
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
git commit -m "feat(ios): add CategoryBreakdownSection with progress bars"
```

---

### Task 13: Create VATSummarySection

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Analytics/Components/VATSummarySection.swift`

- [ ] **Step 1: Create the section**

```swift
import SwiftUI

struct VATSummarySection: View {
    let aggregates: IncomeAggregates?
    let isExpanded: Bool
    let hasError: Bool
    let onToggle: () -> Void
    let onRetry: () -> Void

    var body: some View {
        ExpandableSection(
            title: "דוח מע\"מ",
            isExpanded: isExpanded,
            hasError: hasError,
            onToggle: onToggle,
            onRetry: onRetry,
            badge: {
                if let agg = aggregates, agg.vatTotal > 0 {
                    Text(AmountFormatter.full(agg.vatTotal))
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.purple)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.purple.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
        ) {
            if let agg = aggregates {
                VStack(spacing: 0) {
                    VATRow(label: "הכנסה ברוטו", value: AmountFormatter.full(agg.totalGross), color: SederTheme.textPrimary)
                    Divider().padding(.horizontal, 12)
                    VATRow(label: "מע\"מ (17%)", value: "- \(AmountFormatter.full(agg.vatTotal))", color: SederTheme.unpaidColor)
                    Divider().padding(.horizontal, 12)
                    VATRow(label: "נטו לאחר מע\"מ", value: AmountFormatter.full(agg.totalGross - agg.vatTotal), color: SederTheme.paidColor, isBold: true)
                }
                .padding(.vertical, 4)
            }
        }
    }
}

private struct VATRow: View {
    let label: String
    let value: String
    var color: Color = .primary
    var isBold: Bool = false

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 11, weight: isBold ? .semibold : .regular))
                .foregroundStyle(isBold ? SederTheme.textPrimary : SederTheme.textSecondary)
            Spacer()
            Text(value)
                .font(.system(size: 11, weight: isBold ? .bold : .semibold, design: .rounded))
                .foregroundStyle(color)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Analytics/Components/VATSummarySection.swift
git commit -m "feat(ios): add VATSummarySection with gross/VAT/net breakdown"
```

---

## Chunk 5: Assembly & Navigation

### Task 14: Rewrite AnalyticsView (main page)

**Files:**
- Rewrite: `apps/ios/Seder/Seder/Views/Analytics/AnalyticsView.swift`

- [ ] **Step 1: Rewrite the main view**

Replace the entire file:

```swift
import SwiftUI

struct AnalyticsView: View {
    @StateObject private var viewModel = AnalyticsViewModel()
    @EnvironmentObject private var appState: AppState

    private let months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
                          "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]

    var body: some View {
        VStack(spacing: 0) {
            // Green navbar
            HStack {
                Spacer()
                Text("דוחות")
                    .font(.headline)
                    .foregroundStyle(.white)
                Spacer()
            }
            .padding(.vertical, 12)
            .padding(.top, UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first?.windows.first?.safeAreaInsets.top ?? 0)
            .background(SederTheme.brandGreen.ignoresSafeArea(edges: .top))
            .environment(\.layoutDirection, .leftToRight)

            if viewModel.isLoading {
                Spacer()
                ProgressView()
                    .tint(SederTheme.brandGreen)
                Spacer()
            } else {
                ScrollView {
                    VStack(spacing: 12) {
                        // Month selector
                        monthSelector

                        if !viewModel.hasData && !viewModel.kpiError {
                            // Empty month state
                            VStack(spacing: 8) {
                                Image(systemName: "chart.bar.xaxis")
                                    .font(.largeTitle)
                                    .foregroundStyle(SederTheme.textTertiary)
                                Text("אין נתונים לתקופה זו")
                                    .font(.subheadline)
                                    .foregroundStyle(SederTheme.textSecondary)
                            }
                            .padding(.top, 60)
                        } else {
                            // KPI Grid
                            if let agg = viewModel.aggregates {
                                ReportsKPIGrid(aggregates: agg)
                            }

                            // Expandable sections
                            IncomeChartSection(
                                trends: viewModel.trends,
                                isExpanded: viewModel.isSectionExpanded(.incomeChart),
                                hasError: viewModel.trendsError,
                                onToggle: { viewModel.toggleSection(.incomeChart) },
                                onRetry: { Task { await viewModel.retrySection(.incomeChart) } }
                            )

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

                            CategoryBreakdownSection(
                                categories: viewModel.categories,
                                isExpanded: viewModel.isSectionExpanded(.categoryBreakdown),
                                hasError: viewModel.categoriesError,
                                onToggle: { viewModel.toggleSection(.categoryBreakdown) },
                                onRetry: { Task { await viewModel.retrySection(.categoryBreakdown) } }
                            )

                            VATSummarySection(
                                aggregates: viewModel.aggregates,
                                isExpanded: viewModel.isSectionExpanded(.vatSummary),
                                hasError: viewModel.kpiError,
                                onToggle: { viewModel.toggleSection(.vatSummary) },
                                onRetry: { Task { await viewModel.retrySection(.vatSummary) } }
                            )
                        }

                        Spacer().frame(height: 40)
                    }
                }
                .safeAreaPadding(.horizontal, 12)
                .opacity(viewModel.isReloading ? 0.6 : 1)
                .animation(.easeInOut(duration: 0.15), value: viewModel.isReloading)
            }
        }
        .background(SederTheme.pageBg)
        .ignoresSafeArea(edges: .top)
        .task { await viewModel.loadAll() }
        .onChange(of: viewModel.selectedMonth) { _ in
            Task { await viewModel.loadAll() }
        }
    }

    // MARK: - Month Selector

    private var monthSelector: some View {
        HStack(spacing: 8) {
            Text("\(Calendar.current.component(.year, from: viewModel.selectedMonth))")
                .font(.subheadline)
                .foregroundStyle(SederTheme.textPrimary)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(SederTheme.cardBorder, lineWidth: 1)
                )

            HStack(spacing: 8) {
                Button {
                    viewModel.selectedMonth = Calendar.current.date(byAdding: .month, value: 1, to: viewModel.selectedMonth)!
                } label: {
                    Image(systemName: "chevron.left")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(SederTheme.textSecondary)
                }

                Text(months[Calendar.current.component(.month, from: viewModel.selectedMonth) - 1])
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(SederTheme.textPrimary)

                Button {
                    viewModel.selectedMonth = Calendar.current.date(byAdding: .month, value: -1, to: viewModel.selectedMonth)!
                } label: {
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(SederTheme.textSecondary)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(SederTheme.cardBorder, lineWidth: 1)
            )

            Spacer()
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 6)
        .background(SederTheme.cardBg)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}
```

- [ ] **Step 2: Build in Xcode**

Build (⌘B). Expected: May fail if `SederTheme.subtleBg` doesn't exist — check Theme.swift and add if missing.

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Analytics/AnalyticsView.swift
git commit -m "feat(ios): rewrite AnalyticsView as scrollable dashboard with sections"
```

---

### Task 15: Update MainTabView for deep linking

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/MainTabView.swift`

- [ ] **Step 1: Add tab selection state and AppState binding**

In `MainTabView.swift`, make these changes:

1. Add `@EnvironmentObject private var appState: AppState` property
2. Add `selection: $appState.selectedTab` to the `TabView` initializer
3. Add `.tag(0)`, `.tag(1)`, `.tag(2)`, `.tag(3)` to each tab view respectively

The TabView should become (preserving existing RTL environment and .fill icons):
```swift
TabView(selection: $appState.selectedTab) {
    IncomeListView()
        .environment(\.layoutDirection, .rightToLeft)
        .tabItem { Label("הכנסות", systemImage: "banknote.fill") }
        .tag(0)
    ClientsView(viewModel: clientsVM)
        .environment(\.layoutDirection, .rightToLeft)
        .tabItem { Label("לקוחות", systemImage: "person.2.fill") }
        .tag(1)
    AnalyticsView()
        .environment(\.layoutDirection, .rightToLeft)
        .tabItem { Label("דוחות", systemImage: "chart.bar.fill") }
        .tag(2)
    Text("הוצאות - בקרוב")
        .environment(\.layoutDirection, .rightToLeft)
        .tabItem { Label("הוצאות", systemImage: "dollarsign.circle") }
        .tag(3)
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/ios/Seder/Seder/Views/MainTabView.swift
git commit -m "feat(ios): add tab selection binding to MainTabView for deep linking"
```

---

### Task 16: Update IncomeListView to handle deep links

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Income/IncomeListView.swift`

- [ ] **Step 1: Add deep link observation**

In `IncomeListView.swift`:

1. Add `@EnvironmentObject private var appState: AppState` property
2. Add an `.onChange(of: appState.deepLinkEntryId)` modifier that:
   - When a `deepLinkEntryId` is set, find the matching entry in `viewModel.entries`
   - Set `editingEntry` to that entry (which opens the edit sheet)
   - Call `appState.clearDeepLink()` after setting

Add this modifier to the main view body (near the existing `.task` or `.onAppear`):

```swift
.onChange(of: appState.deepLinkEntryId) { _ in
    guard let entryId = appState.deepLinkEntryId else { return }
    if let entry = viewModel.entries.first(where: { $0.id == entryId }) {
        editingEntry = entry
    }
    appState.clearDeepLink()
}
```

- [ ] **Step 2: Build and verify**

Build in Xcode (⌘B). Expected: Succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Seder/Seder/Views/Income/IncomeListView.swift
git commit -m "feat(ios): handle deep link navigation to income entries"
```

---

### Task 17: Verify theme compatibility

**Files:**
- Possibly modify: `apps/ios/Seder/Seder/Theme.swift`

- [ ] **Step 1: Check for missing theme properties**

`SederTheme.subtleBg` already exists in `Theme.swift` (line ~38). Verify that `SederTheme.color(hex:)` is a static method (used by `CategoryBreakdownSection`). If it's named differently (e.g., `colorFromHex`), update the reference in `CategoryBreakdownSection.swift`.

- [ ] **Step 2: Build full project in Xcode**

Build (⌘B). Fix any remaining compile errors related to missing theme properties or API mismatches.

- [ ] **Step 3: Commit if changes were needed**

```bash
git add apps/ios/Seder/Seder/Theme.swift
git commit -m "fix(ios): add missing theme properties for reports views"
```

---

### Task 18: Final build verification and cleanup

- [ ] **Step 1: Build backend**

Run: `cd apps/web && pnpm build`
Expected: Build succeeds.

- [ ] **Step 2: Build iOS in Xcode**

Open Xcode, select a simulator, build and run (⌘R). Verify:
- Reports tab loads without crash
- KPI grid shows 6 cards
- Income chart section is expanded by default with bar chart
- Other sections are collapsed with correct badges
- Tapping section headers expands/collapses with animation
- Month navigation reloads data with opacity transition
- Tapping an attention item switches to income tab

- [ ] **Step 3: Remove legacy MonthTrend if no longer referenced**

Check if `MonthTrend` (the old struct) is still referenced anywhere. If not, remove it from `Analytics.swift`.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(ios): complete reports page overhaul — dashboard with expandable sections"
```
