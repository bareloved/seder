# RLS Retrofit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Postgres Row-Level Security as defense-in-depth across the 7 user-scoped tables in a single big-bang PR, so that even if a future query forgets its `userId` filter, the database returns 0 rows instead of leaking data.

**Architecture:** Two thin helpers in `apps/web/db/client.ts` (`withUser`, `withAdminBypass`) wrap `db.transaction()` and emit `SET LOCAL app.user_id = ...` / `SET LOCAL app.bypass_rls = 'on'`. Each of the 7 tables gets one permissive RLS policy keyed on those GUCs, plus `FORCE ROW LEVEL SECURITY` because the app connects as DB owner. Data-access helpers in `data.ts` files wrap their bodies internally so route handlers and server components don't change; a small number of route handlers and server actions are wrapped directly. Admin/cron paths use `withAdminBypass` or a per-user `withUser` loop.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM 0.44.7, `pg` 8 with connection pooling, Postgres on Neon, TypeScript 5. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-14-rls-retrofit-design.md`

---

## ⚠️ Addendum (2026-04-15) — Role separation required

**Found during Task 4 smoke test against a Neon dev branch:**

Neon's default database role `neondb_owner` has `rolbypassrls = t` — the `BYPASSRLS` privilege. That privilege **overrides `FORCE ROW LEVEL SECURITY`**. Neon locks down `neondb_owner` so that even `ALTER ROLE neondb_owner NOBYPASSRLS` fails with "permission denied" — only Neon's internal `cloud_admin` role can modify it.

**Effect:** the original spec's `FORCE ROW LEVEL SECURITY` mechanism does nothing on Neon. An app connecting as `neondb_owner` bypasses all policies regardless of `FORCE`. Verified empirically: applied `0008_enable_rls.sql`, then ran `SELECT COUNT(*) FROM income_entries` with no GUC set — got 432 real rows instead of the expected 0.

**Fix:** create a new, minimally-privileged Postgres role `seder_app` that has `NOBYPASSRLS`, and have the app connect as `seder_app` instead of `neondb_owner`. `neondb_owner` retains `BYPASSRLS` and is still used for migrations and admin work (via a separate DATABASE_URL).

Verified on the dev branch:
- `seder_app` sees 0 rows on all 7 tables without a GUC (loud failure)
- `seder_app` with `SET LOCAL app.user_id = 'X'` sees only user X's rows
- `seder_app` with `SET LOCAL app.bypass_rls = 'on'` sees all rows
- Cross-tenant INSERT is blocked by `WITH CHECK` (`ERROR: new row violates row-level security policy`)
- Same-tenant INSERT succeeds

**Role creation SQL (to run on each Neon branch that needs enforcement — dev, staging, prod):**

```sql
CREATE ROLE seder_app WITH LOGIN PASSWORD '<strong random>' NOBYPASSRLS NOSUPERUSER NOCREATEROLE NOCREATEDB;
GRANT USAGE ON SCHEMA public TO seder_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO seder_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO seder_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO seder_app;
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO seder_app;
```

`neondb_owner` has `CREATEROLE`, so this can be run via psql without needing Neon cloud_admin access.

**Rollout implications:**
1. Before deploying the code changes: create `seder_app` on production with a strong random password, build the connection string.
2. Code + migration ship to production still using `neondb_owner` as DATABASE_URL. RLS is enabled by the migration but neondb_owner bypasses it → zero behavior change in prod. The deploy is safe even if wrappers are incomplete.
3. **Enforcement toggle:** change `DATABASE_URL` in Vercel from the `neondb_owner` URL to the `seder_app` URL. Redeploy. RLS now actively enforces.
4. **Rollback is an env var flip:** put the `neondb_owner` URL back in Vercel. Takes seconds. No SQL needed, no code redeploy needed — just one env var swap. This is simpler and faster than the SQL rollback script and should be the first resort.

Keep `apps/web/drizzle/rollback_rls.sql` as a secondary rollback for the (unlikely) case where we want to fully disable RLS at the database level rather than just switch back to the bypass role.

**New tasks added to the plan:**

- **T17.5:** User temporarily points local `.env` at the `seder_app` test-branch URL to run the Task 17 smoke test with real enforcement. After the smoke test, they restore their original `.env`.
- **T19.5:** Post-merge (not in the PR itself): create `seder_app` on the production database, add `SEDER_APP_DATABASE_URL` to Vercel, and flip `DATABASE_URL` to that value when ready to enforce.

---

## File Structure

**Created files:**
- `apps/web/drizzle/0007_enable_rls.sql` — migration enabling RLS + policies + FORCE on all 7 tables
- `apps/web/drizzle/rollback_rls.sql` — single-command rollback

**Modified files (by category, see Task 1 for the full list with line-level changes):**
- `apps/web/db/client.ts` — add `withUser` + `withAdminBypass`
- `apps/web/app/income/data.ts` — wrap every exported function body in `withUser`
- `apps/web/app/clients/data.ts` — wrap every exported function body
- `apps/web/app/categories/data.ts` — wrap every exported function body
- `apps/web/lib/nudges/queries.ts` — wrap every exported function body
- `apps/web/lib/pushNotifications.ts` — wrap `sendPushToUser` body
- `apps/web/app/settings/actions.ts` — wrap each server action
- `apps/web/app/api/v1/feedback/route.ts` — wrap route body
- `apps/web/app/api/v1/devices/route.ts` — wrap route body
- `apps/web/app/api/v1/devices/[token]/route.ts` — wrap route body
- `apps/web/app/api/v1/settings/route.ts` — wrap route body
- `apps/web/app/api/v1/settings/export/route.ts` — wrap route body
- `apps/web/app/api/v1/settings/account/route.ts` — use `withAdminBypass` (see Task 14, Special Case)
- `apps/web/app/api/v1/income/[id]/route.ts` — wrap route body
- `apps/web/app/api/calendar/sync-now/route.ts` — wrap route body
- `apps/web/app/api/calendar/auto-sync/route.ts` — wrap route body
- `apps/web/app/api/settings/calendar/route.ts` — wrap route body
- `apps/web/app/api/google/disconnect/route.ts` — wrap route body
- `apps/web/lib/auth.ts` — wrap the categories insert in the signup hook
- `apps/web/app/admin/actions.ts` — wrap each admin action in `withAdminBypass`
- `apps/web/app/admin/page.tsx` — wrap the server-side data fetching in `withAdminBypass`
- `apps/web/app/api/cron/overdue-notifications/route.ts` — per-user `withUser` inside the loop
- `docs/RUNBOOK.md` — add a "RLS on fire" rollback entry

**Not modified (intentional, see spec Call-site inventory):**
- `apps/web/app/api/google/risc/route.ts` — only touches Better Auth tables
- `apps/web/app/api/cron/backup/route.ts` — only touches `site_config`
- `apps/web/lib/googleTokens.ts` — only touches `account` (Better Auth)
- `apps/web/scripts/backup.ts` — standalone script, not part of request lifecycle
- `apps/web/scripts/check-schema.ts` — schema introspection only

---

## Task 1: Add `withUser` and `withAdminBypass` helpers

**Why first:** every subsequent task imports from this. Nothing else can be wrapped until the wrappers exist.

**Files:**
- Modify: `apps/web/db/client.ts`

- [ ] **Step 1: Read the current file to understand the pattern**

