# Seder -- App Overview

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
Client | Client directory entry with contact info and analytics | id, name, email, phone, notes, defaultRate, isArchived, displayOrder, userId; computed: totalInvoiced, incomePercentage, latePaymentRate, paymentHealth, activityTrend, lastGigDate
User Settings | User preferences and onboarding state | userId, language, timezone, theme, dateFormat, defaultCurrency, calendarSettings, onboardingCompleted
Session / Account | Auth/session + OAuth tokens for Google Calendar | session: token, expiresAt, userId; account: providerId, accessToken/refreshToken, userId, scope
Verification | OTP tokens for password reset | id, identifier, value, expiresAt
Device | Push notification device tokens | id, token, userId, platform
Feedback | User feedback entries for admin review | id, message, category (general/bug/feature), platform (web/ios), status (unread/read/in_progress/done/replied), adminReply, repliedAt, userId
Site Config | Admin key-value settings | key, value, updatedAt (e.g., auto_backup_enabled)
Dismissed Nudges | Tracks dismissed smart nudges | nudgeKey, userId, dismissedAt, snoozeUntil
KPI / Aggregates | Derived metrics per month or filtered view | totalGross, totalPaid/unpaid, outstanding, readyToInvoice, previousMonthPaid, trend

--------------------------------------------------
4. Main Screens / Flows
--------------------------------------------------

### Web App

Route / Screen | Purpose | Notes
-------------- | ------- | -----
/ | Landing page (guests) or redirect to `/income` (authenticated) | Marketing page with hero, features, Session-style feature checklist, testimonials
/sign-in | Auth screen | Split-screen design: email/password, Google OAuth, password reset via OTP; redirects authenticated users
/income | Primary dashboard | Month selector, KPIs, filters, income table + quick add, detail dialog, calendar import, onboarding tour, smart nudges
/analytics | Charts and reporting | KPIs, income over time, income by category, needs attention table, date range filtering
/clients | Client directory | Client management with contact info, defaults, analytics, and merge tool
/categories | Category management | CRUD with name, color, icon, displayOrder
/settings | User settings | Tabs: account, preferences, calendar, data, danger zone
/admin | Admin dashboard | Owner-only; overview KPIs (total users, new this week, active this month, unread feedback), feedback management (status, reply, delete), user list with detail sheet, Sentry health indicator, auto-backup toggle, manual backup trigger, quick links to external services
/privacy, /terms | Legal pages | Privacy policy and terms of service
/api/auth/[...all] | Auth handler | Better Auth Next.js route with rate limiting

### iOS App

Screen | Purpose | Notes
------ | ------- | -----
Sign In / Sign Up | Auth | Email/password + Google Sign-In; dark forest theme design; Hebrew RTL; Ploni font
Income List | Primary view | Month selector, entries list, add button, nudge banner, multi-select with batch operations, swipe actions (left/right)
Income Detail | Entry editing | Full detail with status actions
Analytics/Reports | Reporting | KPIs, income chart, invoice tracking, category breakdown, VAT summary; monthly/yearly toggle with sparklines and trend indicators
Clients | Client directory | Client list with contact info, analytics per client, client income pie chart
Categories | Category management | Category list with CRUD
Calendar Import | Google Calendar | Calendar selection, event preview, batch import
Settings | User settings | Account (email/password change), notifications (thresholds, push toggles), preferences, app icon picker (13 color variants), feedback sheet, guided tour reset, account deletion

--------------------------------------------------
5. Current Feature Set
--------------------------------------------------

**Income Management**
- Income table (desktop + mobile responsive) with quick add, inline edits, and full detail dialog.
- Status management: invoice status (draft/sent/paid/cancelled), payment status (unpaid/partial/paid), overdue highlighting, sent/paid actions.
- Split-pill status component for clear visual status indication.
- Filtering/search: status chips, client filter, free-text search, month/year selector; KPI cards double as filters.
- KPI row: totals, ready-to-invoice, outstanding, paid this month, trend vs previous month.
- Batch operations: multi-select, batch edit, batch delete (web + iOS).
- iOS swipe actions on income entries (left/right).

**Smart Nudges**
- Context-aware suggestions for overdue invoices, unsent invoices, and follow-up reminders.
- Nudge banner on income page with swipe actions (iOS).
- Push notification integration for timely reminders.
- Dismissible with snooze durations.
- iOS: navigate-to-month functionality from nudge actions.

**Categories & Clients**
- Categories: dedicated entity with name, color, icon, displayOrder; inline editing in income table.
- 3 default categories seeded on new user creation.
- Clients: client directory with contact info (email, phone), notes, default rates, and analytics.
- Client intelligence: totalInvoiced, incomePercentage, latePaymentRate, paymentHealth (good/warning/bad), activityTrend (up/down/stable), lastGigDate, lastActiveMonths.
- Duplicate client name detection and management.
- iOS: client income pie chart with tap tooltip interaction.

**Analytics**
- Analytics page with date range filtering (presets and specific month/year).
- KPI cards showing total gross, paid, outstanding, and job count.
- Charts: income over time (line/bar), income by category (pie/donut).
- Needs attention table for overdue/pending items.
- iOS: dedicated reports tab with KPI grid, income chart, invoice tracking, category breakdown, VAT summary.
- iOS: yearly mode toggle with sparklines and trend indicators per category/client.
- API endpoints: `/api/v1/analytics/kpis`, `/api/v1/analytics/trends`, `/api/v1/analytics/categories`, `/api/v1/analytics/clients`.

