# Push Notifications Redesign

## Summary

Replace the current 7 nudge types with 4 focused notification types. Wire up the cron job that was never added to `vercel.json`. Simplify settings UI to match.

## Problem

1. The overdue-notifications cron endpoint exists but was never scheduled in `vercel.json` — no push notifications have ever been sent
2. The current 7 nudge types are overcomplicated and don't match real user workflows

## Nudge Types (4 total)

### 1. `overdue` — unpaid invoice reminder

- **Trigger:** Daily cron. Fires for any income entry with `invoiceStatus: "sent"` and `paymentStatus !== "paid"` where 30+ days have passed since `invoiceSentDate` (or `updatedAt` as fallback).
- **Push message:** `"יש לך חשבונית שלא שולמה מעל 30 יום — {clientName} - {description} (₪{amountGross})"`
- **Dedup:** Once per entry per 7 days (using `lastPushedAt` on the dismissed_nudges row). The cron runs daily but won't re-push the same entry within 7 days.
- **Max per run:** 2 notifications per user (unchanged from current behavior).

### 2. `weekly_uninvoiced` — weekly invoice reminder

- **Trigger:** Runs on the user's chosen day of the week (default: Friday). Checks for any income entries with `invoiceStatus: "draft"` dated within the last 7 days (inclusive of the day 7 days prior — e.g., Friday cron looks back to the previous Saturday).
- **Push message:** `"יש לך {count} עבודות שממתינות לחשבונית"`
- **Skips** if zero uninvoiced entries in the window.
- **Dedup:** Once per week using periodKey `"{year}-W{weekNumber}"`.
- **New setting:** `nudgeWeeklyDay` — integer 0-6 (Sunday=0 through Saturday=6), default `5` (Friday).

### 3. `calendar_sync` — beginning of month calendar reminder

- **Trigger:** 1st of each month.
- **Push message:** `"חודש חדש! יש ביומן עבודות לסנכרן עם סדר?"`
- **No data lookup.** Generic reminder sent to all users with this nudge enabled.
- **Dedup:** Once per month using periodKey `"{year}-{month}"` (e.g., `"2026-04"`).

### 4. `unpaid_check` — end of month payment reconciliation

- **Trigger:** Last day of each month. Determined dynamically:
  ```typescript
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (now.getDate() === lastDay) { /* fire */ }
  ```
- **Push message:** `"סוף חודש! יש עבודות ששולמו כבר ולא סומנו?"`
- **No data lookup.** Generic reminder sent to all users with this nudge enabled.
- **Dedup:** Once per month using periodKey `"{year}-{month}"`.

## Cron Schedule

Single daily cron at **08:00 UTC** (11:00 Israel time). The handler checks the current day to decide which nudge types to process:

- **Every day:** check `overdue` (30+ day entries)
- **User's chosen weekday** (default Friday): check `weekly_uninvoiced`
- **1st of month:** send `calendar_sync`
- **Last day of month:** send `unpaid_check`

### vercel.json addition

```json
{
  "path": "/api/cron/overdue-notifications",
  "schedule": "0 8 * * *"
}
```

## What Gets Removed

| Old nudge type | Disposition |
|---|---|
| `way_overdue` (30d) | Replaced by `overdue` |
| `overdue_payment` (14d) | Removed — no 14-day tier |
| `partial_stale` | Removed |
| `uninvoiced` (per-entry, 3d/7d) | Replaced by `weekly_uninvoiced` (aggregate) |
| `batch_invoice` (Fri/Sun, 2+ gigs) | Replaced by `weekly_uninvoiced` |
| `month_end` (uninvoiced) | Replaced by `unpaid_check` (about payments) |
| `unlogged_calendar` | Replaced by `calendar_sync` (generic) |

## Settings Changes

### Remove
- `nudgeInvoiceDays` — no longer needed (uninvoiced has no day threshold)
- `nudgePaymentDays` — no longer needed (overdue is fixed at 30 days)
- Per-type toggles for removed nudge types

### Add
- `nudgeWeeklyDay` — integer 0-6, default 5 (Friday). Which day to send the weekly uninvoiced reminder.

### Keep (simplified)
- `nudgePushEnabled` — object with 4 boolean keys:
  ```typescript
  {
    overdue: boolean;          // default: true
    weekly_uninvoiced: boolean; // default: true
    calendar_sync: boolean;     // default: true
    unpaid_check: boolean;      // default: true
  }
  ```

### Settings UI
- 4 toggle switches (one per nudge type) with Hebrew labels
- Day-of-week picker for `nudgeWeeklyDay` (dropdown or segmented control, Hebrew day names)
- Remove the old threshold number inputs

## Files to Change

| File | Change |
|---|---|
| `apps/web/vercel.json` | Add overdue-notifications cron entry |
| `apps/web/lib/nudges/types.ts` | Replace nudge types, update defaults, add `nudgeWeeklyDay` |
| `apps/web/lib/nudges/compute.ts` | Rewrite with 4 nudge types |
| `apps/web/lib/nudges/queries.ts` | Update settings queries for new fields, remove old threshold fields |
| `apps/web/app/api/cron/overdue-notifications/route.ts` | Rewrite cron handler with day-of-week/month logic |
| `apps/web/app/settings/components/NotificationsSection.tsx` | Simplify to 4 toggles + day picker |
| `apps/web/app/settings/actions.ts` | Update settings mutation for new fields |
| `apps/web/db/schema.ts` | Update `userSettings` columns (remove old thresholds, add `nudgeWeeklyDay`) |
| `apps/web/app/api/v1/nudges/route.ts` | Update to use new nudge types |
| `apps/ios/Seder/Seder/Views/Settings/` | Update notification settings UI if it exists on iOS |

## Testing

- Unit tests for `computeNudges` with the 4 new types
- Verify day-of-week logic for `weekly_uninvoiced`
- Verify last-day-of-month detection for `unpaid_check`
- Verify 7-day dedup for `overdue` (not 24h)
- Verify the cron handler only fires relevant types based on current day