Run: `cat apps/web/db/client.ts`
Expected: shows a lazy proxy over `drizzle(pool, { schema })` with `getPool()` and `getDb()`. The `db` export is a `Proxy` around the drizzle instance.

- [ ] **Step 2: Add the two helpers to `apps/web/db/client.ts`**

Replace the entire file content with:

```ts
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

// Create a lazy connection pool
let pool: Pool | null = null;

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL environment variable is required. " +
      "Please set it in your .env.local file with your Neon Postgres connection string."
    );
  }

  if (!pool) {
    // Replace weaker SSL modes with verify-full to silence pg v8 deprecation warning
    const connectionString = process.env.DATABASE_URL.replace(
      /sslmode=(require|prefer|verify-ca)\b/,
      "sslmode=verify-full"
    );
    pool = new Pool({
      connectionString,
      ssl: true,
    });
  }

  return pool;
}

// Create a lazy Drizzle instance
type DbType = ReturnType<typeof drizzle<typeof schema>>;
let drizzleInstance: DbType | null = null;

function getDb(): DbType {
  if (!drizzleInstance) {
    drizzleInstance = drizzle(getPool(), { schema });
  }
  return drizzleInstance;
}

// Export a proxy that lazily initializes the db
export const db = new Proxy({} as DbType, {
  get(_, prop) {
    const instance = getDb();
    return (instance as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/**
 * Drizzle transaction handle type — use in callbacks for withUser/withAdminBypass.
 * Prefer using the tx param directly rather than re-typing it.
 */
export type DbTx = Parameters<Parameters<DbType["transaction"]>[0]>[0];

/**
 * Run a block of queries inside a transaction scoped to a single user.
 * Sets `app.user_id` via SET LOCAL so that RLS policies on user-scoped
 * tables permit rows matching the given userId and deny all others.
 *
 * ALWAYS use the `tx` parameter for queries inside the callback — using
 * the outer `db` would run queries outside the transaction (no GUC set,
 * RLS denies, returns 0 rows).
 */
export async function withUser<T>(
  userId: string,
  fn: (tx: DbTx) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.user_id = ${userId}`);
    return fn(tx);
  });
}

/**
 * Run a block of queries inside a transaction that bypasses RLS entirely.
 * Use for admin/cron paths that legitimately operate across users
 * (admin dashboard, user deletion, cross-user analytics).
 *
 * Never use this to paper over a missing withUser wrapper — it defeats
 * the isolation guarantee for that code path.
 */
