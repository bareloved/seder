# Production Readiness — Manual Testing Checklist

Everything implemented in the production readiness session. Use this to verify each feature.

---

## 1. Error Tracking — Sentry (Web)

**Files:** `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `next.config.js`, `lib/sentry.ts`

**Env vars:** `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

**Test:**
- [ ] Create Sentry project, set env vars
- [ ] Trigger a JS error → appears in Sentry dashboard
- [ ] Check source maps upload (readable stack traces)
- [ ] Verify userId is attached to errors (log in, trigger error, check Sentry event)

---

## 2. Vercel Analytics

**Files:** `app/layout.tsx` (added `<Analytics />`)

**Test:**
- [ ] Deploy to Vercel
- [ ] Visit pages → check Vercel Analytics tab shows page views

---

## 3. Sentry iOS Setup

**Files:** `Services/SentryService.swift`, `SederApp.swift`, `ViewModels/AuthViewModel.swift`

**Note:** Code is commented out until you add the Sentry Swift SDK via SPM.

**Test:**
- [ ] Add `sentry-cocoa` package in Xcode via SPM
- [ ] Uncomment code in `SentryService.swift`
- [ ] Set DSN, build, force crash → verify in Sentry dashboard
- [ ] Check userId is attached after login

---

## 4. Rate Limiting (Auth Endpoints)

**Files:** `lib/ratelimit.ts`, `app/api/auth/[...all]/route.ts`

**Env vars:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

**Rate-limited paths:** `/sign-in`, `/sign-up`, `/reset-password`, `/email-otp`, `/verify-email`
**Limit:** 10 requests per 60 seconds per IP (sliding window)

**Test:**
- [ ] Set up Upstash Redis, add env vars
- [ ] Rapidly hit sign-in 11+ times → should get 429 response with Hebrew message "נסה שוב מאוחר יותר"
- [ ] Verify non-auth routes (session, callbacks) are NOT rate limited

---

## 5. Email Verification

**Files:** `lib/auth.ts` (emailVerification config), `lib/email.ts` (verification email template), `components/EmailVerificationBanner.tsx`, `app/layout.tsx`

**Test:**
- [ ] Sign up with email/password → verification email arrives (Hebrew, RTL, green button)
- [ ] Click verification link → auto-signed in
- [ ] Before verifying: amber banner shows at top of page with "שלח שוב" button
- [ ] After verifying: banner disappears
- [ ] Resend button works

---

## 6. Welcome Email

**Files:** `lib/email.ts` (sendWelcomeEmail), `lib/auth.ts` (afterEmailVerification hook + databaseHooks)

**Two flows:**
- Email/password: welcome email sent after email verification
- Google OAuth: welcome email sent immediately on sign-up (emailVerified is already true)

**Test:**
- [ ] Sign up with email → verify → check inbox for welcome email (Hebrew, RTL, green CTA button)
- [ ] Sign up with Google → check inbox for welcome email (no verification step needed)
- [ ] Email contains user's name if available

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
- [ ] New account → tour starts automatically after page load
- [ ] Tour highlights: income list, add button, calendar import, navigation
- [ ] Esc key skips tour
- [ ] Help button (?) lets you restart tour
- [ ] Tour doesn't show again after completion

---

## 14. Guided Tour (iOS)

**Files:** `Views/Components/TourOverlay.swift`, `Views/MainTabView.swift`, `Views/Settings/SettingsView.swift`

**Test:**
- [ ] First launch on iOS → tour overlay appears after 1 second
- [ ] 5 steps with next/previous navigation, Hebrew text
- [ ] Step counter "X מתוך 5"
- [ ] Tour doesn't show again after completion
- [ ] Settings → "הצג סיור מודרך שוב" resets and shows tour again

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
