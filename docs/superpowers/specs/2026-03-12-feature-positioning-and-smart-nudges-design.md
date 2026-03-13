# Feature Positioning & Smart Nudges Design

## Part A: Feature Positioning for Marketing

### Core Positioning

Seder is everything that happens *before* the accountant. It's not invoicing software (not competing with iCount/Green Invoice). It answers the questions the accountant's software doesn't: "did I log that gig?", "who hasn't paid me yet?", "how's this month looking?"

### One-Liner

> סדר — לדעת בדיוק כמה הרווחת, מי חייב לך, ומה עוד לא חויב. בלי אקסל, בלי להתקשר לרואה חשבון.

### Feature Hierarchy

#### Tier 1: Lead with these (the "aha" moments)

**"תמונת מצב ב-2 שניות" — KPI Dashboard**
- Hero feature. Open the app → immediately see: total this month, pending invoices, waiting for payment, received.
- Frame: "the answer to 'how's this month going?' without calling your accountant"

**"מי חייב לי כסף?" — Payment & Invoice Filtering**
- Emotional killer feature. One tap to see everything unpaid.
- Frame: "stop chasing people from memory — Seder knows who owes you"

#### Tier 2: Show next (the "that's smart" features)

**"היומן עובד בשבילך" — Google Calendar Import**
- Biggest time-saver. Not a "why" feature but a "how" feature.
- Frame: "finished a gig? It's already in Seder. No typing needed."

**"דוחות שמראים את התמונה האמיתית" — Reports & Trends**
- Monthly breakdown, by category, over time.
- Frame: "see where your money actually comes from — which clients, which types of work"

#### Tier 3: Mention but don't lead with (trust builders)

- Native iOS app — "works from your phone between gigs"
- Privacy — "no ads, no data selling"
- VAT handling — "built for Israeli freelancers, not a translated American app"

---

## Part B: Smart Nudges (Phase 1)

### Overview

A proactive layer on top of existing data that surfaces what needs attention, both in-app and via push notifications. Turns Seder from a passive tracker into an active assistant.

### Long-Term Roadmap

- **Phase 1:** Smart Nudges — invoice & payment reminders, in-app + push
- **Phase 2:** Client Intelligence — per-client stats, payment health, activity trends
- **Phase 3:** Integrations — WhatsApp, bank, payment apps (not yet designed — needs research)

### Nudge Types & Triggers

#### Invoice Nudges

| Nudge | Trigger | Default Threshold |
|-------|---------|-------------------|
| Uninvoiced gig | Entry with `invoiceStatus = 'draft'`, older than X days | 3 days |
| Batch invoice reminder | End of week: multiple uninvoiced gigs exist | Weekly |
| Month-end closing | Last 3 days of month: uninvoiced gigs exist | 3 days before month end |

#### Payment Nudges

"Older than X days" refers to `invoiceSentDate` (the date the invoice was marked as sent). If `invoiceSentDate` is NULL but `invoiceStatus = 'sent'`, fall back to `updatedAt`.

| Nudge | Trigger | Default Threshold |
|-------|---------|-------------------|
| Overdue payment | `invoiceStatus = 'sent'` + `paymentStatus != 'paid'`, sent date older than X days | 14 days |
| Way overdue | Same as above, escalation tier | 30 days |
| Partial payment stale | `paymentStatus = 'partial'`, no activity for X days | 14 days |

Entries with `invoiceStatus = 'cancelled'` are excluded from all nudges.

#### General Nudges

| Nudge | Trigger | Default Threshold |
|-------|---------|-------------------|
| Unlogged calendar events | Calendar events from this week not yet imported | Daily check |

