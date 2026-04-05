# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Seder?

Seder is an income tracking platform for freelancers and musicians. It includes a **web app** (Next.js) and **native iOS app** (Swift/SwiftUI), structured as a **Turborepo monorepo** with shared packages. It provides income entry management, KPI dashboards, analytics, and Google Calendar integration. The app is RTL-friendly (Hebrew-first) with ILS currency.

## Monorepo Structure

```
apps/
  web/         - Next.js 16 web app (main codebase)
  ios/         - Native iOS app (Swift/SwiftUI, Xcode project)
packages/
  shared/      - @seder/shared — types, Zod schemas, constants, utils, classification engine
  api-client/  - @seder/api-client — typed HTTP client (ky, used by web API routes)
scripts/
  generate-api-contract.ts  - Generates docs/api-contract.json from @seder/shared
  check-ios-sync.ts         - Reports mismatches between shared contract and iOS Swift models
```

## Commands

```bash
# Monorepo (from root)
pnpm dev                 # Start all apps in development
pnpm dev:web             # Start web app only (http://localhost:3001)
pnpm build               # Build all packages/apps
pnpm lint                # Lint all workspaces
pnpm test                # Run all tests

# Database (web app)
pnpm db:generate         # Generate Drizzle migrations from schema changes
pnpm db:push             # Push schema directly to database (skip migrations)
pnpm db:migrate          # Run pending migrations
pnpm db:studio           # Open Drizzle Studio for data management

# Cross-platform sync
pnpm sync:contract       # Generate API contract JSON from @seder/shared
pnpm sync:check-ios      # Check iOS Swift models against the contract

# iOS (open in Xcode)
# Open apps/ios/Seder/Seder.xcodeproj in Xcode
# Build and run on simulator or device from Xcode
```

## RTL / Hebrew-First UI

**IMPORTANT:** This app is Hebrew-first with RTL (right-to-left) layout. When creating new UI:

- Always add `dir="rtl"` to dialogs, modals, and new page containers
- Use logical CSS properties: `start/end` instead of `left/right` (e.g., `ms-2` not `ml-2`, `end-4` not `right-4`)
- Use `text-start/text-end` instead of `text-left/text-right`
- Labels and text should align to the right by default
- Keep input fields with `dir="ltr"` for emails, passwords, numbers
- All user-facing text should be in Hebrew

## Tech Stack

### Web App
- **Framework**: Next.js 16 (App Router with Server Components & Actions)
- **Language**: TypeScript 5, React 19
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Better Auth (email/password + Google OAuth with Calendar scope)
- **Styling**: Tailwind CSS + Radix UI (shadcn-style components)
- **Validation**: Zod 4
- **Email**: Resend (transactional emails)
- **AI**: Gemini API
- **Testing**: Vitest

### iOS App
- **Language**: Swift, SwiftUI
- **Networking**: URLSession (async/await)
- **Auth Storage**: Keychain (via KeychainService)
- **Push Notifications**: APNs via Expo Push API
- **Error Tracking**: Sentry (`sentry-cocoa` via SPM)
- **State**: ObservableObject ViewModels

### Build & Tooling
- **Monorepo**: Turborepo + pnpm workspaces
- **Package Manager**: pnpm (corepack-managed)

### Production Infrastructure
- **Error Tracking**: Sentry (`@sentry/nextjs` for web, `sentry-cocoa` for iOS)
- **Analytics**: Vercel Analytics
- **Rate Limiting**: Upstash Redis (sliding window on auth endpoints)
- **DB Backups**: Automated daily via Neon branch API (cron), with rotation (max 5 branches) and admin toggle
- **Email**: Resend (verification, password reset, welcome, feedback reply) with RTL/Arial Hebrew templates

## What Goes Where

| Layer | What belongs here |
|---|---|
| `@seder/shared` | Types, Zod schemas, constants, pure business logic (Currency math, status mapping, classification engine, date helpers, KPI calculations) |
| `apps/web` | Lucide icons, Tailwind classes, zfd schemas (form validation), server actions, localStorage wrappers, Intl formatters, DOM APIs |
| `apps/ios` | Swift Codable models (must match shared types), SwiftUI views, SF Symbols, Keychain, URLSession APIClient |

**Rule**: If logic is platform-agnostic (no DOM, no Intl, no Swift-specific APIs), it belongs in `@seder/shared`.

## Architecture

### Data Flow Pattern

