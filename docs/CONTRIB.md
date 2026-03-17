# Contributing to Seder

## Prerequisites

- **Node.js** >= 20
- **pnpm** (via corepack: `corepack enable`)
- **Xcode 16+** (for iOS app — native Swift/SwiftUI)
- **PostgreSQL** (Neon recommended, or local)

## Environment Setup

1. Clone and install:
   ```bash
   git clone <repo-url> && cd seder
   pnpm install
   ```

2. Configure environment variables:
   ```bash
   cp apps/web/.env.example apps/web/.env
   # Edit apps/web/.env with your credentials
   ```

3. Push database schema:
   ```bash
   pnpm db:push
   ```

4. Start development:
   ```bash
   pnpm dev          # All apps
   pnpm dev:web      # Web only (http://localhost:3001)
   ```

5. iOS app:
   ```
   Open apps/ios/Seder/Seder.xcodeproj in Xcode
   Build and run on simulator or device
   ```

## Monorepo Structure

| Workspace | Package | Description |
|-----------|---------|-------------|
| `apps/web` | `@seder/web` | Next.js 16 web app |
| `apps/ios` | — | Native iOS app (Swift/SwiftUI, Xcode project) |
| `packages/shared` | `@seder/shared` | Types, Zod schemas, constants, pure business logic |
| `packages/api-client` | `@seder/api-client` | Typed HTTP client (ky) |

## Available Scripts

### Root (Turborepo)

| Script | Command | Description |
|--------|---------|-------------|
| `pnpm dev` | `turbo dev` | Start all apps in development |
| `pnpm dev:web` | `turbo dev --filter=@seder/web` | Start web app only |
| `pnpm build` | `turbo build` | Build all packages and apps |
| `pnpm lint` | `turbo lint` | Lint all workspaces |
| `pnpm test` | `turbo test` | Run all tests |
| `pnpm db:generate` | `drizzle-kit generate` | Generate Drizzle migrations |
| `pnpm db:push` | `drizzle-kit push` | Push schema to database |
| `pnpm db:migrate` | `drizzle-kit migrate` | Run pending migrations |
| `pnpm db:studio` | `drizzle-kit studio` | Open Drizzle Studio GUI |
| `pnpm sync:contract` | `tsx scripts/generate-api-contract.ts` | Generate API contract JSON from @seder/shared |
| `pnpm sync:check-ios` | `tsx scripts/check-ios-sync.ts` | Check iOS Swift models against the contract |

### Web App (`apps/web`)

| Script | Description |
|--------|-------------|
| `pnpm dev` | Next.js dev server on port 3001 |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |

### iOS App (`apps/ios`)

Built and run via Xcode. No pnpm scripts — open `Seder.xcodeproj` and use Xcode's build/run.

## Environment Variables

### Web App (`apps/web/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon) |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes | Public-facing auth URL |
| `BETTER_AUTH_SECRET` | Yes | Auth session signing secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | Yes | Server-side auth URL |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID (Calendar integration) |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GEMINI_API_KEY` | No | Gemini API key for AI features |
| `RESEND_API_KEY` | No | Resend API key for transactional emails |
| `EMAIL_FROM` | No | Sender email address |
| `FEEDBACK_EMAIL` | No | Email address for admin feedback reply sender (feedback stored in DB) |
| `CRON_SECRET` | No | Secret for cron endpoints (push notifications, DB backup) |
| `NEXT_PUBLIC_SENTRY_DSN` | No | Sentry DSN for error tracking |
| `SENTRY_ORG` | No | Sentry organization slug |
| `SENTRY_PROJECT` | No | Sentry project slug |
| `SENTRY_AUTH_TOKEN` | No | Sentry auth token for source map uploads |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis URL for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis token for rate limiting |
| `NEON_PROJECT_ID` | No | Neon project ID for automated DB backups |
| `NEON_API_KEY` | No | Neon API key for automated DB backups |

## REST API

The web app exposes a REST API at `/api/v1/` consumed by the iOS app:

| Endpoint Group | Path | Description |
|---------------|------|-------------|
| Income | `/api/v1/income` | CRUD for income entries |
| Income Actions | `/api/v1/income/[id]/mark-paid`, `mark-sent` | Status transitions |
| Income Batch | `/api/v1/income/batch` | Bulk operations |
| Analytics | `/api/v1/analytics/kpis`, `trends`, `categories`, `clients`, `attention` | KPI and reporting data |
| Categories | `/api/v1/categories`, `[id]`, `reorder` | Category management |
| Clients | `/api/v1/clients`, `[id]` | Client management |
| Calendar | `/api/v1/calendar/list`, `events`, `import` | Google Calendar integration |
| Settings | `/api/v1/settings`, `account`, `export` | User settings and data export |
| Devices | `/api/v1/devices`, `[token]` | Push notification device tokens |
| Nudges | `/api/v1/nudges` | Smart nudge suggestions |
| Feedback | `/api/v1/feedback` | In-app user feedback (saves to `feedback` table) |

All v1 endpoints require Bearer token authentication via Better Auth session tokens.

### Admin Dashboard

The `/admin` page is restricted to the hardcoded admin email. It uses server actions (not API routes) for:
- Feedback management: set status, reply (sends email), delete
- Backup: manual trigger, auto-backup toggle (reads/writes `site_config` table)
- Sentry health: fetches unresolved issue count from Sentry API

### Non-v1 API Routes

| Endpoint | Description |
|----------|-------------|
| `/api/auth/[...all]` | Better Auth handler (sign-in, sign-up, OAuth, sessions) |
| `/api/calendar/auto-sync` | Cron-triggered calendar auto-sync |
| `/api/calendar/sync-now` | Manual calendar sync trigger |
| `/api/cron/backup` | Daily database backup via Neon branch API |
| `/api/cron/overdue-notifications` | Push notifications for overdue invoices |
| `/api/google/calendars` | List user's Google Calendar calendars |
| `/api/google/disconnect` | Disconnect Google account |
| `/api/settings/calendar` | Calendar sync preferences |

## Cross-Platform Development

When adding or modifying a feature that spans web and iOS:

1. Define types/schemas in `packages/shared/`
2. Add API endpoint in `apps/web/app/api/v1/` (if needed)
3. Build web UI
4. Run `pnpm sync:contract` to update `docs/api-contract.json`
5. Run `pnpm sync:check-ios` to see what Swift models need updating
6. Update Swift models in `apps/ios/Seder/Seder/Models/`
7. Add iOS ViewModel + Views

See `docs/CROSS_PLATFORM_GUIDE.md` for the full guide.

## Testing

```bash
pnpm test              # Run all tests (Vitest)
```

Tests are in the web app workspace. Run from root or `apps/web`.

## Development Workflow

1. Create a feature branch from `main`
2. Make changes, keeping RTL/Hebrew-first conventions (see CLAUDE.md)
3. Run `pnpm lint && pnpm test`
4. Open a PR against `main`

## RTL / Hebrew Conventions

- Use `dir="rtl"` on dialogs, modals, page containers
- Use logical CSS: `ms-2` not `ml-2`, `text-start` not `text-left`
- All user-facing text in Hebrew
- `dir="ltr"` on email, password, and number inputs
- iOS: use `.leading`/`.trailing` alignment, HStack first item = RIGHT side in RTL