Calendar nudge only applies to users who have connected Google Calendar. Requires a calendar fetch — piggybacks on existing auto-sync at `app/api/calendar/auto-sync/`. If OAuth token is expired, skip this nudge silently (don't nudge about nudges).

### Delivery: In-App vs Push

#### In-App (Action Feed)

- Collapsible "דורש טיפול" banner at the top of the income page
- Shows count badge: "4 פריטים דורשים טיפול"
- Prioritized list: overdue payments → uninvoiced gigs → suggestions
- Each item has clear action buttons: "שלח חשבונית", "סמן כשולם", "ייבא מהיומן"
- Dismiss or snooze (snooze = remind in 3 days)
- When empty: banner disappears entirely

#### Push Notifications (iOS only)

Push fires at higher thresholds than in-app, as an escalation:
- Payment overdue 14+ days (in-app shows immediately when sent)
- Uninvoiced gigs older than 7 days (in-app shows at 3 days)
- Month-end reminder

Constraints:
- Max 1-2 push notifications per day
- User can toggle per nudge type in settings
- Don't re-push the same nudge unless it was snoozed (snoozed nudges can re-trigger push after snooze period expires)

#### Not Included (YAGNI)

- Email notifications
- SMS
- WhatsApp integration (Phase 3)

### Data Model

#### No new tables for nudge computation

Nudges are computed from existing data:
- Invoice nudges: `invoiceStatus = 'draft'` + `date` older than threshold
- Payment nudges: `invoiceStatus = 'sent'` + `paymentStatus != 'paid'` + sent date exceeds threshold
- Calendar nudges: recent calendar events vs imported entries (using existing `calendarEventId`)

#### New: User nudge preferences

Extend existing settings table/API:
- `nudge_invoice_days` (number, default: 3)
- `nudge_payment_days` (number, default: 14)
- `nudge_push_enabled` (JSON object with concrete shape):

```typescript
{
  uninvoiced: boolean;        // default: true
  overdue_payment: boolean;   // default: true
  way_overdue: boolean;       // default: true
  partial_stale: boolean;     // default: true
  unlogged_calendar: boolean; // default: false (only for Calendar-connected users)
  month_end: boolean;         // default: true
}
```

#### New: Dismissed nudges table

```
dismissed_nudges:
  - id (PK)
  - userId (FK)
  - entryId (FK, nullable — NULL for aggregate nudges)
  - nudgeType (enum: 'uninvoiced' | 'overdue_payment' | 'way_overdue' | 'partial_stale' | 'unlogged_calendar' | 'month_end')
  - periodKey (string, nullable — e.g. '2026-W11' for weekly batch, '2026-03' for month-end. Used as dedup key for aggregate nudges)
  - dismissedAt (timestamp)
  - snoozeUntil (timestamp, nullable)
  - lastPushedAt (timestamp, nullable — tracks when push was last sent for this nudge)
```

Deduplication strategy:
- **Per-entry nudges** (uninvoiced, overdue, etc.): unique on `(userId, entryId, nudgeType)`
- **Aggregate nudges** (batch reminder, month-end): unique on `(userId, nudgeType, periodKey)` where `periodKey` encodes the time period (e.g. `'2026-W11'` for week 11, `'2026-03'` for March month-end)

#### Push delivery

- Refactor existing cron at `app/api/cron/overdue-notifications/` to use the new nudge computation (replaces the current 30-day-only logic with the full nudge system)
- Uses existing APNs via Expo Push API + `devices` table
- Deduplicate via `lastPushedAt`: don't re-push unless snoozed and snooze period expired

### UI Placement

#### Web — Income Page

- New collapsible banner at the top, above entries list
- Count badge, expandable prioritized list, inline action buttons
- Dismiss/snooze with subtle animation
- Disappears when empty

#### iOS — Income Tab

- Section at top of income list
- Cards with swipe-to-dismiss, tap-to-act
- Badge on tab icon showing pending nudge count

#### Settings Page

- New "התראות" section
- Toggle push notifications per nudge type
- Configure day thresholds (invoice days, payment days)

### What This Enables for Marketing

The Smart Nudges feature directly strengthens the top two marketing messages:
- **"מי חייב לי כסף?"** → Seder doesn't just show you — it *reminds* you to chase it
- **"תמונת מצב ב-2 שניות"** → Not just a dashboard, but a dashboard that tells you what to do next

The marketing pitch becomes: "Seder reminded me to invoice a gig I forgot about — that's ₪3,000 I would have lost."

---

## Part C: Client Intelligence (Phase 2)

### Overview

Enrich the existing Clients page with per-client analytics computed from income entry data. Turns the client list from a contact directory into a business intelligence tool. No new pages — everything enhances the existing Clients page.

This phase is passive (no nudges). Users look at client intelligence when they choose to, unlike Phase 1 which is proactive.

### Per-Client Computed Stats

All computed from existing data — no new tables needed. Every income entry already has `clientId`, `invoiceSentDate`, `paidDate`, `amountGross`, `date`.

#### Existing vs New Fields

The existing `ClientWithAnalytics` type already has: `totalEarned`, `thisMonthRevenue`, `thisYearRevenue`, `averagePerJob`, `jobCount`, `outstandingAmount`, `avgDaysToPayment`, `overdueInvoices`.

Strategy: **extend** the existing type with new fields. Do not rename existing fields — this would break the iOS app. New fields are added alongside existing ones.

#### Financial Stats

| Stat | Field | Computation | Notes |
|------|-------|-------------|-------|
| Total earned | `totalEarned` (existing) | `SUM(amountPaid)` | Actual money received — keeps consistency with existing analytics |
| Total invoiced | `totalInvoiced` (new) | `SUM(amountGross)` | Full invoiced amount including unpaid |
| Gig count | `jobCount` (existing) | `COUNT(*)` of entries | |
| Average per job | `averagePerJob` (existing) | `totalEarned / jobCount` | |
| % of total income | `incomePercentage` (new) | Client's `totalEarned` / all user's `totalEarned` for selected period | Always computed for the selected time period, not all-time — avoids misleading averages |
| Amount unpaid (debt) | `outstandingAmount` (existing) | `SUM(amountGross - amountPaid)` where `paymentStatus != 'paid'` | |
| This month revenue | `thisMonthRevenue` (existing) | Kept as-is | |
| This year revenue | `thisYearRevenue` (existing) | Kept as-is | |

**Entries without `clientId`:** Only client-linked entries are included in per-client stats. `incomePercentage` denominator uses ALL user entries (including unlinked). This means percentages may sum to less than 100% — this is correct and expected. No "Unassigned" bucket needed.

#### Payment Reliability Stats

| Stat | Field | Computation | Notes |
|------|-------|-------------|-------|
| Average days to pay | `avgDaysToPayment` (existing) | `AVG(paidDate - invoiceSentDate)` where both fields exist | |
| Late payment rate | `latePaymentRate` (new) | % of entries where days-to-pay exceeded 30 days | Uses fixed 30-day threshold, NOT the user's `nudge_payment_days` — avoids retroactive changes when user adjusts settings |
| Currently overdue count | `overdueInvoices` (existing) | Entries with `invoiceStatus = 'sent'` + `paymentStatus != 'paid'` past 14 days | |

#### Activity Stats

| Stat | Field | Computation | Notes |
|------|-------|-------------|-------|
| Last gig date | `lastGigDate` (new) | `MAX(date)` | |
| Last active label | `lastActiveMonths` (new) | Months since last gig date | Shown as "פעיל לפני X חודשים" — more intuitive than raw frequency |
| Activity trend | `activityTrend` (new) | Compare last 3 months gig count vs prior 3 months | **up:** last 3mo count >20% higher. **down:** >20% lower. **stable:** within 20%. If fewer than 2 gigs total, returns `null`. |

#### Payment Health Indicator

Derived field: `paymentHealth: 'good' | 'warning' | 'bad'`

Evaluated in order (first match wins):

| Level | Color | Rule |
|-------|-------|------|
| Bad | Red | `overdueInvoices >= 3 OR latePaymentRate >= 50%` |
| Warning | Orange | `overdueInvoices > 0 OR latePaymentRate >= 20%` |
| Good | Green | Everything else |

#### Time Scoping

Stats computed for all-time by default. Option to filter to current year or custom period via the same period selector used elsewhere in the app. Exception: `incomePercentage` is always computed for the selected period (never all-time) to avoid misleading averages.

### UI: Enhanced Clients Page

#### Client Card Enhancements

Each client card gets a stats row below the existing client info:

**Always visible (summary):**
- Total revenue
- Gig count
- Last gig date

**Payment health indicator** — colored dot/badge on each card:
- **Green:** average days-to-pay under threshold, nothing overdue
- **Orange:** has overdue invoices or sometimes pays late
- **Red:** consistently late payer or multiple overdue items

**Expandable detail** (tap/click to reveal):
- Average gig value
- % of total income
- Amount unpaid (debt)
- Average days to pay
- Gig frequency
- Activity trend (arrow: ↑ ↓ →)

#### Sorting Options

Combined existing + new sort options:

| Sort | Direction |
|------|-----------|
| Name | A-Z (existing) |
| Revenue | Highest first |
| Last activity | Most recent first |
| Jobs done | Most first |
| Amount unpaid (debt) | Highest first |

Default remains existing display order.

### API & Performance

#### Computation Approach

Extend existing `getClientsWithAnalytics` function to compute the full stats set in a single query using SQL aggregations.

**Query strategy:**
- Single query with CTEs joining `clients` and `incomeEntries` on `clientId`
- GROUP BY client for: revenue, count, avg gig value, last date, overdue count, unpaid amount
- Days-to-pay average: separate CTE filtering entries where both `invoiceSentDate` and `paidDate` exist
- Activity trend: CTE comparing `COUNT(*)` for last 3 months vs prior 3 months
- % of total income: window function or separate subquery for user's total revenue

**Performance:**
- All computation server-side via SQL — no client-side aggregation
- No caching layer for now — data freshness matters more than speed at this user scale
- If performance becomes an issue later, add materialized views or periodic computation

#### API Endpoint

Extend existing `GET /api/v1/clients` to accept `?analytics=true` query param:
- Without param: returns existing `Client[]` (backwards compatible)
- With `?analytics=true`: returns `ClientWithAnalytics[]` with the full stats object
- iOS app uses the same endpoint

#### Extended Type

Extends existing `ClientWithAnalytics` — all existing fields preserved, new fields added:

```typescript
interface ClientWithAnalytics extends DBClient {
  // Existing fields (do NOT rename — iOS depends on these)
  totalEarned: number;
  thisMonthRevenue: number;
  thisYearRevenue: number;
  averagePerJob: number;
  jobCount: number;
  outstandingAmount: number;
  avgDaysToPayment: number | null;
  overdueInvoices: number;

  // New fields (Phase 2)
  totalInvoiced: number;
  incomePercentage: number;              // 0-100, for selected period
  latePaymentRate: number;               // 0-100, uses fixed 30-day threshold
  lastGigDate: string | null;            // ISO date
  lastActiveMonths: number | null;       // months since last gig, null if no gigs
  activityTrend: 'up' | 'down' | 'stable' | null; // null if < 2 gigs
  paymentHealth: 'good' | 'warning' | 'bad';
}
```

### What This Enables for Marketing

Strengthens the "מי חייב לי כסף?" message with depth:
- "Not just who owes you — but who *always* pays late, and who's your most valuable client"
- "Know which clients are worth chasing and which ones aren't worth the trouble"

---

## Part D: Integrations (Phase 3) — Placeholder

### Status: Not Yet Designed

Phase 3 requires research into available APIs and feasibility before designing. Shelved until Phases 1 and 2 are validated with real users.

### Candidate Integrations to Research

| Integration | What it would do | Research needed |
|-------------|-----------------|-----------------|
| WhatsApp Business API | Send payment reminders to clients directly from Seder | API access, pricing, Israeli phone number requirements |
| Bank sync (Open Banking) | Auto-detect incoming transfers, match to entries, auto-mark as paid | Israeli Open Banking regulation status, bank API availability |
| Bit / PayBox / Paypal | Detect payments from Israeli payment apps | API availability, authentication flow |
| Accountant export | Generate monthly summary in accountant-friendly format (CSV/Excel) | Common formats used by Israeli accountants (Hashavshevet, etc.) |

### When to Design Phase 3

After Phase 1 and 2 are shipped and validated:
1. Survey users: which integration would save them the most time?
2. Research API feasibility for the top-voted option
3. Design and spec through the normal brainstorming flow