1. **Server Components** (`app/*/page.tsx`) fetch data using helpers from `data.ts`
2. **Client Components** (`*Client.tsx`) manage UI state, filters, and optimistic updates
3. **Server Actions** (`actions.ts`) handle mutations with `"use server"` directive
4. **Database layer**: Drizzle ORM with type-safe queries in `db/schema.ts`
5. **REST API** (`app/api/v1/`) consumed by the iOS app via URLSession

### Key Directories

**Web App (`apps/web/`):**
- `app/income/` - Main income tracking feature (primary codebase)
  - `page.tsx` - Server-side data fetching
  - `IncomePageClient.tsx` - Client state management
  - `actions.ts` - Server actions for CRUD
  - `data.ts` - Data fetching & aggregation helpers
  - `types.ts` - Re-exports from `@seder/shared` + web-specific DB types
  - `utils.ts` - Re-exports shared utils + web-only formatters (Intl, DOM)
  - `schemas.ts` - zfd form validation schemas (web-specific)
  - `currency.ts` - Re-exports `Currency` from `@seder/shared`
  - `status-mapper.ts` - Re-exports status mapping from `@seder/shared`
  - `components/` - Feature-specific React components
- `app/(marketing)/` - Landing page components (hero, features, testimonials, CTA)
- `app/admin/` - Admin dashboard (owner-only, hardcoded email check)
  - `page.tsx` - Server-side data fetching (users, feedback, KPIs)
  - `AdminPageClient.tsx` - Client UI (KPI cards, feedback management, user list, user detail sheet, Sentry health, backup trigger, quick links)
  - `actions.ts` - Server actions (feedback status/reply/delete, backup trigger, Sentry health fetch, auto-backup toggle)
- `app/api/v1/` - REST API routes (consumed by iOS app)
  - `_lib/` - Middleware (auth, errors, response helpers)
  - `income/`, `analytics/`, `categories/`, `clients/`, `calendar/`, `settings/`, `devices/`, `nudges/`, `feedback/`
- `app/api/auth/` - Better Auth handler (`[...all]`)
- `app/api/calendar/` - Calendar auto-sync and sync-now endpoints
- `app/api/cron/` - Cron jobs: `backup/` (daily DB backup with rotation and auto-backup toggle), `overdue-notifications/` (push notifications)
- `app/api/google/` - Google OAuth helpers: `calendars/`, `disconnect/`
- `app/api/settings/` - Calendar settings endpoint
- `app/privacy/`, `app/terms/` - Legal pages

**iOS App (`apps/ios/Seder/Seder/`):**
- `Models/` - Swift Codable structs (IncomeEntry, Category, Client, etc.)
- `Services/` - APIClient (URLSession), KeychainService, NotificationService, SentryService
- `ViewModels/` - ObservableObject state management
- `Views/` - SwiftUI views organized by feature:
  - `Auth/` - SignInView, SignUpView
  - `Income/` - IncomeListView, IncomeEntryRow, IncomeFormSheet, IncomeDetailSheet, FilterSheet, NudgeSection
  - `Analytics/` - AnalyticsView with Components/ (KPI grid, charts, category breakdown, VAT summary)
  - `Categories/` - CategoriesView, CategoryFormSheet
  - `Clients/` - ClientsView, ClientFormSheet
  - `Settings/` - SettingsView, ChangePasswordView, ChangeEmailView, ExportDataSheet, FeedbackSheet, AppIconPickerView (feedback button moved to GreenNavBar on all tabs)
  - `Calendar/` - CalendarImportView, EventPreviewView, RulesManagerView
  - `Components/` - Shared: CurrencyText, MonthPicker, StatusBadge, ErrorView, GreenNavBar (includes feedback button on all tabs), TourOverlay (6-step card-based onboarding)
  - `MainTabView.swift` - Tab bar navigation
- `Lib/` - Classification engine (Swift port of shared logic)
- `Theme.swift` - Colors, fonts, SF Symbol icon mappings

**Shared Packages (`packages/shared/src/`):**
- `types/` - Domain type definitions (IncomeEntry, Category, Client, etc.)
- `schemas/` - Zod validation schemas (API-level, platform-agnostic)
- `constants/` - Status configs, VAT rates, default categories
- `utils/` - Pure business logic (currency, dates, status mapping, KPI calculations)
- `classification/` - Calendar event classification engine

**API Client (`packages/api-client/src/`):**
- Typed HTTP client modules (used by web API routes)

### Mobile vs Desktop Views (Income Page)

**IMPORTANT:** The income page uses different rendering for mobile vs desktop:

