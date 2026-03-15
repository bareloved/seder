# Yearly Reports View — Design Spec

**Date:** 2026-03-15
**Scope:** iOS reports page + backend API changes
**Branch:** From `clientintelligence` or `main`

## Overview

Add a yearly aggregation mode to the iOS reports page. Users select "שנה שלמה" (Full Year) from the existing month picker popover to switch into yearly mode. All sections display year-scoped data. Tapping a bar in the yearly chart drills back into that month.

## Decisions

| Question | Answer |
|----------|--------|
| Toggle UI | "שנה שלמה" as first item in month picker popover |
| KPI trend in yearly mode | YTD vs same period last year |
| Invoice tracking in yearly mode | Hidden |
| Income chart in yearly mode | 12-month bar chart (one bar per month) |
| Category/client breakdowns | Yearly totals + monthly sparkline per item |
| API approach | Extend existing endpoints with `period=year` param |

## API Changes

All existing analytics endpoints gain an optional `period` query parameter. All endpoints consistently use `month=YYYY-MM` to identify the year (extracted from the param). No new query param names.

### `GET /api/v1/analytics/kpis?month=YYYY-MM&period=year`

When `period=year`:
- Date range: Jan 1 – Dec 31 of the year extracted from `month`
- All KPI fields aggregate the full year
- `trend` calculation:
  - **Current year** (year == now's year): compares YTD (Jan through current calendar month) vs same months of previous year
  - **Past year**: compares full 12-month total vs full previous year
- `previousMonthPaid` retains its name but holds the comparison period's total paid (previous year's equivalent period). `ReportsKPIGrid` does not display this field directly — it's only used for the trend % calculation — so no label change needed.
- Response type: same `IncomeAggregates` — no new fields

### `GET /api/v1/analytics/trends?month=YYYY-MM&period=year`

When `period=year`:
- Ignores the month portion and `count` param — uses only the year from `month`
- Returns 12 `EnhancedMonthTrend` items (Jan–Dec of the given year)
- Response type: same `EnhancedMonthTrend[]`

### `GET /api/v1/analytics/categories?month=YYYY-MM&period=year`

When `period=year`:
- Aggregates full year, top 5 + "אחר"
- Each item includes `monthlyAmounts: number[]` — 12 values (index 0 = Jan, 11 = Dec)
- For the "אחר" bucket: `monthlyAmounts` is the sum of all overflow items' monthly subtotals
- Query strategy: single query with `EXTRACT(MONTH FROM date)` grouping, then partition top 5 vs rest in JS
- Response type: `CategoryBreakdown` extended with optional `monthlyAmounts`

### `GET /api/v1/analytics/clients?month=YYYY-MM&period=year`

When `period=year`:
- Same as categories — full year, top 5 + "אחר"
- Each item includes `monthlyAmounts: number[]`
- Same query strategy as categories
- Response type: `ClientBreakdown` extended with optional `monthlyAmounts`

### `GET /api/v1/analytics/attention`

Not called in yearly mode. No changes needed.

## Data Layer (`apps/web/app/income/data.ts`)

New functions:

### `getIncomeAggregatesForYear({ year, userId })`
- Date range: `YYYY-01-01` to `YYYY+1-01-01`
- Same KPI calculations as `getIncomeAggregatesForMonth`
- Trend logic:
  - If `year == currentYear`: compare Jan..currentMonth of `year` vs Jan..currentMonth of `year-1`
  - If `year < currentYear`: compare full year vs full previous year
- Returns: `IncomeAggregates` (same type)

### `getYearTrends({ year, userId })`
- Returns 12 `EnhancedMonthTrend` items for the year
- Same per-month logic as `getEnhancedTrends` but always 12 months of a single year
- Returns: `EnhancedMonthTrend[]` (same type)

### `getCategoryBreakdownYearly({ year, userId })`
- Single query: group by `categoryId` + `EXTRACT(MONTH FROM date)` for the full year
- In JS: sum per-category totals, determine top 5, build `monthlyAmounts` arrays
- "אחר" bucket: sum monthly arrays of all overflow categories
- Returns: `(CategoryBreakdown & { monthlyAmounts: number[] })[]`

