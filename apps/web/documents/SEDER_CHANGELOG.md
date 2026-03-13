# Seder – Changelog

> Lightweight changelog for Seder.
> Purpose: quickly see what changed lately and give AI agents context on the current state of the app.

## How to Use This File

- Add a new section at the top for each meaningful development session.
- Use the format: `## YYYY-MM-DD` (e.g., `## 2025-12-05`).
- Under each date, add short bullet points covering what was added/removed/changed and any notes for future work.

## 2026-03-13

**Production Readiness (Beta Launch Prep)**
- Added Sentry error tracking for web (`@sentry/nextjs`) and iOS (`sentry-cocoa`) with userId tagging.
- Added Vercel Analytics for page view tracking.
- Added rate limiting on auth endpoints (10 req/60s per IP) via Upstash Redis.
- Added email verification with `sendOnSignUp`, auto sign-in after verification, and amber banner for unverified users.
- Added welcome email sent after verification (email/password) or on sign-up (Google OAuth).
- Seed 3 default categories (קטגוריה 1/2/3) on new user creation.
- Added Hebrew error pages: global-error.tsx, error.tsx, not-found.tsx.
- Added iOS error handling: 429 rate limit support, reusable ErrorView component.
- Improved empty states for income and analytics on both web and iOS with Hebrew CTAs.
- Added guided tour overlay for iOS first-time users (5-step tour with next/previous).
- Added in-app feedback: POST `/api/v1/feedback` endpoint, FeedbackModal (web), FeedbackSheet (iOS).
- Added automated daily DB backups via Neon branch API (cron at 3:00 UTC).
- Added iOS privacy manifest (PrivacyInfo.xcprivacy) for App Store compliance.
- Added `docs/PRODUCTION_READINESS_TESTING.md` manual testing checklist.

## 2026-03-12

**Smart Nudges**
- Added nudge engine: computes context-aware suggestions (overdue invoices, unsent invoices, follow-ups).
- Added nudge REST API endpoint (`/api/v1/nudges`).
- Integrated nudges into push notification cron.
- Added iOS NudgeViewModel, NudgeSection with swipe actions on income list.
- Added notification settings section in iOS (thresholds, push toggles).

## 2026-03-11

**iOS Reports Overhaul**
- Redesigned iOS reports/analytics tab with dedicated sections: KPI grid, income chart, invoice tracking, category breakdown, VAT summary.
- Added expandable/collapsible report sections.
- Added month/year selector with popover pickers.
- Used CurrencyText component for consistent ₪ sizing across all reports.

## 2026-03-09

**iOS Settings Redesign**
- Redesigned iOS settings page with grouped sections, avatar, and account info.
- Added change email, change password, and account deletion flows.
- Added notifications settings section.

**iOS Calendar Import**
- Added Google Calendar import flow in iOS with calendar selection, event preview, and batch import.

**iOS Clients Page**
- Redesigned iOS clients page with search, analytics per client, and detail view.

## 2026-03-05

**Native iOS App**
- Built native iOS app (Swift/SwiftUI) replacing the Expo mobile app.
- Income list, detail view, add/edit forms.
- APIClient with URLSession, KeychainService for auth tokens.
- Classification engine ported to Swift.
- Green navigation bar with settings/avatar button across all tabs.
- Push notification support via APNs/Expo Push API.

## 2026-01-25

**Onboarding**
- Added spotlight-based onboarding tour for first-time users.
- Tour guides users through adding income, understanding KPIs, and calendar import.
- Improved tour tooltip positioning on mobile devices.
- Added inline category creation during onboarding flow.
- Added help button to restart tour at any time.

**Categories**
- Refactored categories: moved new category button to footer in category dialog.
- Categories now support full CRUD (name, color, icon, displayOrder).

**Settings & Account**
- Added comprehensive settings page with tabs: account, preferences, calendar, data, danger zone.
- Implemented secure account deletion with "DELETE" text confirmation (instead of password).
- Added password requirements UI for signup.
- Added OTP-based password reset with email verification.

**Authentication**
- Redesigned sign-in page with split-screen layout and brand panel on desktop.
- Added trustedOrigins to prevent session loss after deployment.

**Landing Page**
- Added Hebrew-first landing page for guest users.
- Includes hero section, feature showcase, how it works, testimonials, and CTA.
- Enhanced visual design with colors, backgrounds, and animations.
- Updated hero mockup to reflect actual app features.

**Mobile UX**
- Improved mobile experience with touch tooltips and layout fixes.
- Added floating action button for quick income entry.
- Redesigned status icons with split-pill status component.
- Improved filter layout on mobile.
- Added accessibility labels (DialogDescription) to dialogs.

**Analytics**
- Added analytics page with date range filtering.
- KPI cards showing total gross, paid, outstanding, and job count.
- Income over time chart (line/bar visualization).
- Income by category chart (pie/donut).
- Needs attention table for overdue/pending items.

**Clients**
- Added clients page with client directory.
- Client management with contact info, notes, and default rates.
- Duplicate client name detection.

## 2025-12-05

- Added "Category" column to the incomes table with inline editable dropdown.
- Improved description column: allows wrapping to 2 lines for long text only.
- Fixed header alignment in incomes table.