export async function withAdminBypass<T>(
  fn: (tx: DbTx) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.bypass_rls = 'on'`);
    return fn(tx);
  });
}

// Export schema for convenience
export { schema };
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @seder/web exec tsc --noEmit 2>&1 | grep -E "db/client" || echo "db/client.ts: clean"`
Expected: `db/client.ts: clean`

- [ ] **Step 4: Commit**

```bash
git add apps/web/db/client.ts
git commit -m "feat(rls): add withUser and withAdminBypass helpers

Introduces two transaction wrappers that set app.user_id and
app.bypass_rls GUCs via SET LOCAL, to be consumed by the RLS
policies added in the follow-up migration. Inert until the
migration is applied.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Write the RLS migration SQL

**Why now:** the wrapper exists, so we can write policies that reference the GUCs it sets. Migration is committed now but NOT applied to production until the final step; we apply it to a local dev DB for verification.

**Files:**
- Create: `apps/web/drizzle/0007_enable_rls.sql`
- Modify: `apps/web/drizzle/meta/_journal.json`

- [ ] **Step 1: Generate an empty custom migration via drizzle-kit**

Run: `pnpm --filter @seder/web exec drizzle-kit generate --custom --name enable_rls`
Expected: creates a new file like `apps/web/drizzle/0007_enable_rls.sql` (empty or with `-- Custom SQL migration file...` placeholder) and updates `meta/_journal.json` automatically.

- [ ] **Step 2: Fill in the migration**

Replace the contents of `apps/web/drizzle/0007_enable_rls.sql` with:

```sql
-- Enable Row-Level Security on all user-scoped tables.
-- Policies check current_setting('app.user_id', true) — set by the
-- withUser() helper in apps/web/db/client.ts via SET LOCAL.
-- Admin/cron paths use current_setting('app.bypass_rls', true) = 'on'
-- set by the withAdminBypass() helper.
--
-- FORCE ROW LEVEL SECURITY is required because the app connects as
-- the table owner, which is otherwise exempt from RLS policies.
--
-- Rollback: apps/web/drizzle/rollback_rls.sql

-- income_entries
ALTER TABLE "income_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "income_entries" FORCE ROW LEVEL SECURITY;
CREATE POLICY "income_entries_tenant_isolation" ON "income_entries"
  USING (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  )
  WITH CHECK (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );

-- categories
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY "categories_tenant_isolation" ON "categories"
  USING (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  )
  WITH CHECK (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );

-- clients
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" FORCE ROW LEVEL SECURITY;
CREATE POLICY "clients_tenant_isolation" ON "clients"
  USING (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  )
  WITH CHECK (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );

-- user_settings
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_settings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "user_settings_tenant_isolation" ON "user_settings"
  USING (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  )
  WITH CHECK (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );

-- device_tokens
ALTER TABLE "device_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "device_tokens" FORCE ROW LEVEL SECURITY;
CREATE POLICY "device_tokens_tenant_isolation" ON "device_tokens"
  USING (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  )
  WITH CHECK (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );

-- dismissed_nudges
ALTER TABLE "dismissed_nudges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dismissed_nudges" FORCE ROW LEVEL SECURITY;
CREATE POLICY "dismissed_nudges_tenant_isolation" ON "dismissed_nudges"
  USING (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  )
  WITH CHECK (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );

-- feedback
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "feedback" FORCE ROW LEVEL SECURITY;
CREATE POLICY "feedback_tenant_isolation" ON "feedback"
  USING (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  )
  WITH CHECK (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );
```

- [ ] **Step 3: Commit the migration file**

```bash
git add apps/web/drizzle/0007_enable_rls.sql apps/web/drizzle/meta/_journal.json
git commit -m "feat(rls): migration enabling RLS on 7 user-scoped tables

Enables RLS + FORCE + one permissive tenant-isolation policy per
table. Policies check app.user_id (set by withUser) or
app.bypass_rls (set by withAdminBypass). Better Auth tables
(user/session/account/verification) and site_config are
intentionally excluded.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Write the rollback script

**Why now:** we want the rollback committed before we touch any app code, so it exists independently of the wrapping work.

**Files:**
- Create: `apps/web/drizzle/rollback_rls.sql`

- [ ] **Step 1: Create the rollback script**

Create `apps/web/drizzle/rollback_rls.sql` with:

```sql
-- Emergency RLS rollback.
-- Run this if a missing withUser/withAdminBypass wrapper causes
-- any feature to silently fail after deploying 0007_enable_rls.
--
-- How to run:
--   psql "$DATABASE_URL" -f apps/web/drizzle/rollback_rls.sql
-- Or paste into the Neon SQL Editor / Drizzle Studio.
--
-- Effect: the app falls back to app-layer-only isolation (the state
-- before the RLS retrofit). No redeploy required. No data loss.
-- The withUser/withAdminBypass wrappers remain in the code but
-- become no-ops (transactions without enforcing policies).
--
-- Re-enabling RLS later: re-run 0007_enable_rls.sql.

ALTER TABLE "income_entries" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "user_settings" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "device_tokens" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "dismissed_nudges" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "feedback" DISABLE ROW LEVEL SECURITY;
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/drizzle/rollback_rls.sql
git commit -m "chore(rls): add emergency rollback script

Single-command disable for all 7 RLS-enabled tables. Run from
Neon console or psql if a missing wrapper causes production
breakage after the 0007_enable_rls migration ships.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Smoke-test the migration against a local dev database

**Why now:** before we touch 20+ files to wrap things, we want end-to-end proof that a wrapped query works and an unwrapped query fails against a real DB. If the policies are wrong, we find out now with no app changes to unwind.

**Files:** none modified; this is verification only.

**Prerequisite:** a local `.env.local` with `DATABASE_URL` pointing at a **dev/scratch database**, NOT production. Use a Neon branch or a local Docker Postgres. If unsure, create a Neon branch named `rls-test` from production and use its connection string.

- [ ] **Step 1: Apply the migration to the dev DB**

Run: `pnpm --filter @seder/web exec drizzle-kit migrate`
Expected: migration applies, `0007_enable_rls` appears in `_journal.json` as the latest applied entry. No errors.

- [ ] **Step 2: Verify RLS is on for all 7 tables**

Run:
```bash
psql "$DATABASE_URL" -c "SELECT tablename, rowsecurity, forcerowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN ('income_entries','categories','clients','user_settings','device_tokens','dismissed_nudges','feedback') ORDER BY tablename;"
```
Expected: 7 rows, every row shows `rowsecurity=t` and `forcerowsecurity=t`.

- [ ] **Step 3: Prove an unwrapped query returns zero rows**

Run:
```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM income_entries;"
```
Expected: `count = 0`. (Even though rows exist, the GUC is unset, so the policy denies all reads.)

- [ ] **Step 4: Prove a wrapped query returns the right user's rows**

First look up a real userId on the dev DB:
```bash
psql "$DATABASE_URL" -c "SELECT id, email FROM \"user\" LIMIT 3;"
```
Copy one of the ids (e.g., `abc123`). Then:
```bash
psql "$DATABASE_URL" -c "BEGIN; SET LOCAL app.user_id = 'abc123'; SELECT COUNT(*) FROM income_entries; COMMIT;"
```
Expected: count matches the number of income_entries rows that user owns (use Drizzle Studio or a separate unfiltered query with `SET LOCAL app.bypass_rls='on'` to confirm).

- [ ] **Step 5: Prove the bypass works**

Run:
```bash
psql "$DATABASE_URL" -c "BEGIN; SET LOCAL app.bypass_rls = 'on'; SELECT COUNT(*) FROM income_entries; COMMIT;"
```
Expected: count equals the total row count across all users.

- [ ] **Step 6: Prove cross-tenant isolation**

Pick TWO different userIds from the `user` table with income entries. Verify:
```bash
psql "$DATABASE_URL" -c "BEGIN; SET LOCAL app.user_id = 'USER_A_ID'; SELECT user_id, COUNT(*) FROM income_entries GROUP BY user_id; COMMIT;"
```
Expected: only `USER_A_ID` in the output. No row for `USER_B_ID`. (If you see rows for a different user_id, the policy is wrong — STOP and debug before continuing.)

- [ ] **Step 7: Record success and continue**

If all 6 checks above passed, the migration and policies are correct. Proceed to Task 5.

If any check failed, run the rollback:
```bash
psql "$DATABASE_URL" -f apps/web/drizzle/rollback_rls.sql
```
Then debug the migration SQL before continuing.

---

## Task 5: Wrap `app/income/data.ts` helpers internally

**Why:** `income/data.ts` is the largest data-access file (30+ functions, all taking `userId`). Wrapping it internally means route handlers and server components that call these helpers don't need to change. Biggest single payoff.

**Files:**
- Modify: `apps/web/app/income/data.ts`

**Pattern for every function in this file:** take the existing function body, move it inside `return withUser(userId, async (tx) => { ... });`, and replace every `db.` call with `tx.`. Keep existing `eq(X.userId, userId)` filters in place — they're redundant with RLS but harmless, and leaving them reduces the diff's risk.

- [ ] **Step 1: Add the `withUser` import**

Open `apps/web/app/income/data.ts`. The first line is `import { db } from "@/db/client";`. Change it to:

```ts
import { db, withUser } from "@/db/client";
```

- [ ] **Step 2: Wrap `getIncomeEntriesForMonth`**

Find the function (around line 79). Current shape:

```ts
export async function getIncomeEntriesForMonth({ year, month, userId, ... }): Promise<...> {
  const result = await db.select().from(incomeEntries).where(...);
  // ...
  return result;
}
```

Change to:

```ts
export async function getIncomeEntriesForMonth({ year, month, userId, ... }): Promise<...> {
  return withUser(userId, async (tx) => {
    const result = await tx.select().from(incomeEntries).where(...);
    // ...
    return result;
  });
}
```

Rules for the replacement:
- Every `db.select`, `db.insert`, `db.update`, `db.delete`, `db.transaction`, `db.execute` becomes `tx.select`, `tx.insert`, etc.
- `sql\`...\`` fragments passed to `tx.execute(...)` are unchanged — they run inside the transaction automatically.
- Don't remove `eq(incomeEntries.userId, userId)` filters. They stay.
- If the function doesn't take `userId`, flag it and STOP — every function in this file should have a userId. If one doesn't, investigate before wrapping.

- [ ] **Step 3: Apply the same wrap to every other exported function**

Exported functions to wrap (from `apps/web/app/income/data.ts`):

1. `getIncomeEntriesForMonth`
2. `getAllIncomeEntries`
3. `getMonthPaymentStatuses`
4. `getEnhancedTrends`
5. `getYearTrends`
6. `getCategoryBreakdown`
7. `getCategoryBreakdownYearly`
8. `getClientBreakdown`
9. `getClientBreakdownYearly`
10. `getAttentionItems`
11. `getIncomeAggregatesForMonth`
12. `getIncomeAggregatesForYear`
13. `createIncomeEntry`
14. `updateIncomeEntry`
15. `markIncomeEntryAsPaid`
16. `markInvoiceSent`
17. `revertToDraft`
18. `revertToSent`
19. `deleteIncomeEntry`
20. `getRecentEntriesForClient`
21. `getUniqueClients`
22. `hasGoogleCalendarConnection`
23. `importIncomeEntriesFromCalendarForMonth`
24. Any others — grep the file for `export async function` to get the full list.

For each: wrap the body in `withUser(userId, async (tx) => { ... })`, rewrite `db.xxx` → `tx.xxx`.

**Special consideration for `importIncomeEntriesFromCalendarForMonth`:** this function also calls `getValidGoogleAccessToken(userId)` from `lib/googleTokens.ts`, which queries the `account` (Better Auth) table. Better Auth tables are NOT under RLS, so calling that from inside a `withUser` transaction is fine — the Better Auth query runs unimpeded.

**Special consideration for `hasGoogleCalendarConnection`:** this reads from `account`. Same — Better Auth table, not under RLS. But still wrap the function in `withUser(userId, ...)` for consistency so that any future queries in this function body automatically run inside the transaction.

- [ ] **Step 4: Verify no direct `db.` references remain in the file**

Run:
```bash
grep -n "\bdb\." apps/web/app/income/data.ts || echo "clean"
```
Expected: `clean` (or zero output). If any `db.` references remain, they're bugs — find them and rewrite to `tx.`.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @seder/web exec tsc --noEmit 2>&1 | grep "income/data.ts" || echo "income/data.ts: clean"`
Expected: `income/data.ts: clean`

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/income/data.ts
git commit -m "feat(rls): wrap income/data.ts helpers in withUser

Every exported function in income/data.ts now runs its body
inside a withUser transaction that sets app.user_id. Callers
are unchanged — the wrap is internal to each function.

Existing eq(incomeEntries.userId, userId) filters are kept as
belt-and-suspenders alongside the RLS enforcement.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Wrap `app/clients/data.ts` helpers internally

**Files:**
- Modify: `apps/web/app/clients/data.ts`

- [ ] **Step 1: Read the file**

Run: `cat apps/web/app/clients/data.ts`
Expected: shows ~10-15 exported functions, all taking `userId`.

- [ ] **Step 2: Add the import**

Change `import { db } from "@/db/client";` → `import { db, withUser } from "@/db/client";`

- [ ] **Step 3: Apply the same wrap pattern from Task 5 to every exported function**

For each `export async function name(...): ... { <body> }`, rewrite as:

```ts
export async function name(...): ... {
  return withUser(userId, async (tx) => {
    <body with db.xxx → tx.xxx>
  });
}
```

- [ ] **Step 4: Verify clean**

```bash
grep -n "\bdb\." apps/web/app/clients/data.ts || echo "clean"
pnpm --filter @seder/web exec tsc --noEmit 2>&1 | grep "clients/data.ts" || echo "clients/data.ts: clean"
```
Expected: both `clean`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/clients/data.ts
git commit -m "feat(rls): wrap clients/data.ts helpers in withUser

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Wrap `app/categories/data.ts` helpers internally

**Files:**
- Modify: `apps/web/app/categories/data.ts`

- [ ] **Step 1: Read the file and identify all exported functions**

Run: `grep -n "export async function\|export function" apps/web/app/categories/data.ts`

- [ ] **Step 2: Add the import**

Change `import { db } from "@/db/client";` → `import { db, withUser } from "@/db/client";`

- [ ] **Step 3: Wrap every exported function**

Same pattern as Task 5 Step 2. Every function takes a `userId` — wrap the body in `withUser(userId, async (tx) => { ... })`.

- [ ] **Step 4: Verify clean**

```bash
grep -n "\bdb\." apps/web/app/categories/data.ts || echo "clean"
pnpm --filter @seder/web exec tsc --noEmit 2>&1 | grep "categories/data.ts" || echo "categories/data.ts: clean"
```
Expected: both `clean`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/categories/data.ts
git commit -m "feat(rls): wrap categories/data.ts helpers in withUser

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Wrap `lib/nudges/queries.ts` helpers internally

**Files:**
- Modify: `apps/web/lib/nudges/queries.ts`

- [ ] **Step 1: Read the file**

Run: `cat apps/web/lib/nudges/queries.ts`
Expected: shows exported helpers like `fetchNudgeableEntries(userId)`, `fetchDismissedNudges(userId)`, `getNudgeSettings(userId)`, `markNudgePushed(...)`. Each takes a userId.

- [ ] **Step 2: Add the import**

Change the import line to include `withUser`: `import { db, withUser } from "@/db/client";`

- [ ] **Step 3: Wrap every exported function**

Same pattern as Task 5.

**Special note on `markNudgePushed(userId, nudgeType, entryId, periodKey)`:** this writes to `dismissed_nudges`. Wrap with `withUser(userId, ...)`.

- [ ] **Step 4: Verify clean**

```bash
grep -n "\bdb\." apps/web/lib/nudges/queries.ts || echo "clean"
pnpm --filter @seder/web exec tsc --noEmit 2>&1 | grep "nudges/queries.ts" || echo "nudges/queries.ts: clean"
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/nudges/queries.ts
git commit -m "feat(rls): wrap nudges/queries.ts helpers in withUser

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Wrap `lib/pushNotifications.ts`

**Files:**
- Modify: `apps/web/lib/pushNotifications.ts`

- [ ] **Step 1: Read the file**

Run: `cat apps/web/lib/pushNotifications.ts`
Expected: contains `sendPushToUser(userId, title, body, data)` which queries `deviceTokens` (and possibly `userSettings`) for that user.

- [ ] **Step 2: Add the import**

Change the existing `db` import to `import { db, withUser } from "@/db/client";`.

- [ ] **Step 3: Wrap `sendPushToUser`**

Wrap the entire body in `return withUser(userId, async (tx) => { ... })`. Replace every `db.` with `tx.`.

If there are other exported functions, wrap them the same way. If any internal helper function queries user-scoped tables, either wrap its callers or add a `tx` parameter — prefer wrapping the callers (easier).

- [ ] **Step 4: Verify clean**

```bash
grep -n "\bdb\." apps/web/lib/pushNotifications.ts || echo "clean"
pnpm --filter @seder/web exec tsc --noEmit 2>&1 | grep "pushNotifications" || echo "pushNotifications.ts: clean"
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/pushNotifications.ts
git commit -m "feat(rls): wrap pushNotifications in withUser

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Wrap `app/settings/actions.ts` server actions

**Files:**
- Modify: `apps/web/app/settings/actions.ts`

- [ ] **Step 1: Read the file**

Run: `cat apps/web/app/settings/actions.ts`
Expected: a handful of `"use server"` exported functions that call `auth.api.getSession()` then `db.update(userSettings)...` or similar.

- [ ] **Step 2: Add the import**

Add `withUser` to the existing `@/db/client` import.

- [ ] **Step 3: Wrap each server action**

For each exported action, the pattern is:

```ts
export async function updateThing(input: ...) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  return withUser(userId, async (tx) => {
    // existing body, with db.xxx → tx.xxx
  });
}
```

Apply to every exported action in the file.

- [ ] **Step 4: Verify clean**

```bash
grep -n "\bdb\." apps/web/app/settings/actions.ts || echo "clean"
pnpm --filter @seder/web exec tsc --noEmit 2>&1 | grep "settings/actions" || echo "settings/actions.ts: clean"
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/settings/actions.ts
git commit -m "feat(rls): wrap settings server actions in withUser

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Wrap API routes that only touch user-scoped tables

**Why grouped:** these are all the same mechanical pattern — a route calls `requireAuth()` for the userId, then queries one or more user-scoped tables. Wrap the body after `requireAuth()` in `withUser`.

**Files:**
- Modify: `apps/web/app/api/v1/feedback/route.ts`
- Modify: `apps/web/app/api/v1/devices/route.ts`
- Modify: `apps/web/app/api/v1/devices/[token]/route.ts`
- Modify: `apps/web/app/api/v1/settings/route.ts`
- Modify: `apps/web/app/api/v1/settings/export/route.ts`
- Modify: `apps/web/app/api/v1/income/[id]/route.ts`
- Modify: `apps/web/app/api/calendar/sync-now/route.ts`
- Modify: `apps/web/app/api/calendar/auto-sync/route.ts`
- Modify: `apps/web/app/api/settings/calendar/route.ts`
- Modify: `apps/web/app/api/google/disconnect/route.ts`

**Not in this task (handled separately):**
- `app/api/v1/settings/account/route.ts` — Task 14 (needs `withAdminBypass` because it crosses Better Auth tables)
- `app/api/v1/income/route.ts` — uses `income/data.ts` helpers only; those are already wrapped in Task 5, so no change needed
- `app/api/v1/calendar/import/route.ts` — uses `income/data.ts` helper (already wrapped)
- Admin routes — Task 15

- [ ] **Step 1: For each file in the list above, apply this exact pattern**

Existing shape:

```ts
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    // ... body that calls db.xxx directly or via helpers ...
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
```

If the body **only** calls helpers from data.ts files that were already wrapped in Tasks 5-8: **no change needed, skip this file**. Verify by grepping the file for `db.` — if none, skip.

If the body calls `db.xxx` directly (e.g., `db.insert(feedback).values(...)`), rewrite:

```ts
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const result = await withUser(userId, async (tx) => {
      // ... body, with db.xxx → tx.xxx ...
      return somethingToReturn;
    });
    return apiSuccess(result);
  } catch (error) {
    return apiError(error);
  }
}
```

Add `import { withUser } from "@/db/client";` at the top.

**Important:** `requireAuth()`, `await request.json()`, input validation (e.g., Zod parse) — all of this stays OUTSIDE the `withUser` callback because:
1. They don't need a DB transaction.
2. Throwing validation errors before opening a transaction is slightly cleaner.
3. `requireAuth()` calls Better Auth's `getSession`, which queries Better Auth tables — should NOT be inside our wrapper.

- [ ] **Step 2: Process each file one at a time**

For each of the 10 files above:
1. Read the file.
2. Decide: any `db.` calls in the route handler? If not, skip. If yes, wrap per the pattern.
3. Grep verify: `grep -n "\bdb\." <file>` should return nothing (or only `import { db, withUser }`).
4. Typecheck just this file.
5. Move on.

- [ ] **Step 3: Final verification after all 10 files processed**

Run:
```bash
for f in apps/web/app/api/v1/feedback/route.ts apps/web/app/api/v1/devices/route.ts apps/web/app/api/v1/devices/\[token\]/route.ts apps/web/app/api/v1/settings/route.ts apps/web/app/api/v1/settings/export/route.ts apps/web/app/api/v1/income/\[id\]/route.ts apps/web/app/api/calendar/sync-now/route.ts apps/web/app/api/calendar/auto-sync/route.ts apps/web/app/api/settings/calendar/route.ts apps/web/app/api/google/disconnect/route.ts; do
  echo "=== $f ==="
  grep -n "\bdb\.\(select\|insert\|update\|delete\|transaction\|execute\)" "$f" || echo "clean"