- **`IncomeEntryRow.tsx`** - The ACTUAL mobile view component (used via `IncomeListView.tsx`)
  - Contains both desktop layout (`hidden md:flex`) and mobile layout (`md:hidden`)
  - Mobile changes should be made here in the `md:hidden` section
- **`MobileIncomeCard.tsx`** - NOT used in the main mobile view (legacy/cards view only)
  - Only renders when `viewMode === "cards"` via `IncomeCardsView.tsx`
- **`IncomeTable.tsx`** - Orchestrator that switches between `IncomeListView` and `IncomeCardsView`
- **`IncomeListView.tsx`** - Main list view, uses `IncomeEntryRow` for both mobile and desktop
- `app/analytics/` - Charts and KPI reporting
- `app/categories/` - User-defined income categories
- `app/clients/` - Client directory with contact info, analytics, and merge tool
- `app/settings/` - User account settings (tabs: account, preferences, calendar, data, danger zone)
- `app/sign-in/` - Authentication page (split-screen design)
- `components/ui/` - Shared shadcn-style UI components (Radix wrappers)
- `components/onboarding/` - Guided tour system: 7 highlight-only steps (welcome modal, spotlight steps for add/calendar/nav/analytics/clients, completion modal). Components: OnboardingTour, SpotlightOverlay, TourTooltip, HelpButton
- `components/EmailVerificationBanner.tsx` - Amber banner for unverified email users
- `components/FeedbackModal.tsx` - In-app user feedback dialog (saves to `feedback` DB table with category selection)
- `components/SentryUserTag.tsx` - Client-side Sentry user tagging
- `db/schema.ts` - Drizzle schema definitions (source of truth for data model)
- `db/client.ts` - Lazy-loading Drizzle client instance
- `lib/auth.ts` - Better Auth configuration
- `lib/googleCalendar.ts` - Google Calendar API integration
- `lib/classificationRules.ts` - Re-exports shared classification + localStorage wrappers
- `lib/email.ts` - Email sending (verification, password reset, welcome, feedback reply) with RTL templates using Arial Hebrew font
- `lib/ratelimit.ts` - Upstash rate limiting for auth endpoints
- `lib/sentry.ts` - Sentry userId tagging helpers
- `lib/googleTokens.ts` - Google OAuth token refresh helpers
- `lib/pushNotifications.ts` - Push notification sending
- `lib/nudges/` - Smart nudge engine (compute, types)
- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` - Sentry init

### Core Domain Model

**Income Entry** - Central entity with:
- `date`, `description`, `clientName`, `amountGross`, `amountPaid`
- `invoiceStatus`: draft → sent → paid/cancelled
- `paymentStatus`: unpaid → partial → paid
- `vatRate`, `includesVat` for VAT handling
- `categoryId` (FK to categories table)
- `calendarEventId` for Google Calendar import deduplication
- `userId` for multi-tenant isolation

**Categories** - User-customizable with name, color, icon, displayOrder

**Feedback** - User feedback stored in DB (not emailed directly):
- `message`, `category` (general/bug/feature), `platform` (web/ios)
- `status`: unread → read → in_progress → done/replied
- `adminReply`, `repliedAt` for admin responses (reply sends email to user)
- `userId` for linking to user

**Site Config** - Key-value admin settings table:
- `auto_backup_enabled` - Controls whether the daily backup cron runs

### Multi-Tenant Security

All data is scoped by `userId`. Row-Level Security (RLS) is enabled at the database level. Every query must filter by authenticated user.

### Google Calendar Integration

- OAuth tokens stored in `account` table
- `lib/googleCalendar.ts` fetches events via googleapis
- `lib/classificationRules.ts` auto-categorizes events (business vs personal)
- Calendar imports create draft income entries with unique `calendarEventId` per user

### Cross-Platform Development Workflow

When adding or modifying a feature that spans web and iOS:

1. **Define types/schemas** in `packages/shared/` first
2. **Add API endpoint** in `apps/web/app/api/v1/` (if needed)
3. **Build web UI** — import types from `@seder/shared`, keep platform code local
4. **Run `pnpm sync:contract`** to update `docs/api-contract.json`
5. **Run `pnpm sync:check-ios`** to see what Swift models need updating
6. **Update Swift models** in `apps/ios/Seder/Seder/Models/`
7. **Add iOS ViewModel + Views**

See `docs/CROSS_PLATFORM_GUIDE.md` for the full guide.

## Environment Variables

See `apps/web/.env.example` for full list.

Required (web app):
```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
BETTER_AUTH_SECRET=xxx
BETTER_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

