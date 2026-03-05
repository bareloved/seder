# Seder – App Overview

> High-level source of truth for the Seder app. Keep it short, accurate, and useful for humans + AI agents working on this repo.

--------------------------------------------------
1. What Seder Is
--------------------------------------------------

- Seder is a web app for organizing and tracking incomes from various clients.
- Built for working musicians and freelancers who want a clear view of what was earned, what is overdue, and what is coming next.
- Elevator pitch: a focused, RTL-friendly income desk with quick add, inline editing, and import/sync tools so gig-based earners always know their cashflow status.

--------------------------------------------------
2. Who It’s For
--------------------------------------------------

- Primary users: band leaders, solo musicians, and freelancers who invoice clients.
- Typical use cases:
  - Track income per gig/client with status (draft/sent/paid/overdue).
  - See paid vs unpaid at a glance with monthly KPIs.
  - Quickly log new incomes and update statuses from desktop or mobile.
  - Import past gigs from Google Calendar to avoid manual entry.

--------------------------------------------------
3. Core Concepts & Domain Model
--------------------------------------------------

Name | Description | Important fields (selected)
---- | ----------- | ---------------------------
User | Authenticated account (Better Auth) owning all income data | id, email, name, createdAt/updatedAt
Income Entry | Single gig/job record | date, description, clientName, amountGross, amountPaid, vatRate, includesVat, invoiceStatus, paymentStatus, invoiceSentDate, paidDate, calendarEventId, categoryId, clientId, notes, userId
Category | User-customizable income category | id, name, color, icon, displayOrder, isArchived, userId
Client | Client directory entry with contact info | id, name, email, phone, notes, defaultRate, isArchived, displayOrder, userId
User Settings | User preferences and onboarding state | userId, language, timezone, theme, dateFormat, defaultCurrency, calendarSettings, onboardingCompleted
Session / Account | Auth/session + OAuth tokens for Google Calendar | session: token, expiresAt, userId; account: providerId, accessToken/refreshToken, userId, scope
Verification | OTP tokens for password reset | id, identifier, value, expiresAt
Status & VAT Types (UI) | UI enums that map to DB fields | DisplayStatus, VatType in `app/income/types.ts`
KPI / Aggregates | Derived metrics per month or filtered view | totalGross, totalPaid/unpaid, outstanding, readyToInvoice, previousMonthPaid, trend

--------------------------------------------------
4. Main Screens / Flows
--------------------------------------------------

Route / Screen | Purpose | Notes
-------------- | ------- | -----
/ | Landing page (guests) or redirect to `/income` (authenticated) | Marketing page with hero, features, testimonials
/sign-in | Auth screen | Split-screen design: email/password, Google OAuth, password reset via OTP
/income | Primary dashboard | Month selector, KPIs, filters, income table + quick add, detail dialog, calendar import, onboarding tour
/analytics | Charts and reporting | KPIs, income over time, income by category, needs attention table
/settings | User settings | Tabs: account, preferences, calendar, data, danger zone
/clients | Client directory | Client management with contact info, defaults, and analytics
/api/auth/[...all] | Auth handler | Better Auth Next.js route

--------------------------------------------------
5. Current Feature Set
--------------------------------------------------

**Income Management**
- Income table (desktop + mobile responsive) with quick add, inline edits, and full detail dialog.
- Status management: invoice status (draft/sent/paid/cancelled), payment status (unpaid/partial/paid), overdue highlighting, sent/paid actions.
- Split-pill status component for clear visual status indication.
- Filtering/search: status chips, client filter, free-text search, month/year selector; KPI cards double as filters.
- KPI row: totals, ready-to-invoice, outstanding, paid this month, trend vs previous month.

**Categories & Clients**
- Categories: dedicated entity with name, color, icon, displayOrder; inline editing in income table.
- Clients: client directory with contact info (email, phone), notes, default rates, and analytics.
- Duplicate client name detection and management.

**Analytics**
- Analytics page with date range filtering (presets and specific month/year).
- KPI cards: total gross, total paid, outstanding, count of jobs.
- Charts: income over time (line/bar), income by category (pie/donut).
- Needs attention table for overdue or pending items.

**Calendar Integration**
- Google Calendar read-only import to create draft entries with unique calendarEventId (per-user scoping).
- Calendar settings in settings page for managing connection and sync preferences.

**User Experience**
- Onboarding tour: spotlight-based guided tour for first-time users with help button to restart.
- Landing page: marketing page for guests with hero, features, how it works, testimonials, and CTA.
- Split-screen sign-in page with brand panel (desktop).
- Password reset via OTP email flow.
- Mobile support: responsive design, touch tooltips, floating action button, mobile bottom navigation.

**Settings & Account**
- Comprehensive settings page with tabs: account, preferences, calendar, data, danger zone.
- Secure account deletion with "DELETE" text confirmation.
- Theme, language, and date format preferences.
- VAT handling: includes/excludes VAT, vatRate field, calculated totals.

--------------------------------------------------
6. Tech Stack & Architecture
--------------------------------------------------

- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, shadcn-style components (Radix UI), lucide-react icons.
- Backend/API: Next.js server components + server actions; auth route at `/api/auth/[...all]`.
- Auth: Better Auth with Drizzle adapter; email/password and Google OAuth (Calendar scope).
- Database: PostgreSQL via Drizzle ORM (`db/schema.ts`, `db/client.ts`); core table `income_entries` scoped by `userId`.
- Data flow:
  - Server actions in `app/*/actions.ts` handle mutations with validation.
  - Data fetching helpers in `app/*/data.ts` query database with proper user scoping.
  - Pages fetch data on the server, then hydrate client components for optimistic updates and filtering.
  - Calendar import uses stored Google tokens to fetch events and insert draft entries (conflict-checked on calendarEventId per user).
- Key app directories: `income/`, `analytics/`, `categories/`, `clients/`, `settings/`, `sign-in/`, `(marketing)/`.

--------------------------------------------------
7. Future Direction / Out of Scope (for now)
--------------------------------------------------

- Multi-currency or localization beyond Hebrew/RTL and ILS.
- Pagination/virtualization for very large months.
- Invoicing and invoice generation (currently tracking only).
- Two-way calendar sync (currently read-only import).
- Email notifications for overdue items.
- Recurring income entries (e.g., monthly retainers).

--------------------------------------------------
8. How to Keep This File Useful
--------------------------------------------------

- Update when you add/remove a major screen, change core domain concepts, or adjust tech stack/auth/database choices.
- Keep descriptions concise; link to deeper docs if needed.
- Reflect meaningful UX or data-flow changes (e.g., new status rules, new integrations).
- Treat this as the source of truth—avoid duplicating conflicting overviews elsewhere.

