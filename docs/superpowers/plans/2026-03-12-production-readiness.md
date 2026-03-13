# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare Seder (web + iOS) for a confident beta launch with error tracking, auth hardening, onboarding, error handling, feedback, and automated backups.

**Architecture:** Web app (Next.js 16 on Vercel) + native iOS app (Swift/SwiftUI) sharing types via `@seder/shared`. All new UI must be Hebrew-first, RTL-correct. Web uses Tailwind logical properties (`ms-`/`me-`/`ps-`/`pe-`, `text-start`/`text-end`). iOS uses `.leading`/`.trailing` alignment, HStack first item = RIGHT side in RTL.

**Tech Stack:** Next.js 16, React 19, Better Auth, Drizzle ORM, Resend, Sentry, Upstash Ratelimit, driver.js, Vercel Analytics, Swift/SwiftUI

**Spec:** `docs/superpowers/specs/2026-03-12-production-readiness-design.md`

---

## Chunk 1: Error Tracking & Monitoring

### Task 1: Sentry Web Setup

**Files:**
- Modify: `apps/web/package.json` (add `@sentry/nextjs`)
- Create: `apps/web/sentry.client.config.ts`
- Create: `apps/web/sentry.server.config.ts`
- Create: `apps/web/sentry.edge.config.ts`
- Modify: `apps/web/next.config.js` (wrap with `withSentryConfig`)
- Modify: `apps/web/.env.example` (add Sentry env vars)

- [ ] **Step 1: Install @sentry/nextjs**

```bash
cd apps/web && pnpm add @sentry/nextjs
```

- [ ] **Step 2: Create Sentry client config**

Create `apps/web/sentry.client.config.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

- [ ] **Step 3: Create Sentry server config**

Create `apps/web/sentry.server.config.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

- [ ] **Step 4: Create Sentry edge config**

Create `apps/web/sentry.edge.config.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

- [ ] **Step 5: Wrap next.config.js with Sentry**

Modify `apps/web/next.config.js`:

```js
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  allowedDevOrigins: ['192.168.68.*'],
};

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
```

- [ ] **Step 6: Add userId tagging to Sentry**

Create a helper that sets user context. Add to `apps/web/lib/sentry.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

export function setSentryUser(userId: string) {
  Sentry.setUser({ id: userId });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}
```

Call `setSentryUser()` after successful auth in the app layout or auth callback. Call `clearSentryUser()` on sign-out.

- [ ] **Step 7: Update .env.example**

Add to `apps/web/.env.example`:

```
# Sentry
NEXT_PUBLIC_SENTRY_DSN=xxx
SENTRY_ORG=xxx
SENTRY_PROJECT=xxx
SENTRY_AUTH_TOKEN=xxx
```

- [ ] **Step 8: Verify build succeeds**

```bash
cd apps/web && pnpm build
```

Expected: Build succeeds. Sentry warns about missing DSN in dev (that's fine).

- [ ] **Step 9: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/sentry.*.config.ts apps/web/next.config.js apps/web/lib/sentry.ts apps/web/.env.example
git commit -m "feat: add Sentry error tracking to web app"
```

### Task 2: Vercel Analytics

**Files:**
- Modify: `apps/web/package.json` (add `@vercel/analytics`)
- Modify: `apps/web/app/layout.tsx` (add Analytics component)

- [ ] **Step 1: Install @vercel/analytics**

```bash
cd apps/web && pnpm add @vercel/analytics
```

- [ ] **Step 2: Add Analytics to root layout**

In `apps/web/app/layout.tsx`, add import and component:

```tsx
import { Analytics } from "@vercel/analytics/react";
```

Add `<Analytics />` inside the `<body>` tag, after `<Toaster />`.

- [ ] **Step 3: Verify build succeeds**

```bash
cd apps/web && pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/app/layout.tsx
git commit -m "feat: add Vercel Analytics for page view tracking"
```

### Task 3: Sentry iOS Setup

**Files:**
- Modify: `apps/ios/Seder/Seder.xcodeproj/project.pbxproj` (add SPM dependency)
- Create: `apps/ios/Seder/Seder/Services/SentryService.swift`
- Modify: `apps/ios/Seder/Seder/SederApp.swift` (initialize Sentry)

> **Note:** Sentry iOS SDK is added via Xcode > File > Add Package Dependencies > `https://github.com/getsentry/sentry-cocoa`. Select `SentrySwiftUI` product. The steps below assume the package has been added in Xcode.

- [ ] **Step 1: Create SentryService**

Create `apps/ios/Seder/Seder/Services/SentryService.swift`:

```swift
import Sentry

enum SentryService {
    static func start() {
        SentrySDK.start { options in
            options.dsn = "YOUR_SENTRY_DSN_HERE"
            options.tracesSampleRate = 1.0
            options.environment = "production"
            options.enableCaptureFailedRequests = true
        }
    }

    static func setUser(id: String) {
        let user = Sentry.User()
        user.userId = id
        SentrySDK.setUser(user)
    }

    static func clearUser() {
        SentrySDK.setUser(nil)
    }
}
```

- [ ] **Step 2: Initialize Sentry in SederApp.swift**

In `apps/ios/Seder/Seder/SederApp.swift`, inside `AppDelegate.application(_:didFinishLaunchingWithOptions:)`, add before the RTL setup:

```swift
SentryService.start()
```

- [ ] **Step 3: Tag userId on successful auth**

In `apps/ios/Seder/Seder/ViewModels/AuthViewModel.swift`, after successful login/session restore, call:

```swift
SentryService.setUser(id: user.id)
```

On sign-out, call:

```swift
SentryService.clearUser()
```

- [ ] **Step 4: Build and run in Xcode**

Build the project in Xcode. Expected: compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add apps/ios/
git commit -m "feat: add Sentry crash reporting to iOS app"
```

---

## Chunk 2: Auth Hardening

### Task 4: Rate Limiting Middleware

**Files:**
- Modify: `apps/web/package.json` (add `@upstash/ratelimit`, `@upstash/redis`)
- Create: `apps/web/lib/ratelimit.ts`
- Modify: `apps/web/.env.example` (add Upstash env vars)

- [ ] **Step 1: Install Upstash packages**

```bash
cd apps/web && pnpm add @upstash/ratelimit @upstash/redis
```

- [ ] **Step 2: Create rate limit helper**

Create `apps/web/lib/ratelimit.ts`:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 10 requests per 60 seconds per IP
export const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  analytics: true,
  prefix: "ratelimit:auth",
});
```

