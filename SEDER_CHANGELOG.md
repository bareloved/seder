# Seder -- Changelog

> Lightweight changelog for Seder.
> Purpose: quickly see what changed lately and give AI agents context on the current state of the app.

## How to Use This File

- Add a new section at the top for each meaningful development session.
- Use the format: `## YYYY-MM-DD` (e.g., `## 2025-12-05`).
- Under each date, add short bullet points covering what was added/removed/changed and any notes for future work.

## 2026-04-05

**Branding & Marketing**
- Added favicon (`icon.svg`) and apple icon (`apple-icon.svg`) with gradient green design.
- Replaced web navbar icon with actual Seder logo (green rounded pill design).
- Added Session-style feature checklist to landing page (18 features, 2-column grid, Hebrew).
- Added marketing docs: `docs/marketing/feature-list.md` (feature positioning), `docs/marketing/friends-and-family-beta.md` (beta launch messaging and strategy).

## 2026-03-25

**iOS Google Sign-In**
- Added Google Sign-In to iOS auth screens (GoogleSignIn SPM package, URL scheme).
- Redesigned iOS sign-in/sign-up screens with dark forest theme.
- Use Ploni font throughout auth screens; increased font sizes.
- Proper Google "G" logo, subtler button border, larger sign-in button.
- Multiple RTL fixes: right-aligned form labels, Hebrew placeholder styling, show/hide password toggle.
- Handle Google Sign-In cancellation silently with Hebrew error text.

## 2026-03-21

**iOS App Store Prep**
- Fixed code signing, app icons (removed alpha channels from all 13 variants), and push notification configuration.
- Added encryption compliance key (`ITSAppUsesNonExemptEncryption = NO`).
- Bumped iOS build number to 2.
- Added `docs/APPLE_DEVELOPER_TASKS.md` checklist for TestFlight and App Store submission.

## 2026-03-19

**Web UI Overhaul**
- Overhauled analytics, clients, and income pages to match iOS app design.
- Matched analytics month picker to income page design.
- Added feedback button to web navbar with iOS-matching modal design.
- Matched admin page design to income page layout.
- Redirect authenticated users away from sign-in page.

## 2026-03-18

**iOS Income Enhancements**
- Added swipe actions (left/right) to income entries.
- Added multi-select with batch operations (batch delete, batch edit, mark as paid).
- Settings page UI tweaks and loading screen for income tab.
- Fixed navbar avatar not showing on income tab.

## 2026-03-15

**iOS Yearly Analytics**
- Added yearly mode toggle to iOS analytics/reports tab.
- Added MiniSparkline component for trends in category and client breakdowns.
- Added client income pie chart with tap tooltip interaction.
- Enhanced monthly trends with status tracking (EnhancedMonthTrend model).
- Category and client breakdowns now show monthly amounts and historical data.

**Client Intelligence Phase 2**
- Added to `ClientWithAnalytics` in `@seder/shared`: totalInvoiced, incomePercentage, latePaymentRate, paymentHealth (good/warning/bad), activityTrend (up/down/stable), lastGigDate, lastActiveMonths.
- Added `computePaymentHealth()` and `computeActivityTrend()` utilities.
- New API endpoints: `/api/v1/analytics/clients`, `/api/v1/analytics/categories`, `/api/v1/analytics/trends`, `/api/v1/analytics/kpis`.

## 2026-03-14

**Admin Dashboard**
- Added admin dashboard at `/admin` (owner-only, hardcoded email check).
- Overview KPIs: total users, new this week, active this month, unread feedback.
- User list with detail sheet (signup date, entry counts, verification status).
- Sentry health indicator and quick links to external services (Sentry, Vercel Analytics, Neon, Upstash, Google Cloud).
- Auto-backup toggle via `site_config` table; manual backup trigger.

**Feedback System**
- Added `feedback` table in database with category (general/bug/feature), platform (web/ios), and status tracking.
- Added POST `/api/v1/feedback` endpoint.
- Web: feedback modal accessible from navbar.
- iOS: feedback sheet accessible from GreenNavBar on all tabs; category badges.
- Admin: feedback management with status actions (mark unread, in_progress, done), reply (sends email via Resend), delete. Pill-styled action buttons.

**Onboarding Redesign**
- Web: refactored to 7-step highlight-only tour (no user actions triggered during tour).
- iOS: redesigned to 6-step card-based overlay with white cards and green icons.
- Added `data-tour` attributes to Navbar and MobileBottomNav.
- Fixed iOS persistence bug (write to UserDefaults directly).

## 2026-03-13

**Production Readiness (Beta Launch Prep)**
- Added Sentry error tracking for web (`@sentry/nextjs`) and iOS (`sentry-cocoa`) with userId tagging.
- Added Vercel Analytics for page view tracking.
- Added rate limiting on auth endpoints (10 req/60s per IP) via Upstash Redis.
- Added email verification with `sendOnSignUp`, auto sign-in after verification, and amber banner for unverified users.
- Added welcome email sent after verification (email/password) or on sign-up (Google OAuth).
- Seed 3 default categories on new user creation.
- Added Hebrew error pages: global-error.tsx, error.tsx, not-found.tsx.
- Added iOS error handling: 429 rate limit support, reusable ErrorView component.
- Improved empty states for income and analytics on both web and iOS with Hebrew CTAs.
- Added guided tour overlay for iOS first-time users (5-step tour with next/previous).
- Added in-app feedback: POST `/api/v1/feedback` endpoint, FeedbackModal (web), FeedbackSheet (iOS).
- Added automated daily DB backups via Neon branch API (cron at 3:00 UTC).
- Added iOS privacy manifest (PrivacyInfo.xcprivacy) for App Store compliance.
- Added `docs/PRODUCTION_READINESS_TESTING.md` manual testing checklist.
- Google OAuth popup flow with graceful rate limit fallback.
- Sentry client instrumentation and user tagging.

## 2026-03-12

**Smart Nudges**
- Added nudge engine: computes context-aware suggestions (overdue invoices, unsent invoices, follow-ups).
- Added nudge REST API endpoint (`/api/v1/nudges`) with dismiss/snooze support.
- Integrated nudges into push notification cron.
- Added iOS NudgeViewModel, NudgeSection with swipe actions on income list.
- Added notification settings section in iOS (thresholds, push toggles).

## 2026-03-11

**iOS Reports Overhaul**
- Redesigned iOS reports/analytics tab with dedicated sections: KPI grid, income chart, invoice tracking, category breakdown, VAT summary.
- Added expandable/collapsible report sections.
- Added month/year selector with popover pickers.
- Used CurrencyText component for consistent currency sizing across all reports.

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
- Device token registration endpoint (`/api/v1/devices`).

**iOS App Icons**
- Added app icon with 13 alternate color variants (Abyss, Dark, Ember, Forest, Jade, Lime, Midnight, Mint, Obsidian, Ocean, Pistachio, Spring, Sunset).
- App icon picker in settings.

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
