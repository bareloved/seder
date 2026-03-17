# Seder – App Overview

> High-level source of truth for the Seder app. Keep it short, accurate, and useful for humans + AI agents working on this repo.

--------------------------------------------------
1. What Seder Is
--------------------------------------------------

- Seder is a cross-platform income tracking app (web + native iOS) for organizing and tracking incomes from various clients.
- Built for working musicians and freelancers who want a clear view of what was earned, what is overdue, and what is coming next.
- Elevator pitch: a focused, RTL-friendly income desk with quick add, inline editing, smart nudges, and import/sync tools so gig-based earners always know their cashflow status.

--------------------------------------------------
2. Who It's For
--------------------------------------------------

- Primary users: band leaders, solo musicians, and freelancers who invoice clients.
- Typical use cases:
  - Track income per gig/client with status (draft/sent/paid/overdue).
  - See paid vs unpaid at a glance with monthly KPIs.
  - Quickly log new incomes and update statuses from desktop, mobile web, or iOS app.
  - Import past gigs from Google Calendar to avoid manual entry.
  - Get smart nudges for overdue invoices and follow-up reminders.

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
Device | Push notification device tokens | id, token, userId, platform
Feedback | User feedback entries for admin review | id, message, category (general/bug/feature), platform (web/ios), status (unread/read/in_progress/done/replied), adminReply, repliedAt, userId
Site Config | Admin key-value settings | key, value, updatedAt (e.g., auto_backup_enabled)
Status & VAT Types (UI) | UI enums that map to DB fields | DisplayStatus, VatType in `app/income/types.ts`
KPI / Aggregates | Derived metrics per month or filtered view | totalGross, totalPaid/unpaid, outstanding, readyToInvoice, previousMonthPaid, trend

--------------------------------------------------
4. Main Screens / Flows
--------------------------------------------------

### Web App

Route / Screen | Purpose | Notes
-------------- | ------- | -----
/ | Landing page (guests) or redirect to `/income` (authenticated) | Marketing page with hero, features, testimonials
/sign-in | Auth screen | Split-screen design: email/password, Google OAuth, password reset via OTP
/income | Primary dashboard | Month selector, KPIs, filters, income table + quick add, detail dialog, calendar import, onboarding tour, smart nudges
/analytics | Charts and reporting | KPIs, income over time, income by category, needs attention table
/clients | Client directory | Client management with contact info, defaults, analytics, and merge tool
/settings | User settings | Tabs: account, preferences, calendar, data, danger zone; feedback button
/admin | Admin dashboard | Owner-only; overview KPIs (total users, new this week, active this month, unread feedback), feedback management (status, reply, delete), user list with detail sheet, Sentry health indicator, auto-backup toggle, manual backup trigger, quick links to external services
/api/auth/[...all] | Auth handler | Better Auth Next.js route with rate limiting

### iOS App

Screen | Purpose | Notes
------ | ------- | -----
Login/Register | Auth | Email/password + Google OAuth
Income List | Primary view | Month selector, entries list, add button, nudge banner
Income Detail | Entry editing | Full detail with status actions
Analytics/Reports | Reporting | KPIs, income chart, invoice tracking, category breakdown, VAT summary
Clients | Client directory | Client list with contact info and analytics
Settings | User settings | Account, notifications, preferences, feedback, guided tour reset

--------------------------------------------------
5. Current Feature Set
--------------------------------------------------

**Income Management**
- Income table (desktop + mobile responsive) with quick add, inline edits, and full detail dialog.
- Status management: invoice status (draft/sent/paid/cancelled), payment status (unpaid/partial/paid), overdue highlighting, sent/paid actions.
- Split-pill status component for clear visual status indication.
- Filtering/search: status chips, client filter, free-text search, month/year selector; KPI cards double as filters.
- KPI row: totals, ready-to-invoice, outstanding, paid this month, trend vs previous month.
- Batch operations: multi-select, batch edit, batch delete.

**Smart Nudges**
- Context-aware suggestions for overdue invoices, unsent invoices, and follow-up reminders.
- Nudge banner on income page with swipe actions (iOS).
- Push notification integration for timely reminders.

**Categories & Clients**
- Categories: dedicated entity with name, color, icon, displayOrder; inline editing in income table.
- 3 default categories seeded on new user creation.
- Clients: client directory with contact info (email, phone), notes, default rates, and analytics.
- Duplicate client name detection and management.