- [ ] **Step 3: Add rate limiting to auth API handler**

Modify `apps/web/app/api/auth/[...all]/route.ts`. The current file exports `{ GET, POST }` from `toNextJsHandler(auth)`. Wrap these with rate limiting:

```ts
import { NextRequest, NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { authRatelimit } from "@/lib/ratelimit";

const authHandler = toNextJsHandler(auth);

const RATE_LIMITED_PATHS = ["/sign-in", "/sign-up", "/reset-password", "/email-otp", "/verify-email"];

async function withRateLimit(req: NextRequest, handler: (req: NextRequest) => Promise<Response>) {
  const pathname = new URL(req.url).pathname.replace("/api/auth", "");
  const shouldLimit = RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p));

  if (shouldLimit) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const { success } = await authRatelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "נסה שוב מאוחר יותר", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }
  }

  return handler(req);
}

export async function GET(req: NextRequest) {
  return withRateLimit(req, authHandler.GET!);
}

export async function POST(req: NextRequest) {
  return withRateLimit(req, authHandler.POST!);
}
```

> **Note:** Read the actual file first to confirm the current structure before applying this pattern.

- [ ] **Step 4: Update .env.example**

Add to `apps/web/.env.example`:

```
# Upstash (Rate Limiting)
UPSTASH_REDIS_REST_URL=xxx
UPSTASH_REDIS_REST_TOKEN=xxx
```

- [ ] **Step 5: Test rate limiting manually**

Start dev server and rapidly hit the sign-in endpoint more than 10 times. Expected: 429 response with Hebrew message after the 10th request.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/lib/ratelimit.ts apps/web/app/api/auth/ apps/web/.env.example
git commit -m "feat: add rate limiting to auth endpoints via Upstash"
```

### Task 5: Email Verification

**Files:**
- Modify: `apps/web/lib/auth.ts` (add `emailVerification` plugin)
- Modify: `apps/web/lib/auth-client.ts` (add client plugin)
- Modify: `apps/web/lib/email.ts` (add verification email template)
- Create: `apps/web/components/EmailVerificationBanner.tsx`
- Modify: `apps/web/app/layout.tsx` or main authenticated layout (add banner)

- [ ] **Step 1: Add emailVerification plugin to auth config**

In `apps/web/lib/auth.ts`, add to the plugins array:

```ts
import { emailVerification } from "better-auth/plugins";
```

Add to `plugins`:

```ts
emailVerification({
  sendVerificationEmail: async ({ user, url }) => {
    await sendEmail({
      to: user.email,
      subject: "אימות כתובת האימייל - Seder",
      html: `
        <div dir="rtl" style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1a1a1a;">אימות כתובת האימייל</h2>
          <p>שלום ${user.name || ""},</p>
          <p>לחצ/י על הכפתור כדי לאמת את כתובת האימייל שלך:</p>
          <a href="${url}" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
            אימות אימייל
          </a>
          <p style="color: #666; font-size: 14px;">אם לא ביקשת אימות, אפשר להתעלם מהודעה זו.</p>
        </div>
      `,
      text: `אימות כתובת האימייל: ${url}`,
    });
  },
  sendOnSignUp: true,
  autoSignInAfterVerification: true,
}),
```

- [ ] **Step 2: Add emailVerification to auth client**

In `apps/web/lib/auth-client.ts`, add the client-side plugin:

```ts
import { emailVerificationClient } from "better-auth/client/plugins";
```

Add to `plugins` array: `emailVerificationClient()`

- [ ] **Step 3: Create EmailVerificationBanner component**

Create `apps/web/components/EmailVerificationBanner.tsx`:

```tsx
"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function EmailVerificationBanner() {
  const { data: session } = authClient.useSession();
  const [resent, setResent] = useState(false);

  if (!session?.user || session.user.emailVerified) return null;

  const handleResend = async () => {
    await authClient.sendVerificationEmail({
      email: session.user.email,
    });
    setResent(true);
  };

  return (
    <div dir="rtl" className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center text-sm text-amber-800">
      <span>נא לאמת את כתובת האימייל שלך. בדוק/בדקי את תיבת הדואר.</span>
      {!resent ? (
        <button
          onClick={handleResend}
          className="ms-2 font-medium underline hover:text-amber-900"
        >
          שלח שוב
        </button>
      ) : (
        <span className="ms-2 font-medium">נשלח!</span>
      )}
    </div>
  );
}
```

**RTL check:** `ms-2` (margin-start = margin-right in RTL). Text is Hebrew. Banner is centered.

- [ ] **Step 4: Add banner to app layout**

In `apps/web/app/layout.tsx`, import and add `<EmailVerificationBanner />` at the top of `<body>`, before other content.

- [ ] **Step 5: Test email verification flow**

1. Create a new account with email/password
2. Check that verification email is sent (check Resend dashboard or inbox)
3. Verify the banner shows on the app
4. Click verification link
5. Confirm banner disappears

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/auth.ts apps/web/lib/auth-client.ts apps/web/components/EmailVerificationBanner.tsx apps/web/app/layout.tsx
git commit -m "feat: add email verification on sign-up with Hebrew banner"
```

### Task 6: Welcome Email

**Files:**
- Modify: `apps/web/lib/email.ts` (add welcome email template)
- Create: `apps/web/app/api/v1/webhooks/auth/route.ts` (or use Better Auth hooks)
- Modify: `apps/web/lib/auth.ts` (add `afterVerification` hook + Google OAuth hook)

- [ ] **Step 1: Add welcome email template**

In `apps/web/lib/email.ts`, add:

```ts
export async function sendWelcomeEmail(to: string, name?: string) {
  await sendEmail({
    to,
    subject: "ברוכים הבאים ל-Seder!",
    html: `
      <div dir="rtl" style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1a1a1a;">ברוכים הבאים ל-Seder!</h2>
        <p>שלום ${name || ""},</p>
        <p>האפליקציה שלך מוכנה. אפשר להתחיל לעקוב אחרי ההכנסות שלך.</p>
        <a href="https://sedder.app" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">
          כניסה לאפליקציה
        </a>
      </div>
    `,
    text: `ברוכים הבאים ל-Seder! כניסה: https://sedder.app`,
  });
}
```

- [ ] **Step 2: Trigger welcome email on verification and Google OAuth**

In `apps/web/lib/auth.ts`, use Better Auth's hooks to send welcome emails:

1. In the `emailVerification` plugin config, add `onVerification` callback (or use Better Auth's `databaseHooks` / `onUserCreated`).
2. For Google OAuth: use `databaseHooks.user.create.after` to detect first sign-up and send welcome email if the user came from OAuth (emailVerified is already true).

The exact hook API depends on Better Auth version — check docs via context7 before implementing.

Key logic:
- Email/password: send welcome email in `emailVerification`'s `onVerification` callback
- Google OAuth: send welcome email in `databaseHooks.user.create.after` when `user.emailVerified === true`

- [ ] **Step 3: Test both flows**

1. Sign up with email → verify → check inbox for welcome email
2. Sign up with Google → check inbox for welcome email (no verification needed)

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/email.ts apps/web/lib/auth.ts
git commit -m "feat: send welcome email after verification and Google OAuth sign-up"
```

---

## Chunk 3: Global Error Handling

### Task 7: Web Error Pages

**Files:**
- Create: `apps/web/app/global-error.tsx`
- Create: `apps/web/app/error.tsx`
- Create: `apps/web/app/not-found.tsx`

- [ ] **Step 1: Create global-error.tsx**

Create `apps/web/app/global-error.tsx`:

```tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center px-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">משהו השתבש</h1>
          <p className="text-gray-600 mb-6">אירעה שגיאה בלתי צפויה. נסו שוב.</p>
          <button
            onClick={reset}
            className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
          >
            נסה שוב
          </button>
        </div>
      </body>
    </html>
  );
}
```

**RTL check:** `dir="rtl"` on html, `text-center` is fine for centered content, Hebrew text.

- [ ] **Step 2: Create error.tsx**

Create `apps/web/app/error.tsx`:

```tsx
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div dir="rtl" className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center px-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">משהו השתבש</h2>
        <p className="text-gray-600 mb-6">אירעה שגיאה. נסו שוב.</p>
        <button
          onClick={reset}
          className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors"
        >
          נסה שוב
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create not-found.tsx**

Create `apps/web/app/not-found.tsx`:

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div dir="rtl" className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center px-4">
        <h2 className="text-4xl font-bold text-gray-900 mb-2">404</h2>
        <p className="text-gray-600 mb-6">העמוד לא נמצא</p>
        <Link
          href="/"
          className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors inline-block"
        >
          חזרה לדף הבית
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify pages render**

```bash
cd apps/web && pnpm dev
```

Visit `/nonexistent-page` → should see Hebrew 404. Throw a test error in a page → should see error boundary.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/global-error.tsx apps/web/app/error.tsx apps/web/app/not-found.tsx
git commit -m "feat: add Hebrew error boundaries and 404 page"
```

### Task 8: iOS Error Handling

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Components/ErrorView.swift`
- Modify: `apps/ios/Seder/Seder/Models/APIResponse.swift` (add `rateLimited` case to `APIError` enum, update `LocalizedError` conformance)
- Modify: `apps/ios/Seder/Seder/Services/APIClient.swift` (add 429 status code handling before the `default:` case)

- [ ] **Step 1: Create generic ErrorView component**

Create `apps/ios/Seder/Seder/Views/Components/ErrorView.swift`:

```swift
import SwiftUI

struct ErrorView: View {
    let message: String
    let retryAction: (() -> Void)?

    init(message: String = "משהו השתבש. נסו שוב.", retryAction: (() -> Void)? = nil) {
        self.message = message
        self.retryAction = retryAction
    }

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundColor(.orange)

            Text(message)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            if let retryAction {
                Button("נסה שוב") {
                    retryAction()
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.Colors.primary)
            }
        }
        .padding()
    }
}
```

**RTL check:** SwiftUI Text auto-respects RTL. VStack is direction-agnostic. `.multilineTextAlignment(.center)` is fine.

- [ ] **Step 2: Add rateLimited case to APIError**

In `apps/ios/Seder/Seder/Models/APIResponse.swift`, add a new case to the `APIError` enum:

```swift
case rateLimited(String)
```

- [ ] **Step 3: Add 429 handling to APIClient**

In `apps/ios/Seder/Seder/Services/APIClient.swift`, in the `request` method's status code switch, add **before** the `default:` case:

```swift
case 429:
    if let errorBody = try? JSONDecoder().decode(APIResponse<EmptyResponse>.self, from: data) {
        throw APIError.rateLimited(errorBody.error ?? "נסה שוב מאוחר יותר")
    }
    throw APIError.rateLimited("נסה שוב מאוחר יותר")
```

- [ ] **Step 4: Update existing LocalizedError conformance**

In `apps/ios/Seder/Seder/Models/APIResponse.swift`, update the existing `LocalizedError` conformance on `APIError` to add the `rateLimited` case and use Hebrew messages:

```swift
extension APIError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .unauthorized: return "נא להתחבר מחדש"
        case .notFound(let msg): return msg.isEmpty ? "לא נמצא" : msg
        case .server(let msg): return msg.isEmpty ? "שגיאת שרת. נסו שוב." : msg
        case .validation(let msg): return msg
        case .decodingFailed: return "שגיאה בעיבוד הנתונים"
        case .network: return "בעיית חיבור. בדקו את האינטרנט."
        case .rateLimited(let msg): return msg
        }
    }
}
```

- [ ] **Step 4: Build in Xcode**

Expected: compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add apps/ios/
git commit -m "feat: add Hebrew error view and 429 rate limit handling to iOS"
```

---

## Chunk 4: Onboarding & Empty States

### Task 9: Seed Default Categories

**Files:**
- Modify: `apps/web/lib/auth.ts` (add `databaseHooks.user.create.after` to seed categories)
- Modify: `apps/web/db/schema.ts` (only if needed for imports)

- [ ] **Step 1: Add category seeding on user creation**

In `apps/web/lib/auth.ts`, add a `databaseHooks` config that runs after a new user is created. This inserts 3 default categories:

```ts
databaseHooks: {
  user: {
    create: {
      after: async (user) => {
        const { db } = await import("@/db/client");
        const { categories } = await import("@/db/schema");

        const defaults = [
          { name: "קטגוריה 1", color: "emerald", icon: "Circle", displayOrder: "1" },
          { name: "קטגוריה 2", color: "indigo", icon: "Circle", displayOrder: "2" },
          { name: "קטגוריה 3", color: "slate", icon: "Circle", displayOrder: "3" },
        ];

        await db.insert(categories).values(
          defaults.map((cat) => ({
            userId: user.id,
            ...cat,
          }))
        );
      },
    },
  },
},
```

> **Note:** `id` is omitted — the categories table has `id: uuid().primaryKey().defaultRandom()` so Drizzle auto-generates it. `displayOrder` is a Postgres `numeric` type, passed as string to match Drizzle's handling. Verify the type at implementation time by checking existing category creation code.

- [ ] **Step 2: Test by creating a new account**

Sign up with a fresh email. Check the categories page — should show 3 default categories.

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/auth.ts
git commit -m "feat: seed 3 default categories on new user creation"
```

### Task 10: Empty States (Web)

**Files:**
- Modify: income list component (the component that renders when income list is empty)
- Modify: analytics page component (when no data)

> **Note:** Before implementing, read the current empty state rendering in `apps/web/app/income/components/IncomeTable.tsx` (or `IncomeListView.tsx`) and `apps/web/app/analytics/` to understand how empty states are currently handled.

- [ ] **Step 1: Read current empty state components**

Read the income list and analytics components to find where empty states are rendered.

- [ ] **Step 2: Update income empty state**

When income list is empty, show:

```tsx
<div dir="rtl" className="flex flex-col items-center justify-center py-16 text-center">
  <p className="text-lg font-medium text-gray-900 mb-2">אין הכנסות עדיין</p>
  <p className="text-gray-500 mb-6">הוסיפו את ההכנסה הראשונה או ייבאו מיומן Google</p>
  {/* Render existing "Add" button and Calendar import CTA here */}
</div>
```

**RTL check:** `dir="rtl"`, `text-center` for centered content, Hebrew text, no left/right classes.

- [ ] **Step 3: Update analytics empty state**

When analytics has no data:

```tsx
<div dir="rtl" className="flex flex-col items-center justify-center py-16 text-center">
  <p className="text-lg font-medium text-gray-900 mb-2">אין נתונים להצגה</p>
  <p className="text-gray-500">הוסיפו הכנסות כדי לראות את הניתוחים</p>
</div>
```

- [ ] **Step 4: Verify empty states render correctly**

Create a fresh account (which now has default categories but no income). Check:
1. Income page shows the empty state with CTA
2. Analytics page shows the empty state

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/income/ apps/web/app/analytics/
git commit -m "feat: add Hebrew empty states for income and analytics pages"
```

### Task 11: Empty States (iOS)

**Files:**
- Modify: `apps/ios/Seder/Seder/Views/Income/` (income list empty state)
- Modify: `apps/ios/Seder/Seder/Views/Analytics/` (analytics empty state)

> **Note:** Read the current iOS views first to understand existing empty state handling.

- [ ] **Step 1: Read current iOS income and analytics views**

Find the list views and check how they handle empty data.

- [ ] **Step 2: Update iOS income empty state**

When the income list is empty, show:

```swift
VStack(spacing: 12) {
    Text("אין הכנסות עדיין")
        .font(.headline)
        .foregroundColor(.primary)

    Text("הוסיפו את ההכנסה הראשונה או ייבאו מיומן Google")
        .font(.subheadline)
        .foregroundColor(.secondary)
        .multilineTextAlignment(.center)
}
.padding()
```

**RTL check:** VStack is direction-agnostic. Text auto-respects RTL. `.multilineTextAlignment(.center)` is safe.

- [ ] **Step 3: Update iOS analytics empty state**

```swift
VStack(spacing: 12) {
    Text("אין נתונים להצגה")
        .font(.headline)
        .foregroundColor(.primary)

    Text("הוסיפו הכנסות כדי לראות את הניתוחים")
        .font(.subheadline)
        .foregroundColor(.secondary)
        .multilineTextAlignment(.center)
}
.padding()
```

- [ ] **Step 4: Build and verify in Xcode**

Expected: empty states show for new accounts.

- [ ] **Step 5: Commit**

```bash
git add apps/ios/
git commit -m "feat: add Hebrew empty states for iOS income and analytics"
```

### Task 12: Welcome Modal (Web)

**Files:**
- Create: `apps/web/components/WelcomeModal.tsx`
- Modify: `apps/web/app/income/IncomePageClient.tsx` (or main authenticated page — mount modal)
- Existing action: `apps/web/app/settings/actions.ts` already has `completeOnboarding()`

> **Note:** `completeOnboarding()` server action already exists in settings/actions.ts. `onboardingCompleted` field exists in userSettings. Use these.

- [ ] **Step 1: Create WelcomeModal component**

Create `apps/web/components/WelcomeModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { completeOnboarding } from "@/app/settings/actions";

export function WelcomeModal({ show }: { show: boolean }) {
  const [open, setOpen] = useState(show);

  const handleStart = async () => {
    await completeOnboarding();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-start">ברוכים הבאים ל-Seder!</DialogTitle>
          <DialogDescription className="text-start">
            הכלי שלך לניהול הכנסות
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-3 py-4 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span>עקבו אחרי הכנסות, חשבוניות ותשלומים</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span>ייבאו אירועים מיומן Google</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span>צפו בניתוחים ודוחות</span>
          </li>
        </ul>
        <Button onClick={handleStart} className="w-full">
          בואו נתחיל
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

**RTL check:** `dir="rtl"` on DialogContent, `text-start` for headings (= right-aligned in RTL), `gap-2` is direction-agnostic, Hebrew text.

- [ ] **Step 2: Mount WelcomeModal in the income page**

In the server component `apps/web/app/income/page.tsx`, fetch `onboardingCompleted` from userSettings and pass it to the client. In `IncomePageClient.tsx` (or wherever makes sense), render:

```tsx
<WelcomeModal show={!onboardingCompleted} />
```

- [ ] **Step 3: Test welcome modal**

Create a fresh account. On first login, the welcome modal should appear. Click "בואו נתחיל" — modal closes. Refresh — modal should NOT reappear.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/WelcomeModal.tsx apps/web/app/income/
git commit -m "feat: add welcome modal for first-time users"
```

