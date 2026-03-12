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

- **Phase 1 (this spec):** Smart Nudges — invoice & payment reminders, in-app + push
- **Phase 2 (future):** Client Intelligence — per-client stats, payment patterns, seasonal insights
- **Phase 3 (future):** Integrations — WhatsApp payment reminders, bank transfer detection

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
