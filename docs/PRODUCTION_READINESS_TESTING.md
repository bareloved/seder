# Production Readiness — Manual Testing Checklist

Everything implemented in the production readiness session. Use this to verify each feature.

---

## 1. Error Tracking — Sentry (Web)

**Files:** `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `next.config.js`, `lib/sentry.ts`

**Env vars:** `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

**Test:**
- [x] Create Sentry project, set env vars
- [x] Trigger a JS error → appears in Sentry dashboard
- [ ] Check source maps upload (readable stack traces)
- [x] Verify userId is attached to errors (log in, trigger error, check Sentry event)

**Notes (2026-03-16):** Created `javascript-nextjs` project in Sentry. Added `instrumentation.ts` and `instrumentation-client.ts` for proper Next.js App Router integration. Added `SentryUserTag` component to root layout for userId tagging. Removed deprecated `disableLogger` from next.config.js. Source maps not yet verified in production build.

---

## 2. Vercel Analytics

**Files:** `app/layout.tsx` (added `<Analytics />`)

**Test:**
- [x] Deploy to Vercel
- [x] Visit pages → check Vercel Analytics tab shows page views

**Notes (2026-03-16):** Fixed import from `@vercel/analytics/react` to `@vercel/analytics/next` — the `/react` import doesn't work with Next.js App Router. Analytics confirmed working after fix.

---

## 3. Sentry iOS Setup

**Files:** `Services/SentryService.swift`, `SederApp.swift`, `ViewModels/AuthViewModel.swift`

**Note:** Code is commented out until you add the Sentry Swift SDK via SPM.

**Test:**
- [x] Add `sentry-cocoa` package in Xcode via SPM
- [x] Uncomment code in `SentryService.swift`
- [x] Set DSN, build, force crash → verify in Sentry dashboard
- [ ] Check userId is attached after login

**Notes (2026-03-16):** Created separate `seder-ios` Sentry project. Uncommented all SentryService code, set DSN. Added DEBUG-only test button in Settings. Test error confirmed in Sentry dashboard. userId tagging not yet verified.

---

## 4. Rate Limiting (Auth Endpoints)

**Files:** `lib/ratelimit.ts`, `app/api/auth/[...all]/route.ts`

**Env vars:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**Rate-limited paths:** `/sign-in`, `/sign-up`, `/reset-password`, `/email-otp`, `/verify-email`
**Limit:** 10 requests per 60 seconds per IP (sliding window)

**Test:**
- [x] Set up Upstash Redis, add env vars
- [x] Rapidly hit sign-in 11+ times → should get 429 response with Hebrew message "נסה שוב מאוחר יותר"
- [ ] Verify non-auth routes (session, callbacks) are NOT rate limited

**Notes (2026-03-16):** Created Upstash Redis instance. Rate limiting confirmed: 10 requests pass with 401, then 429 kicks in. Added Hebrew rate limit error handling in login form (`signInError.status === 429`). Hebrew message "יותר מדי ניסיונות. נסו שוב מאוחר יותר." displays correctly.

---

## 5. Email Verification

**Files:** `lib/auth.ts` (emailVerification config), `lib/email.ts` (verification email template), `components/EmailVerificationBanner.tsx`, `app/layout.tsx`

**Test:**
- [x] Sign up with email/password → verification email arrives (Hebrew, RTL, green button)
- [ ] Click verification link → auto-signed in
- [ ] Before verifying: amber banner shows at top of page with "שלח שוב" button
- [ ] After verifying: banner disappears
- [ ] Resend button works

**Notes (2026-03-16):** Verification email confirmed arriving (was in spam folder). Fixed RTL in all email templates: added `direction: rtl; unicode-bidi: embed;` to `<td>` and `<p>` elements, added `&#x200F;` RTL marks, changed font stack to `Arial Hebrew, Heebo`. Verification link click, banner, and resend not yet tested.

---

## 6. Welcome Email

**Files:** `lib/email.ts` (sendWelcomeEmail), `lib/auth.ts` (afterEmailVerification hook + databaseHooks)

**Two flows:**
- Email/password: welcome email sent after email verification
- Google OAuth: welcome email sent immediately on sign-up (emailVerified is already true)

**Test:**
- [x] Sign up with email → verify → check inbox for welcome email (Hebrew, RTL, green CTA button)
- [ ] Sign up with Google → check inbox for welcome email (no verification step needed)
- [x] Email contains user's name if available

**Notes (2026-03-16):** Welcome email confirmed working after verification. Redesigned email to include 4 feature highlights (income tracking, Google Calendar import, analytics, smart nudges) with emojis. Fixed subject line RTL (`!` placement). Updated body copy to "החשבון שלך אומת!". Google OAuth welcome flow not yet tested.

---

## 7. Seed Default Categories

**Files:** `lib/auth.ts` (databaseHooks.user.create.after)

Seeds 3 categories on every new user: קטגוריה 1 (emerald), קטגוריה 2 (indigo), קטגוריה 3 (slate)

**Test:**
- [ ] Create new account → go to categories page → 3 default categories exist
- [ ] Categories are editable/deletable
- [ ] Income entry form shows these categories in dropdown

---

## 8. Web Error Pages

**Files:** `app/global-error.tsx`, `app/error.tsx`, `app/not-found.tsx`

**Test:**
- [ ] Visit `/nonexistent-page` → Hebrew 404 page with link home
- [ ] Trigger a component error → Hebrew error page with retry button
- [ ] Errors are reported to Sentry

---

## 9. iOS Error Handling

**Files:** `Models/APIResponse.swift` (added `rateLimited` case), `Services/APIClient.swift` (429 handling), `Views/Components/ErrorView.swift`