### Task 13: Guided Tour (Web)

**Files:**
- Modify: `apps/web/package.json` (add `driver.js`)
- Create: `apps/web/components/GuidedTour.tsx`
- Modify: `apps/web/app/income/IncomePageClient.tsx` (mount tour)
- Modify: `apps/web/app/settings/` (add "Show tour again" option)

- [ ] **Step 1: Install driver.js**

```bash
cd apps/web && pnpm add driver.js
```

- [ ] **Step 2: Create GuidedTour component**

Create `apps/web/components/GuidedTour.tsx`:

```tsx
"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

interface GuidedTourProps {
  start: boolean;
  onComplete: () => void;
}

export function GuidedTour({ start, onComplete }: GuidedTourProps) {
  const started = useRef(false);

  useEffect(() => {
    if (!start || started.current) return;
    started.current = true;

    // Small delay to ensure DOM elements are rendered
    const timeout = setTimeout(() => {
      const driverObj = driver({
        showProgress: true,
        progressText: "{{current}} מתוך {{total}}",
        nextBtnText: "הבא",
        prevBtnText: "הקודם",
        doneBtnText: "סיום",
        popoverClass: "seder-tour",
        steps: [
          {
            element: "[data-tour='income-list']",
            popover: {
              title: "רשימת הכנסות",
              description: "כאן תראו את כל ההכנסות שלכם",
              side: "bottom",
              align: "center",
            },
          },
          {
            element: "[data-tour='kpi-filters']",
            popover: {
              title: "סיכומים ומסננים",
              description: "לחצו על הכרטיסיות כדי לסנן לפי סטטוס",
              side: "bottom",
              align: "center",
            },
          },
          {
            element: "[data-tour='add-entry']",
            popover: {
              title: "הוספת הכנסה",
              description: "לחצו כאן כדי להוסיף הכנסה חדשה",
              side: "bottom",
              align: "center",
            },
          },
          {
            element: "[data-tour='search-filter']",
            popover: {
              title: "חיפוש וסינון",
              description: "חפשו הכנסות לפי שם לקוח או תיאור",
              side: "bottom",
              align: "center",
            },
          },
          {
            element: "[data-tour='calendar-import']",
            popover: {
              title: "ייבוא מיומן",
              description: "ייבאו אירועים מיומן Google כהכנסות",
              side: "bottom",
              align: "center",
            },
          },
          {
            element: "[data-tour='nav-tabs']",
            popover: {
              title: "ניווט",
              description: "נווטו בין הכנסות, ניתוחים, קטגוריות והגדרות",
              side: "bottom",
              align: "center",
            },
          },
        ],
        onDestroyed: () => {
          onComplete();
        },
      });

      driverObj.drive();
    }, 500);

    return () => clearTimeout(timeout);
  }, [start, onComplete]);

  return null;
}
```

- [ ] **Step 3: Add `data-tour` attributes to income page elements**

Read the income page components and add `data-tour` attributes to the relevant elements:
- `data-tour="income-list"` on the income list container
- `data-tour="kpi-filters"` on the KPI cards section
- `data-tour="add-entry"` on the add income button
- `data-tour="search-filter"` on the search input
- `data-tour="calendar-import"` on the calendar import button
- `data-tour="nav-tabs"` on the navigation tabs

- [ ] **Step 4: Mount GuidedTour in income page**

After the welcome modal is dismissed (i.e., `onboardingCompleted` was just set to true), trigger the guided tour. Use a state flag or localStorage:

```tsx
const [showTour, setShowTour] = useState(false);

// In WelcomeModal's onComplete callback:
// setShowTour(true)

<GuidedTour start={showTour} onComplete={() => setShowTour(false)} />
```

- [ ] **Step 5: Add "Show tour again" to settings**

In `apps/web/app/settings/` (preferences section), add a button:

```tsx
<button onClick={() => { /* set localStorage flag and redirect to /income */ }}>
  הצג סיור מודרך שוב
</button>
```

- [ ] **Step 6: Add tour CSS overrides for RTL**

Add to a global CSS file or create `apps/web/app/tour.css`:

```css
.seder-tour {
  direction: rtl;
  text-align: right;
}
```

Import in layout or income page.

- [ ] **Step 7: Test the full flow**

1. Create fresh account → welcome modal → dismiss → tour starts
2. Tour highlights each element in sequence
3. Complete or dismiss tour
4. Go to settings → "Show tour again" → redirects to income → tour runs

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml apps/web/components/GuidedTour.tsx apps/web/app/income/ apps/web/app/settings/ apps/web/app/tour.css
git commit -m "feat: add guided tour for first-time users using driver.js"
```

### Task 14: Guided Tour (iOS)

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Components/TourOverlay.swift`
- Modify: `apps/ios/Seder/Seder/Views/MainTabView.swift` (or income view — mount overlay)
- Modify: `apps/ios/Seder/Seder/Views/Settings/SettingsView.swift` (add "show tour" option)
- Modify: `apps/ios/Seder/Seder/ViewModels/SettingsViewModel.swift` (onboarding state)

> **Note:** Fetch up-to-date SwiftUI docs via context7 before implementing. SwiftUI does not have a built-in tour system. Use a custom overlay approach with `.matchedGeometryEffect` or manual positioning.

- [ ] **Step 1: Design the tour overlay approach**

Use `@State` to track the current tour step. For each step, show a semi-transparent overlay with a "spotlight" cutout around the target area, plus a popover with Hebrew description. Use `GeometryReader` to find element positions.

A simpler approach: use `.overlay` on the main view with a series of coach marks that point to specific areas. Each step shows a floating card with an arrow.

Read the current `MainTabView.swift` and income views first to understand the layout.

- [ ] **Step 2: Create TourOverlay component**

Create `apps/ios/Seder/Seder/Views/Components/TourOverlay.swift`:

