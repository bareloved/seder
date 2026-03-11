# iOS Reports Page Overhaul — Design Spec

## Summary

Overhaul the iOS reports page from a basic 3-KPI view into a scrollable dashboard with expandable sections. The page shows a 3×2 KPI grid (always visible) and 4 collapsible sections: Income Over Time, Invoice Tracking, Category Breakdown, and VAT Summary. Requires 2 new API endpoints and 1 enhanced endpoint.

## Current State

The iOS `AnalyticsView` shows:
- 3 KPI cards (gross income, jobs count, unpaid)
- A trend % indicator
- A bar chart that shows payment status per month (bars all at height=1, no actual amounts)
- Month-only navigation

The API returns `IncomeAggregates` with 12 fields, but only 3-4 are displayed. No category breakdown or needs-attention list exists on the backend.

## Design Decision

**Navigation: Scrollable dashboard with expandable sections** (Option C from brainstorming). Everything on one page, no sub-navigation. Sections collapse/expand with tap on header. Collapsed sections show summary badges (e.g., "3 דורשות טיפול").

## Page Layout (top to bottom)

### 1. Navbar
- Green brand navbar with "דוחות" title (existing pattern)

### 2. Month Selector
- Left/right chevron navigation (RTL-aware)
- Shows "חודש שנה" (e.g., "מרץ 2026")

### 3. KPI Grid (always visible)

3×2 grid of compact KPI cards on standard phones (375pt+). On iPhone SE (320pt), falls back to 2×3 grid.