**Analytics**
- Analytics page with date range filtering (presets and specific month/year).
- KPI cards showing total gross, paid, outstanding, and job count.
- Charts: income over time (line/bar), income by category (pie/donut).
- Needs attention table for overdue/pending items.
- iOS: dedicated reports tab with KPI grid, income chart, invoice tracking, category breakdown, VAT summary.

**Calendar Integration**
- Google Calendar read-only import to create draft entries with unique calendarEventId (per-user scoping).
- Calendar settings in settings page for managing connection and sync preferences.
- Auto-sync cron job every 6 hours.

**User Experience**
- Onboarding tour: web has 7 steps (highlight-only spotlight/modal, no user actions required); iOS has 6 steps (card-based overlay). Help button to restart on both platforms.
- Landing page: marketing page for guests with hero, features, how it works, testimonials, and CTA.
- Split-screen sign-in page with brand panel (desktop).
- Password reset via OTP email flow.
- Email verification with amber banner for unverified users.
- Welcome email sent after verification (email) or sign-up (Google OAuth).
- Mobile support: responsive design, touch tooltips, floating action button, mobile bottom navigation.
- In-app feedback: feedback modal (web) and feedback sheet (iOS, accessible from GreenNavBar on all tabs) that stores to DB. Admin reviews, replies, and manages feedback from /admin dashboard.

**Settings & Account**
- Comprehensive settings page with tabs: account, preferences, calendar, data, danger zone.
- Secure account deletion with "DELETE" text confirmation.
- Theme, language, and date format preferences.
- Notification preferences with thresholds (iOS).
- VAT handling: includes/excludes VAT, vatRate field, calculated totals.

**Production Infrastructure**
- Sentry error tracking (web + iOS) with userId tagging.
- Vercel Analytics for page view tracking.
- Rate limiting on auth endpoints (10 req/60s per IP via Upstash).
- Automated daily database backups via Neon branch API with rotation (max 5 branches) and admin toggle (auto_backup_enabled in site_config).
- iOS privacy manifest for App Store compliance.
- Hebrew error pages (404, error boundary, global error).

--------------------------------------------------
6. Tech Stack & Architecture
--------------------------------------------------

- **Web Frontend**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, shadcn-style components (Radix UI), lucide-react icons.
- **iOS Frontend**: Swift, SwiftUI, URLSession (async/await), Keychain auth, SF Symbols.
- **Backend/API**: Next.js server components + server actions; REST API at `/api/v1/` for iOS; auth route at `/api/auth/[...all]`.
- **Auth**: Better Auth with Drizzle adapter; email/password and Google OAuth (Calendar scope); email verification; rate limiting.
- **Database**: PostgreSQL (Neon) via Drizzle ORM; core table `income_entries` scoped by `userId`; RLS enabled.
- **Email**: Resend for transactional emails (verification, password reset, welcome, feedback).
- **Error Tracking**: Sentry (`@sentry/nextjs` for web, `sentry-cocoa` for iOS).
- **Rate Limiting**: Upstash Redis with sliding window on auth endpoints.
- **Analytics**: Vercel Analytics.
- **Monorepo**: Turborepo + pnpm workspaces; `@seder/shared` for cross-platform types/logic.
- Data flow:
  - Server actions in `app/*/actions.ts` handle mutations with validation.
  - Data fetching helpers in `app/*/data.ts` query database with proper user scoping.
  - Pages fetch data on the server, then hydrate client components for optimistic updates and filtering.
  - Calendar import uses stored Google tokens to fetch events and insert draft entries (conflict-checked on calendarEventId per user).
  - iOS app consumes REST API via URLSession with Bearer token auth stored in Keychain.
- Key app directories: `income/`, `analytics/`, `categories/`, `clients/`, `settings/`, `admin/`, `sign-in/`, `(marketing)/`.

--------------------------------------------------
7. Future Direction / Out of Scope (for now)
--------------------------------------------------

- Multi-currency or localization beyond Hebrew/RTL and ILS.
- Pagination/virtualization for very large months.
- Invoicing and invoice generation (currently tracking only).
- Two-way calendar sync (currently read-only import).
- Recurring income entries (e.g., monthly retainers).
- Expense tracking (tab exists with "coming soon" placeholder).

--------------------------------------------------
8. How to Keep This File Useful
--------------------------------------------------

- Update when you add/remove a major screen, change core domain concepts, or adjust tech stack/auth/database choices.
- Keep descriptions concise; link to deeper docs if needed.
- Reflect meaningful UX or data-flow changes (e.g., new status rules, new integrations).
- Treat this as the source of truth — avoid duplicating conflicting overviews elsewhere.