```swift
import SwiftUI

struct TourStep {
    let title: String
    let description: String
}

struct TourOverlay: View {
    @Binding var isShowing: Bool
    @State private var currentStep = 0

    let steps: [TourStep] = [
        TourStep(title: "רשימת הכנסות", description: "כאן תראו את כל ההכנסות שלכם"),
        TourStep(title: "סיכומים", description: "לחצו על הכרטיסיות כדי לסנן לפי סטטוס"),
        TourStep(title: "הוספת הכנסה", description: "לחצו על + כדי להוסיף הכנסה חדשה"),
        TourStep(title: "ייבוא מיומן", description: "ייבאו אירועים מיומן Google"),
        TourStep(title: "עוד לשוניות", description: "נווטו בין ניתוחים, קטגוריות והגדרות"),
    ]

    var body: some View {
        ZStack {
            Color.black.opacity(0.5)
                .ignoresSafeArea()
                .onTapGesture { advance() }

            VStack(spacing: 16) {
                Text(steps[currentStep].title)
                    .font(.headline)
                    .foregroundColor(.white)

                Text(steps[currentStep].description)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.9))
                    .multilineTextAlignment(.center)

                HStack {
                    Text("\(currentStep + 1) מתוך \(steps.count)")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.7))

                    Spacer()

                    Button(currentStep < steps.count - 1 ? "הבא" : "סיום") {
                        advance()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.Colors.primary)
                }
            }
            .padding(24)
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))
            .padding(.horizontal, 32)
        }
    }

    private func advance() {
        if currentStep < steps.count - 1 {
            withAnimation { currentStep += 1 }
        } else {
            isShowing = false
        }
    }
}
```

**RTL check:** HStack first item ("מתוך") appears on RIGHT side in RTL (correct — step counter). "הבא" button on LEFT (correct — action button). Text is centered. Hebrew throughout.

- [ ] **Step 3: Integrate tour with onboarding state**

In the main income view or MainTabView, check if onboarding is completed. If not, show the tour overlay after a brief delay. On completion, call the settings API to mark onboarding as complete.

- [ ] **Step 4: Add "Show tour again" to iOS settings**

In `apps/ios/Seder/Seder/Views/Settings/SettingsView.swift`, add a row in the preferences section:

```swift
Button("הצג סיור מודרך שוב") {
    // Reset local tour flag and navigate to income tab
}
```

- [ ] **Step 5: Build and test in Xcode**

- [ ] **Step 6: Commit**

```bash
git add apps/ios/
git commit -m "feat: add guided tour overlay for iOS first-time users"
```

---

## Chunk 5: In-App Feedback

### Task 15: Feedback API Endpoint

**Files:**
- Create: `apps/web/app/api/v1/feedback/route.ts`

- [ ] **Step 1: Create feedback API route**

Create `apps/web/app/api/v1/feedback/route.ts`:

```ts
import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { ApiError, ValidationError } from "../_lib/errors";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await req.json();

    const { message, platform } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new ValidationError("נא להזין הודעה");
    }

    // Escape HTML to prevent XSS in email
    const safeMessage = message
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

    await sendEmail({
      to: process.env.FEEDBACK_EMAIL || process.env.EMAIL_FROM || "noreply@sedder.app",
      subject: `משוב מ-Seder (${platform || "web"})`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; padding: 24px;">
          <h3>משוב חדש</h3>
          <p><strong>משתמש:</strong> ${userId}</p>
          <p><strong>פלטפורמה:</strong> ${platform || "web"}</p>
          <p><strong>הודעה:</strong></p>
          <p style="white-space: pre-wrap; background: #f5f5f5; padding: 16px; border-radius: 8px;">${safeMessage}</p>
        </div>
      `,
      text: `משוב חדש\nמשתמש: ${userId}\nפלטפורמה: ${platform || "web"}\nהודעה: ${message}`,
    });

    return apiSuccess({ sent: true });
  } catch (error) {
    return apiError(error instanceof ApiError ? error : new ApiError("שגיאה בשליחת המשוב"));
  }
}
```

- [ ] **Step 2: Add FEEDBACK_EMAIL to .env.example**

```
FEEDBACK_EMAIL=xxx            # Where feedback submissions are sent
```

- [ ] **Step 3: Test endpoint**

```bash
curl -X POST http://localhost:3001/api/v1/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"message": "test feedback", "platform": "web"}'
```

Expected: `{ success: true, data: { sent: true } }` and email received.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/v1/feedback/ apps/web/.env.example
git commit -m "feat: add feedback API endpoint that sends email via Resend"
```

### Task 16: Feedback UI (Web)

**Files:**
- Create: `apps/web/components/FeedbackModal.tsx`
- Modify: `apps/web/app/settings/` (add feedback button in settings page)

- [ ] **Step 1: Add Textarea UI component if missing**

Check if `apps/web/components/ui/textarea.tsx` exists. If not:

```bash
cd apps/web && npx shadcn@latest add textarea
```

- [ ] **Step 2: Create FeedbackModal component**

Create `apps/web/components/FeedbackModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export function FeedbackModal({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/v1/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, platform: "web" }),
      });
      if (res.ok) {
        toast.success("המשוב נשלח בהצלחה!");
        setMessage("");
        setOpen(false);
      } else {
        toast.error("שגיאה בשליחת המשוב");
      }
    } catch {
      toast.error("שגיאה בשליחת המשוב");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-start">שליחת משוב</DialogTitle>
        </DialogHeader>
        <Textarea
          dir="rtl"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="ספרו לנו מה אתם חושבים..."
          className="min-h-[120px]"
        />
        <Button onClick={handleSubmit} disabled={sending || !message.trim()} className="w-full">
          {sending ? "שולח..." : "שלח משוב"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

**RTL check:** `dir="rtl"` on DialogContent and Textarea. `text-start` for title. Hebrew text throughout. No left/right classes.

- [ ] **Step 3: Add feedback button to settings page**

In the settings page, add a "Send feedback" row (in the preferences or data section):

```tsx
import { FeedbackModal } from "@/components/FeedbackModal";

<FeedbackModal
  trigger={
    <button className="text-sm text-green-600 hover:text-green-700 font-medium">
      שליחת משוב
    </button>
  }
/>
```

- [ ] **Step 4: Test feedback flow**

1. Go to settings → click "שליחת משוב"
2. Type a message → submit
3. Check email inbox for the feedback

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/FeedbackModal.tsx apps/web/app/settings/
git commit -m "feat: add feedback modal in web settings page"
```

### Task 17: Feedback UI (iOS)

**Files:**
- Create: `apps/ios/Seder/Seder/Views/Settings/FeedbackSheet.swift`
- Modify: `apps/ios/Seder/Seder/Views/Settings/SettingsView.swift` (add feedback row)