done
```
Expected: every file shows `clean`.

- [ ] **Step 4: Full typecheck**

Run: `pnpm --filter @seder/web exec tsc --noEmit 2>&1 | grep -v "income-utils.test" | tail -20`
Expected: no errors in any of the files we modified. The pre-existing `income-utils.test.ts` type error is unrelated and can be ignored.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/api/v1/feedback/route.ts apps/web/app/api/v1/devices/route.ts "apps/web/app/api/v1/devices/[token]/route.ts" apps/web/app/api/v1/settings/route.ts apps/web/app/api/v1/settings/export/route.ts "apps/web/app/api/v1/income/[id]/route.ts" apps/web/app/api/calendar/sync-now/route.ts apps/web/app/api/calendar/auto-sync/route.ts apps/web/app/api/settings/calendar/route.ts apps/web/app/api/google/disconnect/route.ts
git commit -m "feat(rls): wrap user-scoped API route bodies in withUser

Wraps every API route that directly queries user-scoped tables
(not via data.ts helpers) in withUser(userId, ...). Routes that
only delegate to already-wrapped helpers are unchanged.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Wrap the Better Auth signup hook in `lib/auth.ts`

**Why:** Special Case 1 in the spec. The `user.create.after` hook inserts 3 default categories for a new user. This runs inside Better Auth's own DB context, so `app.user_id` is NOT set and the RLS policy on `categories` would deny the insert.

**Files:**
- Modify: `apps/web/lib/auth.ts`

- [ ] **Step 1: Read the current hook**

Run: `sed -n '70,95p' apps/web/lib/auth.ts`
Expected: shows the `databaseHooks.user.create.after` callback that inserts into `schema.categories`.

- [ ] **Step 2: Add the `withUser` import**

Find the existing `import { db } from "@/db/client";` and change to `import { db, withUser } from "@/db/client";`.

- [ ] **Step 3: Wrap the categories insert**

Current shape (around lines 72-87):

```ts
databaseHooks: {
  user: {
    create: {
      after: async (user) => {
        const defaults = [
          { name: "קטגוריה 1", color: "emerald", icon: "Circle", displayOrder: "1" },
          { name: "קטגוריה 2", color: "indigo", icon: "Circle", displayOrder: "2" },
          { name: "קטגוריה 3", color: "slate", icon: "Circle", displayOrder: "3" },
        ];

        await db.insert(schema.categories).values(
          defaults.map((cat) => ({
            userId: user.id,
            ...cat,
          }))
        );

        // Google OAuth users have emailVerified=true at creation — send welcome email immediately
        if (user.emailVerified) {
          void sendWelcomeEmail(user.email, user.name);
        }
      },
    },
  },
},
```

Change to:

```ts
databaseHooks: {
  user: {
    create: {
      after: async (user) => {
        const defaults = [
          { name: "קטגוריה 1", color: "emerald", icon: "Circle", displayOrder: "1" },
          { name: "קטגוריה 2", color: "indigo", icon: "Circle", displayOrder: "2" },
          { name: "קטגוריה 3", color: "slate", icon: "Circle", displayOrder: "3" },
        ];

        await withUser(user.id, async (tx) => {
          await tx.insert(schema.categories).values(
            defaults.map((cat) => ({
              userId: user.id,
              ...cat,
            }))
          );
        });

        // Google OAuth users have emailVerified=true at creation — send welcome email immediately
        if (user.emailVerified) {
          void sendWelcomeEmail(user.email, user.name);
        }
      },
    },
  },
},
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @seder/web exec tsc --noEmit 2>&1 | grep "lib/auth" || echo "lib/auth.ts: clean"`
Expected: `lib/auth.ts: clean`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/auth.ts
git commit -m "feat(rls): wrap Better Auth signup categories insert

The user.create.after hook inserts 3 default categories for
new users. After RLS is enabled on the categories table, this
insert must set app.user_id to satisfy the policy — wrap in
withUser(user.id, ...).

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: Wrap `app/api/cron/overdue-notifications/route.ts` with per-user `withUser`

**Why:** the cron iterates all users and queries their nudges. Two options: `withAdminBypass` (one transaction covers everyone) or `withUser(u.id, ...)` inside the loop (one transaction per user). The per-user approach is more precise — the bypass is never needed — and matches the spec's recommendation.

**Files:**
- Modify: `apps/web/app/api/cron/overdue-notifications/route.ts`

- [ ] **Step 1: Read the current route**

Run: `cat apps/web/app/api/cron/overdue-notifications/route.ts`
Expected: shows the cron handler that fetches all users, then for each user calls `getNudgeSettings`, `fetchNudgeableEntries`, `fetchDismissedNudges`, `markNudgePushed`, and `sendPushToUser`.

- [ ] **Step 2: Decide whether any change is needed**

All of the per-user helper calls (`getNudgeSettings`, `fetchNudgeableEntries`, `fetchDismissedNudges`, `markNudgePushed`, `sendPushToUser`) are already wrapped in `withUser` internally (Tasks 8 and 9). So each call is already transactionally scoped to its userId.

**The only remaining unwrapped query** is the top-level `db.select({ id: user.id }).from(user)` that fetches the user list. That query reads from the Better Auth `user` table, which is NOT under RLS, so it needs no wrapping.

- [ ] **Step 3: Verify no direct user-scoped table queries remain**

Run:
```bash
grep -n "\bdb\." apps/web/app/api/cron/overdue-notifications/route.ts
```
Expected: exactly one match — the `db.select(...).from(user)` call that lists users. This is the Better Auth table, not under RLS, correct to leave unwrapped.

If any match is against `incomeEntries`, `dismissedNudges`, `categories`, `clients`, `user_settings`, `device_tokens`, or `feedback`, STOP and rewrite using the existing helpers (which are already wrapped).

- [ ] **Step 4: Test the grep guard at the file level**

Run:
```bash
grep -nE "\bdb\.(select|insert|update|delete|execute).*from.*(incomeEntries|dismissedNudges|categories|clients|userSettings|deviceTokens|feedback)" apps/web/app/api/cron/overdue-notifications/route.ts || echo "no unwrapped user-scoped queries"
```
Expected: `no unwrapped user-scoped queries`.

- [ ] **Step 5: No commit needed if no change was made**

This task is usually a no-op verification — the wrapped helpers from Tasks 8-9 already cover the cron's DB access. If Step 3 flagged anything that needed rewriting, commit those changes now.

```bash
# Only if you made a change:
git add apps/web/app/api/cron/overdue-notifications/route.ts
git commit -m "feat(rls): overdue-notifications cron uses wrapped helpers only"
```

---

## Task 14: Use `withAdminBypass` in `app/api/v1/settings/account/route.ts`

**Why:** Special Case 3 in the spec. The user self-deletion endpoint deletes across user-scoped AND Better Auth tables in a single transaction. Better Auth deletes don't work inside a `withUser` transaction (wrong scoping). Bypass is semantically correct — the user is deleting their own account.

**Files:**
- Modify: `apps/web/app/api/v1/settings/account/route.ts`

- [ ] **Step 1: Read the current route**

Run: `cat apps/web/app/api/v1/settings/account/route.ts`
Expected: shows a DELETE handler that starts a `db.transaction(...)` and issues 7 deletes (income_entries, categories, clients, user_settings, session, account, user).

- [ ] **Step 2: Add the `withAdminBypass` import**

Change the existing `@/db/client` import to include `withAdminBypass`:
```ts
import { db, withAdminBypass } from "@/db/client";
```

- [ ] **Step 3: Rewrite the transaction**

Current shape:

```ts
await db.transaction(async (tx) => {
  await tx.delete(incomeEntries).where(eq(incomeEntries.userId, userId));
  await tx.delete(categories).where(eq(categories.userId, userId));
  // ... etc
});
```

Change to:

```ts
await withAdminBypass(async (tx) => {
  await tx.delete(incomeEntries).where(eq(incomeEntries.userId, userId));
  await tx.delete(categories).where(eq(categories.userId, userId));
  // ... etc (unchanged)
});
```

The only change is `db.transaction` → `withAdminBypass`. Every `tx.xxx` call inside is unchanged. The `eq(X.userId, userId)` filters MUST stay because they're now the only thing scoping the delete to this user (bypass disables RLS, so without the filter we'd delete everyone's data — catastrophic).

- [ ] **Step 4: Audit the filter presence**

Run:
```bash
grep -n "tx\.delete\|eq(.*userId" apps/web/app/api/v1/settings/account/route.ts
```
Expected: every `tx.delete(...)` line against a user-scoped table has a corresponding `.where(eq(X.userId, userId))`. The Better Auth table deletes (`session`, `account`, `user`) should also filter by userId. Verify visually.

- [ ] **Step 5: Typecheck**

Run: `pnpm --filter @seder/web exec tsc --noEmit 2>&1 | grep "account/route" || echo "account/route.ts: clean"`

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/v1/settings/account/route.ts
git commit -m "feat(rls): account deletion uses withAdminBypass

User self-deletion touches both user-scoped tables and Better
Auth internals in one transaction. Bypass is semantically
correct and avoids the cross-scope complexity of a withUser
wrap. Every delete keeps its eq(X.userId, userId) filter —
with bypass on, those filters are the only thing scoping the
operation.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Wrap `app/admin/actions.ts` and `app/admin/page.tsx` in `withAdminBypass`

**Why:** the admin dashboard reads data across all users (stats, feedback lists, user details). It's legitimately cross-user and needs to bypass RLS.

**Files:**
- Modify: `apps/web/app/admin/actions.ts`
- Modify: `apps/web/app/admin/page.tsx`

- [ ] **Step 1: Read `actions.ts`**

Run: `cat apps/web/app/admin/actions.ts`
Expected: ~300 lines of `"use server"` functions (feedback management, user management, test push, backup trigger, etc.), all gated by `requireAdmin()`.

- [ ] **Step 2: Add the import**

Change the existing `@/db/client` import (or add a new one if absent) to include `withAdminBypass`:
```ts
import { db, withAdminBypass } from "@/db/client";
```

- [ ] **Step 3: Wrap each admin action that queries tables**

For every exported server action that calls `db.xxx`, wrap the body AFTER `requireAdmin()`:

```ts
export async function deleteFeedback(feedbackId: string) {
  await requireAdmin();
  await withAdminBypass(async (tx) => {
    await tx.delete(feedback).where(eq(feedback.id, feedbackId));
  });
}
```

Apply to: `deleteFeedback`, `setFeedbackStatus`, `replyToFeedback`, `getAutoBackupEnabled`, `setAutoBackupEnabled`, `verifyUserEmail`, `deleteUser`, `sendTestPush`, and any other action that touches a user-scoped table.

**Special case — `fetchSentryHealth` and `triggerBackup`:** these don't touch the DB at all (external HTTP calls). Leave unchanged.

**Special case — `deleteUser`:** this already has a large cascade of deletes across 6 tables. Wrap the entire cascade in a single `withAdminBypass`:

```ts
export async function deleteUser(userId: string) {
  await requireAdmin();
  // ... self-deletion guard unchanged ...
  await withAdminBypass(async (tx) => {
    await tx.delete(incomeEntries).where(eq(incomeEntries.userId, userId));
    await tx.delete(categories).where(eq(categories.userId, userId));
    await tx.delete(clients).where(eq(clients.userId, userId));
    await tx.delete(userSettings).where(eq(userSettings.userId, userId));
    await tx.delete(session).where(eq(session.userId, userId));
    await tx.delete(account).where(eq(account.userId, userId));
    await tx.delete(user).where(eq(user.id, userId));
  });
}
```

- [ ] **Step 4: Read `page.tsx`**

Run: `cat apps/web/app/admin/page.tsx`
Expected: a Server Component that runs ~11 parallel `db.select(...)` queries via `Promise.all`, reading across all users.

- [ ] **Step 5: Wrap the Promise.all block in a single `withAdminBypass`**

The existing shape:

```ts
const [a, b, c, ...] = await Promise.all([
  db.select(...).from(feedback)...,
  db.select(...).from(user)...,
  // ...etc
]);
```

Change to:

```ts
import { withAdminBypass } from "@/db/client";

