# Seder Runbook

## Deployment

### Web App (Vercel)

The web app deploys automatically on push to `main`. Manual deploy:

```bash
cd apps/web && vercel --prod
```

### Database Migrations

```bash
pnpm db:generate       # Generate migration from schema changes
pnpm db:migrate        # Apply pending migrations
# OR for quick iteration:
pnpm db:push           # Push schema directly (skips migration files)
```

**Before deploying schema changes:**
1. Review generated SQL in `apps/web/drizzle/`
2. Test on a Neon branch first if possible
3. Ensure RLS policies are preserved (see security section)

### iOS App (TestFlight / App Store)

1. Open `apps/ios/Seder/Seder.xcodeproj` in Xcode
2. Bump version/build number in target settings
3. Product > Archive
4. Distribute App > App Store Connect
5. In App Store Connect, submit for TestFlight review or App Store review

Bundle ID: `com.bareloved.seder`

## Architecture Overview

```
iOS App (Swift/SwiftUI)
    |
    v
REST API (/api/v1/*)  <-- Bearer token auth
    |
    v
Next.js Server Actions + Drizzle ORM
    |
    v
Neon PostgreSQL (RLS enabled)
```

## Monitoring

### Error Tracking (Sentry)

- **Web:** Sentry captures client, server, and edge errors automatically via `@sentry/nextjs`
- **iOS:** Sentry captures crashes via `sentry-cocoa` SPM package
- Both tag errors with `userId` for user-scoped debugging
- Error replays enabled on web (on-error only, not session-wide)
- Config files: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`

### Analytics (Vercel)

- Page view analytics via `@vercel/analytics` in `app/layout.tsx`
- Check Vercel dashboard > Analytics tab

### Rate Limiting (Upstash)

- Auth endpoints rate-limited: 10 req/60s per IP (sliding window)
- Paths: `/sign-in`, `/sign-up`, `/reset-password`, `/email-otp`, `/verify-email`
- Monitor usage in Upstash dashboard
- Config: `lib/ratelimit.ts`

### Database

- **Neon Console**: Check connection pooling, query performance
- **Drizzle Studio**: `pnpm db:studio` for data inspection

### Cron Jobs

| Endpoint | Schedule | Description |
|----------|----------|-------------|
| `/api/cron/backup` | Daily 3:00 UTC | Create Neon backup branch (with rotation and auto-backup toggle) |
| `/api/cron/overdue-notifications` | Daily | Send push notifications for overdue invoices |
| `/api/calendar/auto-sync` | Every 6 hours | Sync Google Calendar events for all users |

All cron endpoints require `CRON_SECRET` Bearer token auth (configured in Vercel cron settings).

The backup cron checks the `auto_backup_enabled` flag in the `site_config` table before running. Manual triggers from the admin dashboard bypass this check (via `x-manual-trigger: true` header).

### Push Notifications

- Overdue notification cron: `POST /api/cron/overdue-notifications` (requires `CRON_SECRET`)
- Device tokens stored in `devices` table
- Push sending logic in `lib/pushNotifications.ts`

## Common Issues

### "Module not found" after pulling
```bash
pnpm install           # Reinstall dependencies
pnpm build             # Rebuild shared packages
```
Shared packages (`@seder/shared`, `@seder/api-client`) must be built before apps can resolve them.

### Database connection errors
- Verify `DATABASE_URL` in `apps/web/.env`
- Check Neon dashboard for connection limits
- Ensure `?sslmode=require` is in the connection string

### Turborepo cache issues
```bash
turbo daemon stop
rm -rf node_modules/.cache/turbo
pnpm dev
```

### iOS build issues
- Clean Xcode derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`
- Product > Clean Build Folder (Shift+Cmd+K)
- Ensure SPM packages are resolved: File > Packages > Resolve Package Versions

### Auth token issues (iOS)
Tokens are stored in Keychain via `KeychainService`. To clear:
- In the app: Settings > Sign Out
- Or reset simulator: Device > Erase All Content and Settings