- [ ] **Step 1: Create FeedbackSheet**

Create `apps/ios/Seder/Seder/Views/Settings/FeedbackSheet.swift`:

```swift
import SwiftUI

struct FeedbackSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var message = ""
    @State private var isSending = false
    @State private var showSuccess = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                TextEditor(text: $message)
                    .frame(minHeight: 150)
                    .padding(8)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                    .overlay(
                        Group {
                            if message.isEmpty {
                                Text("ספרו לנו מה אתם חושבים...")
                                    .foregroundColor(.secondary)
                                    .padding(.top, 16)
                                    .padding(.trailing, 12)
                                    .allowsHitTesting(false)
                            }
                        },
                        alignment: .topTrailing
                    )

                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                }

                Button {
                    Task { await sendFeedback() }
                } label: {
                    if isSending {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("שלח משוב")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.Colors.primary)
                .disabled(message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending)

                Spacer()
            }
            .padding()
            .navigationTitle("שליחת משוב")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("סגור") { dismiss() }
                }
            }
            .alert("המשוב נשלח בהצלחה!", isPresented: $showSuccess) {
                Button("אישור") { dismiss() }
            }
        }
    }

    private func sendFeedback() async {
        isSending = true
        errorMessage = nil

        do {
            let body: [String: String] = ["message": message, "platform": "ios"]
            try await APIClient.shared.request(
                endpoint: "/api/v1/feedback",
                method: "POST",
                body: body,
                responseType: [String: Bool].self
            )
            showSuccess = true
        } catch {
            errorMessage = "שגיאה בשליחת המשוב. נסו שוב."
        }

        isSending = false
    }
}
```

**RTL check:** Placeholder uses `.topTrailing` (= top-right in RTL, correct for Hebrew). Text auto-respects RTL. VStack is direction-agnostic.

- [ ] **Step 2: Add feedback row to iOS settings**

In `apps/ios/Seder/Seder/Views/Settings/SettingsView.swift`, add in an appropriate section:

```swift
@State private var showFeedback = false

// In the view body, in a section:
Button("שליחת משוב") {
    showFeedback = true
}
.sheet(isPresented: $showFeedback) {
    FeedbackSheet()
}
```

- [ ] **Step 3: Build and test**

- [ ] **Step 4: Commit**

```bash
git add apps/ios/
git commit -m "feat: add feedback sheet in iOS settings"
```

---

## Chunk 6: iOS Production & DB Backups

### Task 18: iOS Privacy Manifest & Info.plist

**Files:**
- Create: `apps/ios/Seder/Seder/PrivacyInfo.xcprivacy`
- Modify: `apps/ios/Seder/Info.plist` (or via Xcode target settings)

> **Note:** Read Apple's documentation on Privacy Manifests before implementing. Use context7 to check current requirements.

- [ ] **Step 1: Create Privacy Manifest**

Create `apps/ios/Seder/Seder/PrivacyInfo.xcprivacy`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSPrivacyTracking</key>
    <false/>
    <key>NSPrivacyTrackingDomains</key>
    <array/>
    <key>NSPrivacyCollectedDataTypes</key>
    <array>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeEmailAddress</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
        <dict>
            <key>NSPrivacyCollectedDataType</key>
            <string>NSPrivacyCollectedDataTypeName</string>
            <key>NSPrivacyCollectedDataTypeLinked</key>
            <true/>
            <key>NSPrivacyCollectedDataTypeTracking</key>
            <false/>
            <key>NSPrivacyCollectedDataTypePurposes</key>
            <array>
                <string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string>
            </array>
        </dict>
    </array>
    <key>NSPrivacyAccessedAPITypes</key>
    <array>
        <dict>
            <key>NSPrivacyAccessedAPIType</key>
            <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
            <key>NSPrivacyAccessedAPITypeReasons</key>
            <array>
                <string>CA92.1</string>
            </array>
        </dict>
    </array>