| Row 1 | | |
|---|---|---|
| **הכנסה ברוטו** (Gross Income) | **נטו (אחרי מע"מ)** (Net after VAT) | **לא שולם** (Unpaid) |
| `totalGross` | `totalGross - vatTotal` | `totalUnpaid` (orange text) |

| Row 2 | | |
|---|---|---|
| **עבודות** (Jobs) | **ממוצע לעבודה** (Avg per Job) | **מגמה חודשית** (Trend) |
| `jobsCount` | `totalGross / jobsCount` | `trend`% with ↑/↓ arrow, green/red |

**Net calculation note:** `totalGross - vatTotal` is intentionally simplified. The `vatTotal` field from the KPI endpoint is the server-computed sum of VAT across all entries (accounting for per-entry `includesVat` and `vatRate`), so this subtraction is correct regardless of mixed VAT entries.

### 4. Section: הכנסות לאורך זמן (Income Over Time)

- **Default state:** Expanded
- **Chart:** Swift Charts `BarMark` with actual gross amounts (not status-only)
- **Window:** 6-month rolling window ending at selected month
- **Colors:** Green = fully paid month, Yellow/amber = has unpaid entries
- **Labels:** Abbreviated Hebrew month names on X-axis, formatted amounts (₪8.2k) below each bar
- **Legend:** Small legend below chart (שולם / חלקי)
- **Data source:** Enhanced `/api/v1/analytics/trends` endpoint

### 5. Section: מעקב חשבוניות (Invoice Tracking)

- **Default state:** Collapsed
- **Collapsed badge:** Orange pill showing "X דורשות טיפול" (e.g., "3 דורשות טיפול") where X = total count across all three buckets
- **Expanded content:**
  - **Summary counters row:** 3 cells showing drafts (count + amount), sent-awaiting (count + amount), overdue (count + amount)
  - **Item list:** Each entry shows: client name + description, date, amount, status badge (טיוטה / נשלחה / באיחור), chevron
  - **Tap action:** Navigate to that income entry in the income tab
  - **Sorted by:** Amount descending
  - **Empty state:** "הכל מטופל!" with checkmark
- **Data source:** New `/api/v1/analytics/attention` endpoint

### 6. Section: פילוח לפי קטגוריה (Category Breakdown)

- **Default state:** Collapsed
- **Expanded content:**
  - Horizontal progress bars for each category
  - Each bar shows: category name (right), amount + percentage (left), colored fill bar
  - Top 5 categories + "אחר" (Other) group
  - Colors: Use the user's configured `categoryColor` from the API response. For "אחר" group, use gray (#9ca3af)
- **Data source:** New `/api/v1/analytics/categories` endpoint

### 7. Section: דוח מע"מ (VAT Summary)

- **Default state:** Collapsed
- **Collapsed badge:** Purple pill showing VAT total (e.g., "₪2,108")
- **Expanded content:**
  - Simple table with 3 rows:
    - הכנסה ברוטו → `totalGross`
    - מע"מ (17%) → `-vatTotal` (red)
    - נטו לאחר מע"מ → `totalGross - vatTotal` (green, bold)
- **Data source:** Existing `/api/v1/analytics/kpis` (already returns `vatTotal`)

## API Changes

### Enhanced: `GET /api/v1/analytics/trends`

Current response: `[{ month: number, status: string }]`

New response:
```json
[{
  "month": 1,
  "year": 2026,
  "status": "all-paid",
  "totalGross": 13100,
  "totalPaid": 13100,
  "jobsCount": 5
}]
```

Query params:
- `month` (new, required) — format `yyyy-MM`, the end month of the rolling window
- `count` (new, optional) — number of months to include, default 6

**Breaking change:** This replaces the old `year` param. The endpoint now accepts a reference month and returns `count` months ending at that month, crossing year boundaries as needed (e.g., month=2026-02&count=6 returns Sep 2025 – Feb 2026). The response includes a `year` field per entry to disambiguate. The iOS app will be updated simultaneously, so no backward compatibility shim is needed.

### New: `GET /api/v1/analytics/categories`

Returns income grouped by category for a given month.

```json
[{
  "categoryId": "uuid",
  "categoryName": "הופעות",
  "categoryColor": "#22c55e",
  "amount": 6200,
  "count": 3,
  "percentage": 50.0
}]
```

Query params:
- `month` — format `yyyy-MM`

Sorted by amount descending. Server groups top 5 + "אחר".

### New: `GET /api/v1/analytics/attention`

Returns items needing follow-up for a given month.

**Overdue definition:** An item is "overdue" when `invoiceStatus = "sent"` AND `paymentStatus != "paid"` AND the invoice was sent more than 30 days ago (based on `invoiceSentDate`). This is a computed status, not a DB field.

**Bucket exclusivity:** The three summary buckets are mutually exclusive:
- `drafts` — `invoiceStatus = "draft"`
- `sent` — `invoiceStatus = "sent"` AND NOT overdue (sent ≤ 30 days ago)
- `overdue` — `invoiceStatus = "sent"` AND sent > 30 days ago AND `paymentStatus != "paid"`

```json
{
  "summary": {
    "drafts": { "count": 2, "amount": 4200 },
    "sent": { "count": 1, "amount": 1800 },
    "overdue": { "count": 1, "amount": 2500 }
  },
  "items": [{
    "id": "uuid",
    "clientName": "דוד כהן",
    "description": "הופעה",
    "date": "2026-02-15",
    "amountGross": 2500,
    "status": "overdue",
    "invoiceStatus": "sent",
    "paymentStatus": "unpaid"
  }]
}
```

Query params:
- `month` — format `yyyy-MM`

Items sorted by amount descending. **Max 20 items** returned to keep the mobile list manageable. The `status` field on each item is a computed display value (`"draft"` | `"sent"` | `"overdue"`), not a raw DB field.

## iOS Architecture

### Models (new/modified)

- `Analytics.swift` — Add `EnhancedMonthTrend`, `CategoryBreakdown`, `AttentionResponse`, `AttentionSummary`, `AttentionItem` structs
- Keep existing `IncomeAggregates` and `MonthTrend` for backward compatibility during migration

### ViewModel

- `AnalyticsViewModel.swift` — Expand to call all 4 endpoints. Add published properties for categories, attention items. Add section expansion state management (`@Published var expandedSections: Set<Section>`).

### Views

- `AnalyticsView.swift` — Rewrite as composition of sub-views:
  - `ReportsKPIGrid` — 3×2 KPI cards
  - `IncomeChartSection` — expandable, Swift Charts BarMark with amounts
  - `InvoiceTrackingSection` — expandable, summary + item list
  - `CategoryBreakdownSection` — expandable, horizontal bars
  - `VATSummarySection` — expandable, simple table
  - `ExpandableSection` — reusable container with header, badge, expand/collapse animation

### Navigation

Tapping an attention item navigates to the income entry via **tab switch + deep link**:

1. Add a `@Published var deepLinkEntryId: String?` to a shared `AppState` (or `@EnvironmentObject`)
2. On tap, set `deepLinkEntryId` and switch `selectedTab` to the income tab
3. The income tab observes `deepLinkEntryId`, scrolls to that entry, and opens its edit sheet
4. After navigation completes, clear `deepLinkEntryId`

This avoids duplicating the entry detail view and keeps the income tab as the single source for entry editing.

## Loading & Error States

- **Initial load:** Single `ProgressView` spinner centered on page while all 4 endpoints load in parallel (`async let`)
- **Per-section errors:** If an individual endpoint fails, show the sections that succeeded. Failed sections show a compact inline error: "שגיאה בטעינה" with a retry button. Do not block the whole page.
- **Month change:** Show a subtle opacity transition (0.6 opacity) while reloading, not a full spinner. Keeps the previous data visible to avoid layout jumps.
- **Empty month:** If `jobsCount == 0`, show a centered empty state: "אין נתונים לתקופה זו" instead of the KPI grid and sections.

## Formatting Conventions

**Abbreviated Hebrew month names** (for chart X-axis):
ינו׳, פבר׳, מרץ, אפר׳, מאי, יוני, יולי, אוג׳, ספט׳, אוק׳, נוב׳, דצמ׳

**Amount abbreviations** (for chart labels): Use `₪X.Xk` for amounts ≥ 1000 (e.g., ₪8.2k, ₪13.1k). Under 1000, show full number (e.g., ₪800). No Hebrew suffix needed — the ₪ symbol provides context.

## Non-Goals

- No date range presets beyond month navigation (keep it simple)
- No metric toggle (amount vs count) — always show amounts
- No year overview mode
- No export/share functionality
- No client breakdown (only category)
