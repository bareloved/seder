# Production Readiness: Confident Launch

**Date:** 2026-03-12
**Goal:** Prepare Seder (web + iOS) for a small beta launch (50-100 users via TestFlight + open web sign-up), with iOS as the primary experience.

## Context

Seder is a Hebrew-first income tracking app for freelancers and musicians. The web app (Next.js on Vercel) and iOS app (Swift/SwiftUI) share types via `@seder/shared`. The web app is deployed at sedder.app. The iOS app needs TestFlight distribution.

### Current State

| Area | Status |
|------|--------|
| Auth (Better Auth, bcrypt, Keychain) | Strong |
| Privacy policy + ToS (Hebrew) | Exists |
| Onboarding | Minimal — no tutorial, basic empty states |
| Error tracking | Missing — no Sentry, no monitoring |
| Rate limiting | Missing — no abuse prevention |
| Email | Partial — password reset only |
| Database (RLS, migrations, manual backups) | Solid (backups are manual via scripts, not automated) |
| iOS App Store / TestFlight readiness | Low |

## Design

### 1. Error Tracking & Monitoring

#### Web — Sentry + Vercel Analytics

- Add `@sentry/nextjs`
- Auto-capture: unhandled errors, server action failures, API route errors
- Upload source maps on build via `@sentry/nextjs` Webpack plugin + `SENTRY_AUTH_TOKEN` env var in Vercel
- Add Vercel Analytics (zero config, privacy-friendly, no cookie banner needed) for page views, unique visitors, and top pages
- Tag Sentry events with `userId` for correlating errors to specific beta users

#### iOS — Sentry Swift SDK (separate Sentry project from web)

- Add via Swift Package Manager
- Captures crashes, unhandled exceptions, network errors
- Tag events with `userId` for per-user debugging
- Complements TestFlight crash reports

### 2. Auth Hardening

#### Email Verification

- Add Better Auth's `emailVerification` plugin (separate from the existing `emailOTP` plugin used for password reset — both coexist)
- On email/password sign-up, send verification email via Resend with a confirmation link
- Google OAuth users skip verification (email already verified by Google) and receive a welcome email immediately on first sign-up
- Until verified: users can log in but see a "check your email" banner
- Enforcement: check `emailVerified` flag in a shared layout component (web) and in the iOS APIClient response middleware (API returns a `emailVerified: false` field on the user object)
- Prevents typo emails and fake accounts

#### Rate Limiting

- Use Upstash Ratelimit (serverless, free tier sufficient)
- Protect auth endpoints only for beta: sign-up, sign-in, password reset (both web and `/api/v1/auth/` iOS routes)
- Data endpoints (`/api/v1/income/`, etc.) are not rate-limited for now — at beta scale, authenticated users are trusted. Revisit if abuse is observed.
- Sliding window: ~10 attempts per minute per IP
- Return 429 with JSON body `{ success: false, error: "נסה שוב מאוחר יותר", code: "RATE_LIMITED" }`
- iOS APIClient should parse 429 responses and show the Hebrew error message

#### Welcome Email

- Email/password users: send after email verification completes
- Google OAuth users: send immediately on first sign-up (no verification needed)
- Brief: "Welcome to Seder" + link to the app
- Hebrew, matches existing password reset email style

### 3. Onboarding & Empty States

#### First-Login Welcome Modal (Web)

- Detect first login via existing `onboardingCompleted` flag in schema
- Show welcome modal: "Welcome to Seder" with 2-3 bullet points
- "Get started" button dismisses and sets `onboardingCompleted: true`

#### Guided Tour (Web + iOS, first login only)

- Web: step-by-step highlight tour (Shepherd.js or Driver.js)
- iOS: custom overlay highlighting UI elements sequentially
- 4-5 steps max:
  1. Income list
  2. Add entry button
  3. Filters/search
  4. Analytics tab
  5. Calendar import
- Runs once on first login, dismissable at any point
- "Show tour again" option in settings

#### Empty States

- Income list empty → helpful message + "Add your first income entry" CTA
- Categories page empty → guidance message
- Analytics empty → "Add income entries to see your analytics"
- iOS: mirror the same empty states in corresponding views

### 4. iOS Production Requirements

#### Apple Developer Program

- Enroll at developer.apple.com ($99/year)
- 24-48 hour approval time
- Required before all other iOS steps

#### Privacy Manifest (`PrivacyInfo.xcprivacy`)

- Required for iOS 17+ and App Store / TestFlight
- Declare: API usage (UserDefaults, Keychain), network access
- No tracking data collected
- Minimum deployment target: iOS 17.0 (aligns with Privacy Manifest requirement and modern SwiftUI features)

#### App Icon & Launch Screen

- 1024x1024 app icon + auto-generated size variants
- Launch screen: simple SwiftUI view with logo/colors

#### Code Signing & Provisioning

- Set up signing certificates and provisioning profiles in Xcode
- Enable push notification capability

#### TestFlight Setup

- Create app in App Store Connect
- Upload build from Xcode
- Add testers by email (they receive TestFlight invite link)
- Apple does light review (~24 hours)

#### Info.plist Privacy Descriptions

- Push notifications usage description (Hebrew)
- Calendar access description if applicable (Hebrew)

### 5. Global Error Handling

#### Web

- `app/global-error.tsx` — root-level error boundary, friendly Hebrew error page with "try again" button, reports to Sentry
- `app/error.tsx` — per-route error boundary, same treatment
- `app/not-found.tsx` — Hebrew 404 page (if not already present)

#### iOS

- Ensure APIClient network errors surface user-friendly Hebrew messages (not raw error strings)
- Add a generic reusable error view component: "Something went wrong, try again"

## Out of Scope

These items are deferred for post-launch:

- CSP security headers
- Cookie consent banner
- Load testing
- Full monitoring dashboard (Datadog/Grafana)
- Automated DB backup scheduling
- In-app feedback mechanism
- MFA / two-factor authentication
- CCPA compliance beyond existing GDPR language

## Success Criteria

Launch is ready when:

1. Sentry receives test errors from both web and iOS (verified in dashboard)
2. Rate limiting returns 429 on rapid auth requests (tested manually)
3. Email verification flow works end-to-end (sign up → email → verify → welcome email)
4. Google OAuth sign-up triggers welcome email
5. Guided tour runs on first web login and is dismissable
6. Empty states render correctly on all key pages (both platforms)
7. TestFlight build is approved by Apple and at least one tester can install
8. Error boundaries show Hebrew error pages (test by throwing in dev)
9. Vercel Analytics shows page view data

## Dependencies

- Apple Developer Program enrollment ($99/year) — must be approved before TestFlight
- Sentry account (free tier)
- Upstash account (free tier for rate limiting)
- App icon design asset (1024x1024)