**Calendar Integration**
- Google Calendar read-only import to create draft entries with unique calendarEventId (per-user scoping).
- Calendar settings in settings page for managing connection and sync preferences.
- Auto-sync cron job every 6 hours.
- iOS: full calendar import flow with calendar selection, event preview, and batch import.

**User Experience**
- Onboarding tour: web has 7 steps (highlight-only spotlight/modal, no user actions required); iOS has 6 steps (white card with green icons overlay). Help button to restart on both platforms.
- Landing page: marketing page for guests with hero, features, Session-style feature checklist, how it works, testimonials, and CTA.
- Split-screen sign-in page with brand panel (desktop).
- iOS: dark forest theme auth screens with Google Sign-In, Ploni font, Hebrew RTL.
- Password reset via OTP email flow.
- Email verification with amber banner for unverified users.
- Welcome email sent after verification (email) or sign-up (Google OAuth).
- Mobile support: responsive design, touch tooltips, floating action button, mobile bottom navigation.
- In-app feedback: feedback modal (web navbar) and feedback sheet (iOS, accessible from GreenNavBar on all tabs) that stores to DB. Admin reviews, replies, and manages feedback from /admin dashboard.
- Branding: custom Seder logo in web navbar, favicon and apple-icon SVGs with gradient green design.

**Settings & Account**
- Comprehensive settings page with tabs: account, preferences, calendar, data, danger zone.
- Secure account deletion with "DELETE" text confirmation.
- Theme, language, and date format preferences.
- Notification preferences with thresholds (iOS).
- VAT handling: includes/excludes VAT, vatRate field, calculated totals.
- iOS: app icon picker with 13 color variants (Abyss, Dark, Ember, Forest, Jade, Lime, Midnight, Mint, Obsidian, Ocean, Pistachio, Spring, Sunset).
- iOS: change email, change password flows.

**Admin Dashboard** (owner-only)
- Overview KPIs: total users, new users this week, active this month, unread feedback count.
- Feedback management: view/filter by status, reply (sends email), mark as read/unread/in_progress/done, delete.
- User list with detail sheet showing signup date, entry counts, verification status.
- Sentry health indicator.
- Database backup: auto-backup toggle (via site_config), manual backup trigger.
- Quick links to external services (Sentry, Vercel Analytics, Neon, Upstash, Google Cloud).

**Production Infrastructure**
- Sentry error tracking (web + iOS) with userId tagging.
- Vercel Analytics for page view tracking.
- Rate limiting on auth endpoints (10 req/60s per IP via Upstash).
- Automated daily database backups via Neon branch API with rotation (max 5 branches) and admin toggle (auto_backup_enabled in site_config).
- iOS privacy manifest for App Store compliance.
- Hebrew error pages (404, error boundary, global error).
- Push notifications via APNs/Expo Push API with device token registration.

--------------------------------------------------
6. Tech Stack & Architecture
--------------------------------------------------

- **Web Frontend**: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, shadcn-style components (Radix UI), lucide-react icons.
- **iOS Frontend**: Swift, SwiftUI, URLSession (async/await), Keychain auth, SF Symbols, GoogleSignIn SDK, Sentry (sentry-cocoa).
- **Backend/API**: Next.js server components + server actions; REST API at `/api/v1/` for iOS; auth route at `/api/auth/[...all]`.
- **Auth**: Better Auth with Drizzle adapter; email/password and Google OAuth (Calendar scope); Google Sign-In on iOS; email verification; rate limiting.
- **Database**: PostgreSQL (Neon) via Drizzle ORM; core table `income_entries` scoped by `userId`; RLS enabled.
- **Email**: Resend for transactional emails (verification, password reset, welcome, feedback reply) with RTL/Arial Hebrew templates.
- **Error Tracking**: Sentry (`@sentry/nextjs` for web, `sentry-cocoa` for iOS) with userId tagging.
- **Rate Limiting**: Upstash Redis with sliding window on auth endpoints.
- **Analytics**: Vercel Analytics.
- **Push Notifications**: APNs via Expo Push API; device token registration; cron-based delivery.
- **Monorepo**: Turborepo + pnpm workspaces; `@seder/shared` for cross-platform types/logic; `@seder/api-client` for typed HTTP client.
- Data flow:
  - Server actions in `app/*/actions.ts` handle mutations with validation.
  - Data fetching helpers in `app/*/data.ts` query database with proper user scoping.
  - Pages fetch data on the server, then hydrate client components for optimistic updates and filtering.
  - Calendar import uses stored Google tokens to fetch events and insert draft entries (conflict-checked on calendarEventId per user).
  - iOS app consumes REST API via URLSession with Bearer token auth stored in Keychain.
- Key app directories: `income/`, `analytics/`, `categories/`, `clients/`, `settings/`, `admin/`, `sign-in/`, `(marketing)/`.

### REST API (`/api/v1/`)

Endpoint | Methods | Purpose
-------- | ------- | -------
/income | GET, POST, PUT, DELETE | Income entry CRUD
/analytics | GET | General analytics
/analytics/kpis | GET | KPI aggregates
/analytics/trends | GET | Monthly trends
/analytics/categories | GET | Category breakdown
/analytics/clients | GET | Client breakdown with intelligence
/categories | GET, POST, PUT, DELETE | Category CRUD
/clients | GET, POST, PUT, DELETE | Client CRUD
/calendar | GET, POST | Calendar event listing and import
/settings | GET, PUT | User settings
/devices | POST, DELETE | Push notification device tokens
/nudges | GET, POST | Smart nudge fetch and dismiss
/feedback | POST | Submit user feedback

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
- Treat this as the source of truth -- avoid duplicating conflicting overviews elsewhere.