### `getClientBreakdownYearly({ year, userId })`
- Same strategy as category yearly, grouped by `clientName` instead
- Returns: `(ClientBreakdown & { monthlyAmounts: number[] })[]`

## iOS Model Changes

### `CategoryBreakdown` / `ClientBreakdown`
Add optional field:
```swift
let monthlyAmounts: [Double]?  // 12 values, Jan=0..Dec=11. nil in monthly mode.
```

No other model changes. `IncomeAggregates` and `EnhancedMonthTrend` stay the same.

## iOS ViewModel Changes (`AnalyticsViewModel`)

### New state
```swift
enum AnalyticsPeriod { case monthly, yearly }
@Published var period: AnalyticsPeriod = .monthly
```

Replaces a plain boolean for readability and future extensibility.

### `loadAll()` changes
- When `period == .yearly`:
  - Append `URLQueryItem(name: "period", value: "year")` to kpis, trends, categories, clients requests
  - Trends request: send `month=YYYY-MM&period=year` (same as others, no separate `year` param)
  - Skip attention endpoint (set `attention = nil`)
- When `period == .monthly`: no change (current behavior)

### `retrySection()` changes
- Must also respect `period`. When `period == .yearly`, append `URLQueryItem(name: "period", value: "year")` to the retry request for that section.
- `.invoiceTracking` case: no-op when yearly (section is hidden).

### Navigation
- When yearly and chevron tapped: step `selectedMonth` by ±1 year
- When monthly and chevron tapped: step by ±1 month (unchanged)
- Year boundaries: same range as year picker (`thisYear - 3 ... thisYear + 1`)

## iOS View Changes

### Month Selector (`AnalyticsView`)
- Month picker popover: insert "שנה שלמה" as first item with a divider separator below
- Selecting "שנה שלמה" sets `viewModel.period = .yearly`
- Selecting any month sets `viewModel.period = .monthly`
- Picker button label: conditionally show "שנה שלמה" in `SederTheme.brandGreen` when yearly, otherwise show `months[currentMonthIndex - 1]` as current
- When yearly: chevrons step by year

### Income Chart Section
- When yearly: chart receives 12 trends (full year) instead of 6
- The amount labels HStack below the chart: hide in yearly mode (12 labels don't fit at current font size). The chart bars already convey relative amounts.
- Tapping a bar: set `viewModel.period = .monthly` **first**, then update `selectedMonth`. This ordering ensures `loadAll()` (triggered by `onChange(of: selectedMonth)`) uses monthly mode. Alternatively, set both and call `loadAll()` explicitly instead of relying on `onChange`.

### Category Breakdown Section
- When `monthlyAmounts` is present: replace the progress bar with `MiniSparkline` view in each row
- When absent (monthly mode): show progress bar as current

### Client Pie Chart Section
- Same as category: show `MiniSparkline` in legend rows when `monthlyAmounts` present (below the amount/percentage line)

### Invoice Tracking Section
- Hidden when `viewModel.period == .yearly` (don't render the section at all)

### VAT Summary Section
- No changes — receives yearly aggregated data from KPIs

### New Component: `MiniSparkline`
- Reusable SwiftUI view
- Input: `values: [Double]` (12 monthly amounts)
- Renders small bar chart (~40pt tall, ~80pt wide)
- Subtle styling: thin bars with `SederTheme.brandGreen`, no labels/axes
- Used in both category and client breakdown rows

## Cross-Platform Sync

After implementing API changes:
1. Run `pnpm sync:contract` to regenerate `docs/api-contract.json`
2. Run `pnpm sync:check-ios` to verify Swift model alignment

## Non-Goals
- Web app yearly view changes (already has `specific-year` preset)
- Year-over-year comparison charts
- Export/PDF of yearly report
- Caching of yearly aggregations (can add later if needed)
