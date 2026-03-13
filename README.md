# Seder

Income tracking platform for freelancers and musicians. Hebrew-first, RTL-friendly, with ILS currency.

## Overview

Seder helps gig-based earners track income, invoices, and payments across clients. It includes a **web app** and a **native iOS app**, structured as a **Turborepo monorepo** with shared packages.

- Track income per gig/client with status (draft/sent/paid/overdue)
- See paid vs unpaid at a glance with monthly KPIs
- Import gigs from Google Calendar
- Analytics and reporting dashboards
- Smart nudges for overdue invoices and follow-ups

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web | Next.js 16, React 19, TypeScript, Tailwind CSS, Radix UI |
| iOS | Swift, SwiftUI (native) |
| Database | PostgreSQL (Neon) with Drizzle ORM |
| Auth | Better Auth (email/password + Google OAuth) |
| Email | Resend |
| Error Tracking | Sentry (web + iOS) |
| Rate Limiting | Upstash Redis |
| Analytics | Vercel Analytics |
| Monorepo | Turborepo + pnpm workspaces |

## Monorepo Structure

```
apps/
  web/         - Next.js 16 web app
  ios/         - Native iOS app (Swift/SwiftUI, Xcode project)
packages/
  shared/      - @seder/shared — types, Zod schemas, constants, utils
  api-client/  - @seder/api-client — typed HTTP client (ky)
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm (via corepack: `corepack enable`)
- PostgreSQL (Neon recommended)
- Xcode 16+ (for iOS)

### Setup

```bash
git clone <repo-url> && cd seder
pnpm install
cp apps/web/.env.example apps/web/.env
# Edit apps/web/.env with your credentials
pnpm db:push
pnpm dev:web        # Web app at http://localhost:3001
```

For iOS, open `apps/ios/Seder/Seder.xcodeproj` in Xcode and run.

## Scripts

```bash
pnpm dev             # Start all apps
pnpm dev:web         # Web only
pnpm build           # Build all
pnpm lint            # Lint all
pnpm test            # Test all
pnpm db:push         # Push schema to database
pnpm db:generate     # Generate migrations
pnpm db:migrate      # Run migrations
pnpm db:studio       # Open Drizzle Studio
pnpm sync:contract   # Generate API contract from @seder/shared
pnpm sync:check-ios  # Check iOS models against contract
```

## Documentation

- [CLAUDE.md](CLAUDE.md) — AI agent guidance and architecture reference
- [docs/CONTRIB.md](docs/CONTRIB.md) — Development workflow and environment setup
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — Deployment, monitoring, and operations
- [docs/CROSS_PLATFORM_GUIDE.md](docs/CROSS_PLATFORM_GUIDE.md) — Web + iOS development guide
- [docs/PRODUCTION_READINESS_TESTING.md](docs/PRODUCTION_READINESS_TESTING.md) — Beta launch testing checklist

## License

[MIT](LICENSE)
