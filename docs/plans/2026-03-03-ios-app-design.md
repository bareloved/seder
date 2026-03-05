# Seder iOS App — Design Document

> Date: 2026-03-03
> Status: Approved

## Summary

Build a native-feeling iOS app for Seder using React Native (Expo) with full feature parity to the web app. The project will be restructured as a Turborepo monorepo with shared types and a new REST API layer.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Technology | React Native / Expo | Reuse TypeScript/React skills, share code with web app |
| Repo structure | Turborepo monorepo | Shared packages, coordinated builds, single source of truth |
| API layer | REST routes on existing Next.js app | Reuse existing business logic, single deployment |
| Design language | Native iOS feel | iOS conventions, gestures, system fonts via React Native |
| Offline support | Deferred to v2 | Online-only for v1 to reduce scope |
| Push notifications | v1 | Overdue payment reminders, invoice follow-ups |

## 1. Project Structure

```
seder/
├── apps/
│   ├── web/                  # Existing Next.js app (moved here)
│   │   ├── app/
│   │   ├── components/
│   │   ├── db/
│   │   ├── lib/
│   │   └── package.json
│   └── mobile/               # New Expo app
│       ├── app/              # Expo Router (file-based routing)
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── package.json
├── packages/
│   ├── shared/               # Types, Zod schemas, constants
│   │   ├── types/
│   │   ├── schemas/
│   │   ├── constants/
│   │   └── package.json
│   └── api-client/           # Typed REST API client
│       ├── client.ts
│       ├── income.ts
│       ├── categories.ts
│       └── package.json
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

- Expo Router for file-based navigation
- `@seder/shared` for types and Zod schemas consumed by both apps
- `@seder/api-client` for typed HTTP client used by mobile app
- `db/` stays in `apps/web` — mobile app only communicates via REST API

## 2. REST API Design

### Auth

Leverages existing Better Auth. Mobile stores session token in expo-secure-store, sends as `Authorization: Bearer <token>`.

- `POST /api/v1/auth/sign-in` — email/password login
- `POST /api/v1/auth/sign-up` — register
- `POST /api/v1/auth/sign-out` — invalidate session
- `POST /api/v1/auth/google` — Google OAuth flow (deep link back)

### Income Entries

- `GET /api/v1/income?month=2026-03&status=unpaid&client=...` — paginated, filtered
- `GET /api/v1/income/:id` — single entry
- `POST /api/v1/income` — create
- `PUT /api/v1/income/:id` — update
- `DELETE /api/v1/income/:id` — delete
- `POST /api/v1/income/batch` — batch update/delete
- `POST /api/v1/income/:id/mark-paid` — status transition
- `POST /api/v1/income/:id/mark-sent` — invoice sent

### Analytics

- `GET /api/v1/analytics/kpis?month=2026-03` — monthly KPI aggregates
- `GET /api/v1/analytics/trends?months=6` — trend data

### Categories

- `GET /api/v1/categories`
- `POST /api/v1/categories`
- `PUT /api/v1/categories/:id`
- `POST /api/v1/categories/reorder`

### Clients

- `GET /api/v1/clients`
- `POST /api/v1/clients`
- `PUT /api/v1/clients/:id`

### Calendar

- `GET /api/v1/calendar/events?start=...&end=...`
- `POST /api/v1/calendar/import`
- `GET /api/v1/calendar/list`

### Settings

- `GET /api/v1/settings`
- `PUT /api/v1/settings`

### Push Notifications

- `POST /api/v1/devices` — register device token
- `DELETE /api/v1/devices/:token` — unregister

### Implementation

Each route reuses existing data fetching (`data.ts`) and mutation logic (`actions.ts`), wrapped in HTTP request/response handling with proper status codes and error responses.

## 3. Mobile App Architecture

### Navigation (Expo Router)

```
mobile/app/
├── _layout.tsx              # Root layout (auth check, theme)
├── (auth)/
│   ├── sign-in.tsx
│   └── sign-up.tsx
├── (tabs)/
│   ├── _layout.tsx          # Tab bar
│   ├── income/
│   │   ├── index.tsx        # Income list (main screen)
│   │   └── [id].tsx         # Income detail/edit
│   ├── analytics/
│   │   └── index.tsx        # KPI dashboard + charts
│   ├── calendar/
│   │   └── index.tsx        # Calendar import
│   └── settings/
│       └── index.tsx
```

4 tabs: Income (default), Analytics, Calendar, Settings.

### Key Libraries

| Purpose | Library |
|---------|---------|
| Navigation | expo-router |
| HTTP client | ky |
| State management | TanStack Query (React Query) |
| Secure storage | expo-secure-store |
| Push notifications | expo-notifications + Expo Push API |
| Charts | react-native-chart-kit or victory-native |
| Date handling | date-fns |
| Forms | react-hook-form + Zod (from @seder/shared) |

### Data Flow

1. TanStack Query manages server state — caching, background refetching, optimistic updates
2. `@seder/api-client` makes typed HTTP calls
3. Zod schemas from `@seder/shared` validate responses
4. Optimistic updates for mutations — update UI immediately, rollback on error

### RTL / Hebrew

- `I18nManager.forceRTL(true)` on app startup
- All text in Hebrew
- Number/email inputs stay LTR

### Push Notifications

- Expo Push Notifications service (handles APNs)
- Register device token on login, store in `device_tokens` table
- Server-side cron checks for overdue invoices daily, sends push via Expo Push API
- Types: overdue payment reminders, invoice follow-up suggestions

## 4. Database Changes

One new table:

```sql
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL,        -- 'ios' | 'android'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, token)
);
```

No other schema changes. The REST API reads/writes the same tables as the web app.

## 5. Shared Code Extraction

Move from web app to `packages/shared`:

- **Types:** IncomeEntry, Category, Client, UserSettings, status enums, KPI types
- **Zod schemas:** All validation schemas
- **Constants:** VAT rates, status labels, color mappings
- **Utilities:** Date formatting, currency formatting, status logic

This is a refactor — extract existing code and update imports in the web app.

## 6. Google OAuth on Mobile

- Use `expo-auth-session` for the OAuth flow
- Redirect URI uses Expo scheme-based deep link
- Server stores the same Google tokens
- Calendar sync works identically through the REST API

## 7. What's NOT Changing

- Database schema (except device_tokens)
- Web app functionality
- Server-side business logic
- Better Auth core setup

## 8. Scope Summary

### v1 (this design)
- Full feature parity with web app
- Turborepo monorepo restructure
- REST API layer
- Native iOS feel with Expo
- Push notifications for overdue payments
- RTL/Hebrew support

### Deferred
- Offline support / local-first sync
- Android (Expo supports it, but not targeting v1)
- Multi-language support