Optional (web app):
```
GEMINI_API_KEY=xxx         # AI features
RESEND_API_KEY=xxx         # Transactional emails
EMAIL_FROM=xxx             # Sender email
FEEDBACK_EMAIL=xxx         # Sender address for admin feedback replies
CRON_SECRET=xxx            # Cron endpoint auth (push notifications, DB backup)
NEXT_PUBLIC_SENTRY_DSN=xxx # Sentry error tracking
SENTRY_ORG=xxx             # Sentry org slug
SENTRY_PROJECT=xxx         # Sentry project slug
SENTRY_AUTH_TOKEN=xxx      # Sentry source map uploads
UPSTASH_REDIS_REST_URL=xxx # Rate limiting
UPSTASH_REDIS_REST_TOKEN=xxx # Rate limiting
GOOGLE_IOS_CLIENT_ID=xxx   # iOS app Google Sign-In
NEON_PROJECT_ID=xxx        # Automated DB backups
NEON_API_KEY=xxx           # Automated DB backups
```

## Project Documentation

- `APP_OVERVIEW.md` - High-level app overview (screens, features, domain model)
- `SEDER_CHANGELOG.md` - Development changelog with session-by-session changes
- `docs/CONTRIB.md` - Development workflow, scripts reference, environment setup
- `docs/RUNBOOK.md` - Deployment, monitoring, common issues, rollback procedures
- `docs/CROSS_PLATFORM_GUIDE.md` - Cross-platform development guide (web + iOS)
- `docs/api-contract.json` - Generated API contract (from `pnpm sync:contract`)
- `docs/PRODUCTION_READINESS_TESTING.md` - Beta launch testing checklist
- `docs/plans/` - Implementation plans and design documents
- `docs/superpowers/` - Specs and plans from brainstorming sessions


<!-- CLAVIX:START -->
## Clavix Integration

This project uses Clavix for prompt improvement and PRD generation. The following slash commands are available:

> **Command Format:** Commands shown with colon (`:`) format. Some tools use hyphen (`-`): Claude Code uses `/clavix:improve`, Cursor uses `/clavix-improve`. Your tool autocompletes the correct format.

### Prompt Optimization

#### /clavix:improve [prompt]
Optimize prompts with smart depth auto-selection. Clavix analyzes your prompt quality and automatically selects the appropriate depth (standard or comprehensive). Use for all prompt optimization needs.

### PRD & Planning

#### /clavix:prd
Launch the PRD generation workflow. Clavix will guide you through strategic questions and generate both a comprehensive PRD and a quick-reference version optimized for AI consumption.

#### /clavix:plan
Generate an optimized implementation task breakdown from your PRD. Creates a phased task plan with dependencies and priorities.

#### /clavix:implement
Execute tasks or prompts with AI assistance. Auto-detects source: tasks.md (from PRD workflow) or prompts/ (from improve workflow). Supports automatic git commits and progress tracking.

Use `--latest` to implement most recent prompt, `--tasks` to force task mode.

### Session Management

#### /clavix:start
Enter conversational mode for iterative prompt development. Discuss your requirements naturally, and later use `/clavix:summarize` to extract an optimized prompt.

#### /clavix:summarize
Analyze the current conversation and extract key requirements into a structured prompt and mini-PRD.

### Refinement

#### /clavix:refine
Refine existing PRD or prompt through continued discussion. Detects available PRDs and saved prompts, then guides you through updating them with tracked changes.

### Agentic Utilities

These utilities provide structured workflows for common tasks. Invoke them using the slash commands below:

- **Verify** (`/clavix:verify`): Check implementation against PRD requirements. Runs automated validation and generates pass/fail reports.
- **Archive** (`/clavix:archive`): Archive completed work. Moves finished PRDs and outputs to archive for future reference.

**When to use which mode:**
- **Improve mode** (`/clavix:improve`): Smart prompt optimization with auto-depth selection
- **PRD mode** (`/clavix:prd`): Strategic planning with architecture and business impact

**Recommended Workflow:**
1. Start with `/clavix:prd` or `/clavix:start` for complex features
2. Refine requirements with `/clavix:refine` as needed
3. Generate tasks with `/clavix:plan`
4. Implement with `/clavix:implement`
5. Verify with `/clavix:verify`
6. Archive when complete with `/clavix:archive`

**Pro tip**: Start complex features with `/clavix:prd` or `/clavix:start` to ensure clear requirements before implementation.
<!-- CLAVIX:END -->