// ... inside the component ...
const [a, b, c, ...] = await withAdminBypass(async (tx) => {
  return Promise.all([
    tx.select(...).from(feedback)...,
    tx.select(...).from(user)...,
    // ...etc
  ]);
});
```

Every `db.` inside the Promise.all becomes `tx.`. The rest of the component body (building `userDetails`, `stats`, rendering) is unchanged.

- [ ] **Step 6: Verify clean**

```bash
grep -n "\bdb\." apps/web/app/admin/actions.ts apps/web/app/admin/page.tsx
```
Expected: only `import { db, withAdminBypass }` lines. No other `db.` references.

Run: `pnpm --filter @seder/web exec tsc --noEmit 2>&1 | grep "admin/" || echo "admin files: clean"`

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/admin/actions.ts apps/web/app/admin/page.tsx
git commit -m "feat(rls): wrap admin dashboard queries in withAdminBypass

Admin dashboard reads data across all users (stats, feedback,
user details) and performs cross-user admin operations (delete,
verify email, reply to feedback). All legitimately need RLS
bypass — use the withAdminBypass wrapper for these paths.

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: Coverage audit — grep every `db/client` importer for unwrapped DB calls

**Why:** this is the only thing standing between us and a silent production break. The spec explicitly chose "no integration tests" — that means this grep is the entire safety net. Do it carefully.

**Files:** none modified; verification only.

- [ ] **Step 1: List every file that imports from `@/db/client`**

Run:
```bash
grep -rln "from \"@/db/client\"" apps/web --include="*.ts" --include="*.tsx"
```
Expected: ~26 files (matches the spec's Call-site inventory).

- [ ] **Step 2: For each file, classify it**

For every file in the list, identify one of the five categories:

| Category | Meaning | What "clean" looks like |
|---|---|---|
| **W** (withUser) | User-scoped, wraps internally | Only `import { db, withUser }` — no direct `db.select/insert/update/delete/transaction/execute` against user-scoped tables |
| **B** (withAdminBypass) | Cross-user admin/cron | Every `db.xxx` is inside a `withAdminBypass` callback |
| **M** (mixed) | Only `lib/auth.ts` | Better Auth writes unwrapped; categories insert is inside `withUser` |
| **N** (no wrap) | Only Better Auth or site_config | `db.xxx` calls only target `user`, `session`, `account`, `verification`, or `site_config` |
| **S** (script) | Standalone script | Runs via `tsx`, not in request lifecycle; out of scope |

- [ ] **Step 3: Run the automated guard**

This one-liner flags any file that directly queries a user-scoped table outside a wrap. (It's not airtight — you can still hide a `db.` call inside a nested function — but it catches the obvious cases.)

```bash
for f in $(grep -rln "from \"@/db/client\"" apps/web --include="*.ts" --include="*.tsx"); do
  if grep -qE "\bdb\.(select|insert|update|delete|transaction|execute)" "$f"; then
    # The file has direct db.xxx calls. Check if any of them target user-scoped tables.
    if grep -qE "\b(incomeEntries|categories|clients|userSettings|deviceTokens|dismissedNudges|feedback)\b" "$f"; then
      echo "REVIEW: $f"
    fi
  fi