**Test:**
- [ ] Trigger 429 from iOS (rapid auth requests) → error shows Hebrew "נסה שוב מאוחר יותר"
- [ ] ErrorView renders with retry button using brand green

---

## 10. Empty States (Web)

**Files:** `app/income/components/IncomeListView.tsx`, `app/analytics/AnalyticsPageClient.tsx`, analytics chart components

**Test:**
- [ ] New account with no income → income page shows "אין הכנסות עדיין" with Google Calendar mention
- [ ] Analytics page with no data → shows "אין נתונים להצגה" with CTA to income page
- [ ] Filter to month with no entries → "no results" state shows

---

## 11. Empty States (iOS)

**Files:** `Views/Income/IncomeListView.swift`, `Views/Analytics/AnalyticsView.swift`

**Test:**
- [ ] New account on iOS → income list shows "הוסיפו את ההכנסה הראשונה או ייבאו מיומן Google"
- [ ] Analytics tab with no data → shows improved empty state

---

## 12 & 13. Welcome Modal + Guided Tour (Web)

**Already existed** — full onboarding system with spotlight overlay, tooltips, help button.

**Files:** `components/onboarding/` (OnboardingTour, SpotlightOverlay, TourTooltip, HelpButton, types)

**Test:**
- [x] New account → tour starts automatically after page load
- [x] Tour highlights: income list, add button, calendar import, navigation
- [x] Esc key skips tour
- [x] Help button (?) lets you restart tour
- [x] Tour doesn't show again after completion

**Notes (2026-03-16):** Refactored tour to be highlight-only (no actions triggered). Expanded from 4 to 7 steps: welcome, add button, calendar import, navigation bar, analytics, clients, and "יאללה תהנו!" completion. Added `data-tour` attributes to Navbar and MobileBottomNav.

---

## 14. Guided Tour (iOS)

**Files:** `Views/Components/TourOverlay.swift`, `Views/MainTabView.swift`, `Views/Settings/SettingsView.swift`

**Test:**
- [x] First launch on iOS → tour overlay appears after 1 second
- [x] 5 steps with next/previous navigation, Hebrew text
- [x] Step counter "X מתוך 5"
- [x] Tour doesn't show again after completion
- [ ] Settings → "הצג סיור מודרך שוב" resets and shows tour again

**Notes (2026-03-16):** Redesigned tour: white card with green icons instead of gray blur material. Updated to 6 steps matching web tour. Fixed persistence bug — tour was re-showing on every app launch because onChange binding wasn't triggering reliably. Fixed by writing UserDefaults directly in TourOverlay on completion/dismiss.

---

## 15. Feedback API Endpoint

**Files:** `app/api/v1/feedback/route.ts`

**Env var:** `FEEDBACK_EMAIL`

**Test:**
- [ ] POST to `/api/v1/feedback` with `{ message, platform }` → email sent to FEEDBACK_EMAIL
- [ ] Unauthenticated request → 401
- [ ] Empty message → validation error
- [ ] Message > 5000 chars → validation error
- [ ] HTML in message is escaped (no XSS in email)

---

## 16. Feedback UI (Web)

**Files:** `components/FeedbackModal.tsx`, `components/ui/textarea.tsx`, `app/settings/page.tsx`

**Test:**
- [ ] Settings page → feedback button (MessageSquare icon) in header
- [ ] Click → modal opens with textarea, Hebrew placeholder
- [ ] Submit → toast success notification
- [ ] Empty message → submit button disabled

---

## 17. Feedback UI (iOS)

**Files:** `Views/Settings/FeedbackSheet.swift`, `Views/Settings/SettingsView.swift`

**Test:**
- [ ] Settings → "שליחת משוב" row → opens feedback sheet
- [ ] Hebrew placeholder text "ספרו לנו מה אתם חושבים..."
- [ ] Submit → success alert
- [ ] Empty message → button disabled
- [ ] Error → Hebrew error message shown

---

## 18. iOS Privacy Manifest

**Files:** `PrivacyInfo.xcprivacy`

Declares: no tracking, email/name collection, UserDefaults API usage.

**Test:**
- [ ] Open in Xcode → Privacy manifest visible in target
- [ ] App Store Connect / TestFlight upload doesn't flag privacy issues

---

## 19. Automated DB Backups

**Files:** `app/api/cron/backup/route.ts`, `vercel.json`

**Env vars:** `NEON_API_KEY`, `NEON_PROJECT_ID`

**Schedule:** Daily at 3:00 AM UTC

**Test:**
- [ ] Set Neon env vars
- [ ] Call `GET /api/cron/backup` with `Authorization: Bearer <CRON_SECRET>` → creates Neon branch named `backup-YYYY-MM-DD`
- [ ] Check Neon dashboard → backup branch exists
- [ ] Deploy to Vercel → cron runs automatically

---

## 20. iOS Production Setup (Manual)

- [ ] Enroll in Apple Developer Program
- [ ] Create App ID + provisioning profiles
- [ ] Add Sentry Swift SDK via SPM in Xcode
- [ ] Create TestFlight build and upload
- [ ] Set all env vars on Vercel (see sections above)

---

## Environment Variables Summary

Add these to Vercel:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking |
| `SENTRY_ORG` | Sentry org slug |
| `SENTRY_PROJECT` | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | Sentry source map uploads |
| `UPSTASH_REDIS_REST_URL` | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting |
| `FEEDBACK_EMAIL` | Where feedback emails are sent |
| `NEON_API_KEY` | Automated DB backups |
| `NEON_PROJECT_ID` | Automated DB backups |