### Sentry not reporting errors
- Verify `NEXT_PUBLIC_SENTRY_DSN` is set (must be `NEXT_PUBLIC_` for client-side)
- Check `SENTRY_AUTH_TOKEN` for source map uploads during build
- iOS: ensure `sentry-cocoa` SPM package is added and `SentryService.start()` is uncommented

### Rate limiting returning 429 unexpectedly
- Check Upstash dashboard for current rate limit state
- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are correct
- Only auth paths are limited -- other API routes should pass through

### Emails not sending (verification, welcome, feedback reply)
- Verify `RESEND_API_KEY` and `EMAIL_FROM` are set
- Check Resend dashboard for delivery status and bounces
- Feedback is stored in the `feedback` DB table; admin replies from `/admin` send an email to the user
- Email templates use RTL layout with Arial Hebrew font for Hebrew content
- Email logic is in `lib/email.ts`

### Onboarding tour not showing
- Tour state is stored in `userSettings.onboardingCompleted` in the database
- Web: components in `components/onboarding/`; help button resets tour
- iOS: TourOverlay in `Views/Components/TourOverlay.swift`; reset via Settings

## Rollback Procedures

### Web App
Vercel supports instant rollback via dashboard or CLI:
```bash
vercel rollback
```

### Database
1. Check migration history in `apps/web/drizzle/`
2. Write a reverse migration or restore from Neon branch/snapshot
3. Apply with `pnpm db:migrate`

**Neon branching** is the safest approach — create a branch before risky migrations, restore from it if needed.

## Database Backups & Restore

### Automated Backups
- Daily backup branch created at 3:00 UTC via Vercel cron (`/api/cron/backup`)
- Backup branches named `backup-YYYY-MM-DD`
- **Rotation**: Automatically keeps a maximum of 5 backup branches; oldest are deleted before creating a new one
- **Auto-backup toggle**: Controlled by `auto_backup_enabled` key in the `site_config` DB table. Toggle from the admin dashboard (`/admin`). When disabled, the cron job skips without error.
- **Manual backup**: Can be triggered from the admin dashboard at any time (bypasses the auto-backup toggle)

### Restore Procedure
1. Go to Neon console > Project > Branches
2. Find the backup branch for the desired date
3. Create a new branch from the backup (to avoid modifying the backup)
4. Update `DATABASE_URL` in Vercel env vars to point to the restore branch
5. Redeploy
6. Verify data, then switch DNS back to the main branch

### Manual Backup / Restore

Manual backup and restore are done through the Neon console or API. There are no local scripts for this -- use the Neon dashboard to create branches manually or restore from existing backup branches.

## Admin Dashboard

- **URL**: `/admin` (web only, not an API -- uses server components and server actions)
- **Access**: Restricted to the hardcoded admin email (`bareloved@gmail.com`) checked on the server side
- **Features**:
  - Overview KPIs: total users, new users this week, active users this month, unread feedback count
  - Feedback management: view all feedback with category/platform filters, set status (unread/read/in_progress/done/replied), reply (sends email to user), delete
  - User list: all users with entry counts, expandable detail sheet (last active, Google connected, onboarding status, category/client counts, mobile registered)
  - Sentry health indicator: fetches unresolved issues from Sentry API (24h window), shows green/amber/red status
  - Backup controls: manual backup trigger, auto-backup enable/disable toggle (persisted in `site_config` table)
  - Quick links: Sentry, Vercel Analytics, Neon Console, Upstash, Google Cloud

## Security