done
```

**Expected output, file by file:**

- `app/admin/actions.ts` — REVIEW (expected: all `db.xxx` are Better Auth tables or inside `withAdminBypass`)
- `app/admin/page.tsx` — REVIEW (expected: inside `withAdminBypass`)
- `app/api/v1/settings/account/route.ts` — REVIEW (expected: inside `withAdminBypass`)
- `lib/auth.ts` — REVIEW (expected: Better Auth writes + one `withUser` wrap for categories)

Any other file flagged → investigate. It means you missed a wrap.

- [ ] **Step 4: Manually eyeball each REVIEWED file**

Open each flagged file and confirm that every single `db.select`, `db.insert`, `db.update`, `db.delete`, `db.transaction`, `db.execute` that touches a user-scoped table is either:
- Inside a `withUser(...)` callback, or
- Inside a `withAdminBypass(...)` callback.

If you find one that isn't — fix it now.

- [ ] **Step 5: Verify `withUser` / `withAdminBypass` call count sanity**

Run:
```bash
echo "withUser call sites:"
grep -rn "withUser(" apps/web --include="*.ts" --include="*.tsx" | wc -l
echo "withAdminBypass call sites:"
grep -rn "withAdminBypass(" apps/web --include="*.ts" --include="*.tsx" | wc -l
```
Expected: `withUser` should appear ~30-50+ times (every data.ts helper + every wrapped route body). `withAdminBypass` should appear ~10-15 times (admin actions + admin page + account deletion). If either is drastically lower, you missed files.

- [ ] **Step 6: Full typecheck before moving on**

Run: `pnpm --filter @seder/web exec tsc --noEmit 2>&1 | tail -30`
Expected: only the pre-existing `income-utils.test.ts` error. No new errors.

- [ ] **Step 7: Commit any fixes discovered in Step 4**

If you found missing wraps in Step 4, commit them now with a message like:
```bash
git commit -m "fix(rls): wrap missed <filename> call site"
```

If no fixes were needed, no commit — this task is pure verification.

---

## Task 17: Local end-to-end smoke test

**Why:** the grep audit catches structural issues. This catches semantic ones — does the app still actually work when you click around it.

**Prerequisite:** the migration from Task 4 is still applied to your local dev DB. You have a local `.env.local` pointing at that DB. You have real test data (at least one user with income entries).

**Files:** none modified; verification only.

- [ ] **Step 1: Start the dev server**

Run: `pnpm dev:web`
Expected: server listens on `http://localhost:3001`. No startup errors. No RLS errors in the startup logs.