</dict>
</plist>
```

- [ ] **Step 2: Add Info.plist privacy descriptions**

Modern Xcode projects may not have a standalone Info.plist file. Add these via Xcode: select the Seder target → Info tab → Custom iOS Target Properties. Alternatively, if a standalone Info.plist exists, add directly:

```xml
<key>NSUserNotificationsUsageDescription</key>
<string>אנחנו שולחים התראות כדי לעדכן אותך על שינויים בהכנסות</string>
```

If calendar access is needed:

```xml
<key>NSCalendarsUsageDescription</key>
<string>גישה ליומן נדרשת לייבוא אירועים כהכנסות</string>
```

- [ ] **Step 3: Add PrivacyInfo.xcprivacy to Xcode project**

In Xcode, add the file to the Seder target (File > Add Files to "Seder"). Ensure it's included in the app bundle.

- [ ] **Step 4: Build in Xcode**

Expected: compiles without errors or warnings about missing privacy manifest.

- [ ] **Step 5: Commit**

```bash
git add apps/ios/
git commit -m "feat: add iOS privacy manifest and Info.plist descriptions"
```

### Task 19: Automated DB Backups

**Files:**
- Modify: `apps/web/vercel.json` (add backup cron)
- Create: `apps/web/app/api/cron/backup/route.ts`
- Modify: `docs/RUNBOOK.md` (document restore procedure)

> **Note:** If using Neon, automated backups may be handled by Neon's built-in branching. Check if the project uses Neon and if automated snapshots are already configured. If so, this task is about documenting the restore procedure and optionally adding a cron that creates a named branch for backup.

- [ ] **Step 1: Determine backup approach**

Read `apps/web/.env.example` or `.env.local` to confirm the database provider. If Neon:
- Neon Pro plan includes automated daily backups (7-day retention)
- Free plan: use Neon's branch API to create daily backup branches
- Alternative: `pg_dump` via a cron endpoint

For a Neon free plan, create a cron endpoint that calls Neon's API to create a branch.

For simplicity and reliability, use `pg_dump` via a Vercel cron that pipes to a storage service, OR document Neon's built-in backup features and set up branch-based backups.

- [ ] **Step 2: Create backup cron endpoint**

Create `apps/web/app/api/cron/backup/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Option A: If using Neon, create a backup branch via Neon API
    const res = await fetch(
      `https://console.neon.tech/api/v2/projects/${process.env.NEON_PROJECT_ID}/branches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEON_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch: {
            name: `backup-${new Date().toISOString().split("T")[0]}`,
          },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Neon API error: ${res.status}`);
    }

    return NextResponse.json({ success: true, date: new Date().toISOString() });
  } catch (error) {
    console.error("Backup failed:", error);
    return NextResponse.json({ success: false, error: "Backup failed" }, { status: 500 });
  }
}
```

> **Note:** Adjust based on actual DB provider. If not using Neon, use `pg_dump` via child_process or a different approach.

- [ ] **Step 3: Add backup cron to vercel.json**

In `apps/web/vercel.json`, add to the existing crons array (do NOT replace the existing `calendar/auto-sync` cron):

```json
{
  "crons": [
    {
      "path": "/api/calendar/auto-sync",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/cron/backup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

(Backup runs daily at 3am UTC)

- [ ] **Step 4: Add env vars to .env.example**

```
# DB Backups (Neon)
NEON_PROJECT_ID=xxx
NEON_API_KEY=xxx
```

- [ ] **Step 5: Update RUNBOOK.md with restore procedure**

Add a "Database Backups & Restore" section to `docs/RUNBOOK.md`:

```markdown
## Database Backups & Restore

### Automated Backups
- Daily backup branch created at 3:00 UTC via Vercel cron (`/api/cron/backup`)
- Backup branches named `backup-YYYY-MM-DD`
- Retention: manually delete branches older than 7 days (or automate cleanup)

### Restore Procedure
1. Go to Neon console → Project → Branches
2. Find the backup branch for the desired date
3. Create a new branch from the backup (to avoid modifying the backup)
4. Update `DATABASE_URL` in Vercel env vars to point to the restore branch
5. Redeploy
6. Verify data, then switch DNS back to the main branch

### Manual Backup
```bash
./scripts/db-backup.sh
```

### Manual Restore
```bash
./scripts/db-restore.sh backups/<backup-file>
```
```

- [ ] **Step 6: Test backup cron**

```bash
curl http://localhost:3001/api/cron/backup -H "Authorization: Bearer <CRON_SECRET>"
```

Expected: `{ success: true, date: "..." }` and a new branch visible in Neon console.

- [ ] **Step 7: Test restore (manual verification)**

1. Go to Neon console → Project → Branches
2. Find the backup branch just created
3. Create a new branch from it (click "Create child branch")
4. Temporarily point a local `DATABASE_URL` to the restore branch
5. Run `pnpm db:studio` and verify data is intact
6. Delete the test restore branch

- [ ] **Step 8: Commit**

```bash
git add apps/web/app/api/cron/backup/ apps/web/vercel.json apps/web/.env.example docs/RUNBOOK.md
git commit -m "feat: add automated daily DB backups via Neon branch API"
```

### Task 20: iOS Production Setup (Manual Steps)

> **These steps are performed manually in Xcode / Apple Developer portal, not via code changes.**

- [ ] **Step 1: Enroll in Apple Developer Program**

Go to https://developer.apple.com/programs/enroll/. Sign up with Apple ID. Pay $99/year. Wait 24-48 hours for approval.

- [ ] **Step 2: Create App ID in Apple Developer portal**

Certificates, Identifiers & Profiles → Identifiers → (+) → App IDs → Bundle ID: `com.bareloved.seder`. Enable capabilities: Push Notifications.

- [ ] **Step 3: Create provisioning profiles**

Create Development and Distribution provisioning profiles for the App ID.

- [ ] **Step 4: Configure code signing in Xcode**

Xcode → Seder target → Signing & Capabilities → Team: select your developer team → Signing Certificate: auto-manage.

- [ ] **Step 5: Create app icon**

Design or commission a 1024x1024 app icon. Add to `apps/ios/Seder/Seder/Assets.xcassets/AppIcon.appiconset/`. Xcode auto-generates size variants.

- [ ] **Step 6: Create launch screen**

Add a simple SwiftUI-based launch screen or storyboard in Xcode. Use app colors + logo.

- [ ] **Step 7: Create app in App Store Connect**

Go to App Store Connect → My Apps → (+) → New App. Fill in: name ("Seder"), primary language (Hebrew), bundle ID, SKU.

- [ ] **Step 8: Upload build to TestFlight**

In Xcode: Product → Archive → Distribute App → App Store Connect. Wait for processing (~15 min).

- [ ] **Step 9: Add beta testers**

In App Store Connect → TestFlight → add testers by email. They receive TestFlight invite.

- [ ] **Step 10: Submit for beta review**

TestFlight builds require light Apple review. Submit and wait (~24 hours).

---

## Dependency Graph

```
Task 1 (Sentry Web) ──────────┐
Task 2 (Vercel Analytics) ─────┤
Task 3 (Sentry iOS) ───────────┤── All independent, can run in parallel
Task 4 (Rate Limiting) ────────┤
Task 9 (Default Categories) ───┘

Task 5 (Email Verification) ──→ Task 6 (Welcome Email)

Task 7 (Web Error Pages) ──┐
Task 8 (iOS Error Handling) ┘── Depend on Task 1/3 (Sentry) for error reporting

Task 10 (Empty States Web) ─┐
Task 11 (Empty States iOS) ──┤── Independent
Task 12 (Welcome Modal) ─────┘
Task 12 (Welcome Modal) ──→ Task 13 (Guided Tour Web)
Task 13 independent of ──→ Task 14 (Guided Tour iOS)

Task 15 (Feedback API) ──→ Task 16 (Feedback Web) ──┐
Task 15 (Feedback API) ──→ Task 17 (Feedback iOS) ──┘

Task 18 (iOS Privacy) ─┐
Task 19 (DB Backups) ───┤── Independent
Task 20 (iOS Manual) ───┘── Depends on Task 18 (privacy manifest must exist before TestFlight)
```

**Recommended execution order:**
1. Tasks 1-4, 9 (parallel — independent infrastructure)
2. Tasks 5-6 (sequential — email verification then welcome email)
3. Tasks 7-8 (parallel — error pages)
4. Tasks 10-12 (parallel — empty states + welcome modal)
5. Task 13 (guided tour web — depends on 12)
6. Task 14 (guided tour iOS — independent)
7. Task 15, then 16+17 in parallel (feedback)
8. Tasks 18-19 (parallel — iOS privacy + backups)
9. Task 20 (manual — iOS production setup, after 18)
