# Contributing to Seder

## Prerequisites

- **Node.js** >= 20
- **pnpm** (via corepack: `corepack enable`)
- **Xcode** (for iOS simulator — mobile app)
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
   pnpm dev:mobile   # Expo dev server only
   ```

## Monorepo Structure

| Workspace | Package | Description |
|-----------|---------|-------------|
| `apps/web` | `@seder/web` | Next.js 16 web app |
| `apps/mobile` | `@seder/mobile` | Expo SDK 55 iOS app |
| `packages/shared` | `@seder/shared` | Types, Zod schemas, constants |
| `packages/api-client` | `@seder/api-client` | Typed HTTP client (ky) |

## Available Scripts

### Root (Turborepo)

| Script | Command | Description |
|--------|---------|-------------|
| `pnpm dev` | `turbo dev` | Start all apps in development |
| `pnpm dev:web` | `turbo dev --filter=@seder/web` | Start web app only |
| `pnpm dev:mobile` | `turbo dev --filter=@seder/mobile` | Start Expo dev server |
| `pnpm build` | `turbo build` | Build all packages and apps |
| `pnpm lint` | `turbo lint` | Lint all workspaces |
| `pnpm test` | `turbo test` | Run all tests |
| `pnpm db:generate` | `drizzle-kit generate` | Generate Drizzle migrations |
| `pnpm db:push` | `drizzle-kit push` | Push schema to database |
| `pnpm db:migrate` | `drizzle-kit migrate` | Run pending migrations |
| `pnpm db:studio` | `drizzle-kit studio` | Open Drizzle Studio GUI |

### Web App (`apps/web`)

| Script | Description |
|--------|-------------|
| `pnpm dev` | Next.js dev server on port 3001 |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest |

### Mobile App (`apps/mobile`)

| Script | Description |
|--------|-------------|
| `pnpm dev` / `expo start` | Expo dev server |
| `pnpm ios` | Run on iOS simulator |
| `pnpm android` | Run on Android emulator |
| `pnpm lint` | Expo lint |

## Environment Variables

### Web App (`apps/web/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon) |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | Yes | Public-facing auth URL |
| `BETTER_AUTH_SECRET` | Yes | Auth session signing secret |
| `BETTER_AUTH_URL` | Yes | Server-side auth URL |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID (Calendar) |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GEMINI_API_KEY` | No | Gemini API key for AI features |
| `RESEND_API_KEY` | No | Resend API key for emails |
| `EMAIL_FROM` | No | Sender email address |
| `CRON_SECRET` | No | Secret for push notification cron endpoint |

### Mobile App (`apps/mobile/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Yes | Base URL of the Next.js API (default: `http://localhost:3001`) |

## REST API

The web app exposes a REST API at `/api/v1/` used by the mobile app:

| Endpoint Group | Path | Description |
|---------------|------|-------------|
| Income | `/api/v1/income` | CRUD for income entries |
| Analytics | `/api/v1/analytics` | KPI and reporting data |
| Categories | `/api/v1/categories` | User-defined categories |
| Clients | `/api/v1/clients` | Client management |
| Calendar | `/api/v1/calendar` | Google Calendar integration |
| Settings | `/api/v1/settings` | User settings |
| Devices | `/api/v1/devices` | Push notification device tokens |

All endpoints require Bearer token authentication via Better Auth session tokens.

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