- [ ] **Step 2: Sign in as a real user**

Open `http://localhost:3001` in a browser. Sign in with email+password or Google OAuth using an existing test user.

Expected: sign-in succeeds. You land on `/income`. The income list shows entries for YOUR user — NOT empty.

**If the income list is empty:** RLS is denying reads. Check the browser network tab for 500 errors. Check the terminal for Postgres policy violation messages. Most likely cause: a helper in `income/data.ts` wasn't wrapped in Task 5. Grep for missed wraps.

- [ ] **Step 3: Create a new income entry**

Click "הוסף הכנסה" (or the plus button). Fill in description, amount, date. Save.

Expected: the entry appears in the list. No errors.

**If save fails:** an `insert` isn't inside a `withUser` wrapper. Check `income/data.ts createIncomeEntry`.

- [ ] **Step 4: Edit that entry**

Click the entry you just created. Change the amount. Save.

Expected: change persists. Page refresh shows the new amount.

**If edit silently fails (UI says saved, value reverts on refresh):** `updateIncomeEntry` isn't wrapped, affecting 0 rows silently. Wrap it.

- [ ] **Step 5: Delete that entry**

Delete it.

Expected: gone from the list. Refresh confirms.

**If delete silently fails:** `deleteIncomeEntry` isn't wrapped.

- [ ] **Step 6: Visit analytics**

Navigate to `/analytics`.

Expected: KPI cards, trend chart, category breakdown — all populated with real data.

**If empty:** one of `getEnhancedTrends`, `getCategoryBreakdown`, `getIncomeAggregatesForMonth`, etc. is unwrapped.

- [ ] **Step 7: Visit clients**

Navigate to `/clients`. Create, edit, delete a test client.

Expected: all three operations work.

- [ ] **Step 8: Visit categories**

Navigate to `/categories`. Create, reorder, delete a test category.

Expected: all operations work.

- [ ] **Step 9: Visit settings**