- All data scoped by `userId` — Row-Level Security (RLS) enforced at the database level on 7 user-scoped tables via the `withUser` / `withAdminBypass` transaction wrappers in `apps/web/db/client.ts` and policies in `apps/web/drizzle/0008_enable_rls.sql`. The app connects as the `seder_app` role (which has `NOBYPASSRLS`); `neondb_owner` retains `BYPASSRLS` and is reserved for migrations and emergency admin work.
- API routes validate Bearer tokens via Better Auth middleware (`apps/web/app/api/v1/_lib/`)
- Google OAuth tokens stored in `account` table, never exposed to client
- iOS auth tokens in Keychain via `KeychainService`
- Auth endpoints rate-limited via Upstash (10 req/60s per IP)
- Email verification required for email/password sign-ups
- Feedback endpoint HTML-escapes user input to prevent XSS

## RLS On Fire — Emergency Rollback

**Symptom:** After shipping the RLS retrofit, users report:
- Empty income list where they had entries
- "Save" button works but changes don't persist
- New entries fail to create with a 500 error
- A cron (push notifications, rolling jobs, backup) stops running
- Sentry shows errors matching `"new row violates row-level security policy"`

**Diagnosis:** A query path is running outside a `withUser` or `withAdminBypass` wrapper. The RLS policies are denying it because the `seder_app` role has `NOBYPASSRLS`.

### Mitigation Level 1 — Env var flip (recommended, 30 seconds, no redeploy)

1. Open Vercel → Seder project → Settings → Environment Variables.
2. Change `DATABASE_URL` (Production) from the `seder_app` connection string to the `neondb_owner` connection string. The `neondb_owner` URL should be stored alongside as `DATABASE_URL_ADMIN` — copy its value into `DATABASE_URL`.
3. Redeploy the current production deployment (or wait for the next one — the env var picks up on next cold start without a full redeploy).

**Effect:** the app immediately starts connecting as `neondb_owner`, which has `BYPASSRLS`. Every policy is skipped → app-layer isolation only, same behavior as before the RLS retrofit. No data loss. The `withUser`/`withAdminBypass` wrappers in the code become no-ops.

**When to use this:** any time a missing wrapper is suspected. This is the primary rollback.

### Mitigation Level 2 — SQL rollback (removes RLS at the DB level)

If the env var flip isn't enough (e.g., there's some other reason the `seder_app` role is compromised), disable RLS at the database level:

```bash
psql "$DATABASE_URL_ADMIN" -f apps/web/drizzle/rollback_rls.sql
```

Or paste `apps/web/drizzle/rollback_rls.sql` into the Neon SQL Editor and run.

**Effect:** disables RLS on all 7 tables. Independent of which role is connecting. No data loss. Re-enabling later means re-running `0008_enable_rls.sql`.

### After mitigation

1. Check Sentry / Vercel logs for the specific failing route.
2. Find the missed wrap: look for direct `db.select`/`db.insert`/`db.update`/`db.delete` calls against any of the 7 user-scoped tables (`income_entries`, `categories`, `clients`, `user_settings`, `device_tokens`, `dismissed_nudges`, `feedback`) or the `rolling_jobs` table. The coverage grep:
   ```bash
   grep -rnE "\bdb\.(select|insert|update|delete|transaction|execute)" apps/web --include="*.ts" --include="*.tsx" | grep -E "incomeEntries|categories|clients|userSettings|deviceTokens|dismissedNudges|feedback|rollingJobs"
   ```
3. Wrap the missed call site with `withUser(userId, async (tx) => { ... })` or `withAdminBypass(async (tx) => { ... })` as appropriate.
4. Ship the fix via a normal PR.
5. Flip `DATABASE_URL` back to the `seder_app` URL to re-enable enforcement.

### Switching DATABASE_URL between roles

Production Vercel env vars (both should be configured at all times):
- `DATABASE_URL` — the active connection. Points at `seder_app` when RLS is enforced, `neondb_owner` when it's not.
- `DATABASE_URL_ADMIN` — always the `neondb_owner` connection, kept as the rollback source.

**When NOT to use rollback:** if the issue is an unrelated bug that happens to coincide with the RLS rollout, disabling RLS won't help and will just mask a second bug. Read the Sentry error first — a Postgres `"row-level security policy"` error confirms RLS is the cause. Anything else, investigate independently.
