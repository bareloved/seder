# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Seder?

Seder is an income tracking platform for freelancers and musicians. It includes a **web app** (Next.js) and **iOS app** (Expo/React Native), structured as a **Turborepo monorepo** with shared packages. It provides income entry management, KPI dashboards, analytics, and Google Calendar integration. The app is RTL-friendly (Hebrew-first) with ILS currency.

## Monorepo Structure

```
apps/
  web/         - Next.js 16 web app (main codebase)
  mobile/      - Expo/React Native iOS app
packages/
  shared/      - @seder/shared — types, Zod schemas, constants
  api-client/  - @seder/api-client — typed HTTP client (ky)
```

## Commands

```bash
# Monorepo (from root)
pnpm dev                 # Start all apps in development
pnpm dev:web             # Start web app only (http://localhost:3001)
pnpm dev:mobile          # Start Expo dev server only
pnpm build               # Build all packages/apps
pnpm lint                # Lint all workspaces
pnpm test                # Run all tests

# Database (web app)
pnpm db:generate         # Generate Drizzle migrations from schema changes
pnpm db:push             # Push schema directly to database (skip migrations)
pnpm db:migrate          # Run pending migrations
pnpm db:studio           # Open Drizzle Studio for data management

# Mobile (from apps/mobile)
npx expo start           # Start Expo dev server
npx expo start --ios     # Start with iOS simulator
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

### Mobile App
- **Framework**: Expo SDK 55, Expo Router
- **Language**: TypeScript 5, React 19, React Native 0.83
- **Data Fetching**: TanStack Query v5 + @seder/api-client (ky)
- **Auth Storage**: expo-secure-store
- **Push Notifications**: expo-notifications + Expo Push API

### Build & Tooling
- **Monorepo**: Turborepo + pnpm workspaces
- **Package Manager**: pnpm (corepack-managed)

## Architecture

### Data Flow Pattern

1. **Server Components** (`app/*/page.tsx`) fetch data using helpers from `data.ts`
2. **Client Components** (`*Client.tsx`) manage UI state, filters, and optimistic updates
3. **Server Actions** (`actions.ts`) handle mutations with `"use server"` directive
4. **Database layer**: Drizzle ORM with type-safe queries in `db/schema.ts`

### Key Directories

**Web App (`apps/web/`):**
- `app/income/` - Main income tracking feature (primary codebase)
  - `page.tsx` - Server-side data fetching
  - `IncomePageClient.tsx` - Client state management
  - `actions.ts` - Server actions for CRUD
  - `data.ts` - Data fetching & aggregation helpers
  - `types.ts`, `schemas.ts` - TypeScript types and Zod schemas
  - `components/` - Feature-specific React components
- `app/api/v1/` - REST API routes (used by mobile app)
  - `_lib/` - Middleware (auth, errors, response helpers)
  - `income/`, `analytics/`, `categories/`, `clients/`, `calendar/`, `settings/`, `devices/`

**Mobile App (`apps/mobile/`):**
- `app/(auth)/` - Sign-in/sign-up screens
- `app/(tabs)/` - Tab navigation (income, analytics, clients, expenses)
- `hooks/` - TanStack Query hooks (useIncomeEntries, useAuth, etc.)
- `providers/` - React context providers (ApiProvider, QueryProvider)
- `components/` - Feature components (income, analytics, calendar)
- `lib/auth-storage.ts` - Secure token storage

**Shared Packages:**
- `packages/shared/src/types/` - Domain type definitions
- `packages/shared/src/schemas/` - Zod validation schemas
- `packages/shared/src/constants/` - Status configs, VAT rates
- `packages/api-client/src/` - Typed API client modules

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
- `app/settings/` - User account settings
- `components/ui/` - Shared shadcn-style UI components (Radix wrappers)
- `db/schema.ts` - Drizzle schema definitions (source of truth for data model)
- `db/client.ts` - Lazy-loading Drizzle client instance
- `lib/auth.ts` - Better Auth configuration
- `lib/googleCalendar.ts` - Google Calendar API integration
- `lib/classificationRules.ts` - Smart calendar event classification

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

### Multi-Tenant Security

All data is scoped by `userId`. Row-Level Security (RLS) is enabled at the database level. Every query must filter by authenticated user.

### Google Calendar Integration

- OAuth tokens stored in `account` table
- `lib/googleCalendar.ts` fetches events via googleapis
- `lib/classificationRules.ts` auto-categorizes events (business vs personal)
- Calendar imports create draft income entries with unique `calendarEventId` per user

## Environment Variables

See `apps/web/.env.example` and `apps/mobile/.env.example` for full lists.

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
CRON_SECRET=xxx            # Push notification cron endpoint
```

Required (mobile app):
```
EXPO_PUBLIC_API_URL=http://localhost:3001  # API base URL
```

## Project Documentation

- `docs/CONTRIB.md` - Development workflow, scripts reference, environment setup
- `docs/RUNBOOK.md` - Deployment, monitoring, common issues, rollback procedures
- `docs/plans/` - Implementation plans and design documents


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