Navigate to `/settings`. Change the preferred language. Save. Refresh.

Expected: setting persists.

- [ ] **Step 10: Submit feedback**

Use the in-app feedback modal. Submit a test message.

Expected: success toast. Check the `feedback` table via Drizzle Studio — new row present.

- [ ] **Step 11: Visit admin dashboard**

Navigate to `/admin` (must be signed in as the admin email).

Expected: dashboard loads, shows feedback list, user list, KPI cards. ALL users visible (not just yours).

**If admin page shows only your data:** `admin/page.tsx` isn't properly using `withAdminBypass`. Fix Task 15 Step 5.

- [ ] **Step 12: Calendar import (if you have Google connected)**

If your test user has Google Calendar connected, trigger a calendar sync. Events from the current month should import as draft entries.

Expected: import succeeds. New entries appear.

- [ ] **Step 13: Kill the dev server**

Ctrl+C the dev server.

- [ ] **Step 14: Record test results**

If all 12 checks passed — proceed to Task 18.

If any check failed:
1. Identify the unwrapped call site from the failure.
2. Wrap it using the patterns from Tasks 5-15.
3. Commit the fix.
4. Re-run the failed check.
5. Only proceed once ALL checks pass.

This is the last line of defense before prod. Don't shortcut this.

---

## Task 18: Add runbook entry for RLS rollback

**Files:**
- Modify: `docs/RUNBOOK.md`

- [ ] **Step 1: Read the current runbook**

Run: `cat docs/RUNBOOK.md | head -40`
Expected: shows existing sections (deployment, monitoring, common issues).

- [ ] **Step 2: Append a new section**

Add a new section at the end of `docs/RUNBOOK.md`:

```markdown
## RLS On Fire — Emergency Rollback

**Symptom:** After shipping the RLS retrofit, users report:
- Empty income list where they had entries
- "Save" button works but changes don't persist
- New entries fail to create with a 500 error
- A cron (push notifications, backup) stops running

**Diagnosis:** A query path is running outside a `withUser` or `withAdminBypass` wrapper. The RLS policies are denying it.

**Immediate mitigation (under 60 seconds, no redeploy):**

```bash
psql "$DATABASE_URL" -f apps/web/drizzle/rollback_rls.sql
```

Or paste the contents of `apps/web/drizzle/rollback_rls.sql` into the Neon SQL Editor and run.

Effect: RLS is disabled on all 7 tables immediately. The app falls back to the app-layer-only isolation it had before the retrofit. No data loss. The `withUser` / `withAdminBypass` wrappers in the code remain in place and become no-ops.

**After mitigation:**
1. Check Sentry / Vercel logs for the specific failing route.
2. Find the missed wrap (it's almost always a direct `db.select/insert/update/delete` that wasn't converted to `tx`).
3. Open a hotfix PR that wraps it.
4. After the hotfix deploys, re-apply `apps/web/drizzle/0007_enable_rls.sql` to re-enable RLS.

**When NOT to use:** if the issue is an unrelated bug that happens to coincide with the RLS rollout, disabling RLS won't help and will just mask a second bug. Read the Sentry error first — a Postgres "policy check" error confirms RLS is the cause.
```

- [ ] **Step 3: Commit**

```bash
git add docs/RUNBOOK.md
git commit -m "docs(runbook): RLS emergency rollback procedure

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

## Task 19: Pre-merge checklist + open PR

**Files:** none modified in code. This creates the PR.

- [ ] **Step 1: Rebase or verify the branch is clean**

Run: `git status && git log --oneline main..HEAD`
Expected: clean working tree, commits from tasks 1-18 listed in order.

- [ ] **Step 2: Final typecheck**

Run: `pnpm --filter @seder/web exec tsc --noEmit 2>&1 | grep -v "income-utils.test" | tail -20`
Expected: no new errors. The pre-existing test fixture error is the only thing that should appear.

- [ ] **Step 3: Final build**

Run: `pnpm --filter @seder/web build 2>&1 | tail -30`
Expected: build succeeds. No new warnings about unused imports from this PR's changes.

- [ ] **Step 4: Push the branch**

Run: `git push -u origin $(git branch --show-current)`
Expected: branch pushes successfully. Note the remote URL in the output for Step 5.

- [ ] **Step 5: Open the PR via `gh`**

Run:
```bash
gh pr create --title "feat(rls): enable Row-Level Security across user-scoped tables" --body "$(cat <<'EOF'
## Summary

Adds Postgres Row-Level Security as defense-in-depth across 7 user-scoped tables (`income_entries`, `categories`, `clients`, `user_settings`, `device_tokens`, `dismissed_nudges`, `feedback`). If a future query forgets its `userId` filter, the database returns 0 rows instead of leaking data.

This is a big-bang rollout — the migration enables RLS on all 7 tables atomically. Explicit tradeoff (see the Decisions Log in the design spec).

**Spec:** `docs/superpowers/specs/2026-04-14-rls-retrofit-design.md`
**Plan:** `docs/superpowers/plans/2026-04-15-rls-retrofit.md`

## What's in here

- `apps/web/db/client.ts` — `withUser(userId, fn)` and `withAdminBypass(fn)` transaction wrappers
- `apps/web/drizzle/0007_enable_rls.sql` — the migration
- `apps/web/drizzle/rollback_rls.sql` — emergency rollback (60-second revert, no redeploy)
- ~20 files wrapped with `withUser` or `withAdminBypass` (see commit history for the per-file breakdown)
- `docs/RUNBOOK.md` — RLS emergency rollback procedure

## Pre-deploy checklist

- [ ] Spec approved
- [ ] Local smoke test passed (Task 17): sign in, CRUD income, analytics, clients, categories, settings, feedback, admin
- [ ] Coverage audit passed (Task 16): grep-based guard flagged only expected files, all manually reviewed
- [ ] Confirmed rollback script works locally (Task 4)
- [ ] Vercel preview deploy: sign in, create entry, visit admin dashboard

## Post-deploy monitoring

- Watch Sentry for any Postgres policy-check errors in the first 30 minutes
- Spot-check the live app: sign in, create an income entry, visit analytics
- If anything looks off, run `rollback_rls.sql` from the Neon console — the app keeps working with app-layer-only isolation

## Rollback plan

\`\`\`bash
psql "\$DATABASE_URL" -f apps/web/drizzle/rollback_rls.sql
\`\`\`

Takes seconds. No app redeploy needed. Restores pre-RLS behavior (app-layer-only). The wrapper helpers stay in the code as no-ops.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 6: Final gut check**

Read the PR in the GitHub UI. Does the commit list match the task list? Is the description clear? If anything looks off, fix locally and force-push.

---

## Post-merge actions (for future-me)

**Do not include in the PR — these happen after the merge is in main.**

1. **Apply the migration to production.** Neon console or `pnpm db:migrate` against production `DATABASE_URL`. This is the moment RLS is ACTUALLY live in prod. The PR merge alone doesn't apply migrations.

2. **Monitor for 30 minutes.** Sentry + manual spot-check. Sign in as yourself, create an entry, visit analytics, check admin dashboard.

3. **If fire:** run `apps/web/drizzle/rollback_rls.sql` from the Neon console. Debug at leisure.

4. **Update `MEMORY.md`** (auto-memory) with a project note: "RLS is live across 7 tables via withUser/withAdminBypass. Any new query against a user-scoped table MUST go through one of those wrappers, or it returns 0 rows."
