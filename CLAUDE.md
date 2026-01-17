# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Seder?

Seder is an income tracking webapp for freelancers and musicians. It provides income entry management, KPI dashboards, analytics, and Google Calendar integration. The app is RTL-friendly (Hebrew-first) with ILS currency.

## Commands

```bash
npm run dev              # Start development server on http://localhost:3000
npm run build            # Build for production
npm run lint             # Run ESLint
npm run test             # Run Vitest tests

npm run db:generate      # Generate Drizzle migrations from schema changes
npm run db:push          # Push schema directly to database (skip migrations)
npm run db:migrate       # Run pending migrations
npm run db:studio        # Open Drizzle Studio for data management
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

- **Framework**: Next.js 16 (App Router with Server Components & Actions)
- **Language**: TypeScript 5, React 19
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Better Auth (email/password + Google OAuth with Calendar scope)
- **Styling**: Tailwind CSS + Radix UI (shadcn-style components)
- **Validation**: Zod

## Architecture

### Data Flow Pattern

1. **Server Components** (`app/*/page.tsx`) fetch data using helpers from `data.ts`
2. **Client Components** (`*Client.tsx`) manage UI state, filters, and optimistic updates
3. **Server Actions** (`actions.ts`) handle mutations with `"use server"` directive
4. **Database layer**: Drizzle ORM with type-safe queries in `db/schema.ts`

### Key Directories

- `app/income/` - Main income tracking feature (primary codebase)
  - `page.tsx` - Server-side data fetching
  - `IncomePageClient.tsx` - Client state management
  - `actions.ts` - Server actions for CRUD
  - `data.ts` - Data fetching & aggregation helpers
  - `types.ts`, `schemas.ts` - TypeScript types and Zod schemas
  - `components/` - Feature-specific React components
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

Required:
```
DATABASE_URL=postgresql://user:password@host:port/database
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
```

## Project Documentation

- `documents/APP_OVERVIEW.md` - High-level architecture and domain model
- `documents/SEDER_CHANGELOG.md` - Development history
- `documents/RLS_ROLLOUT_STRATEGY.md` - Multi-tenant security docs
