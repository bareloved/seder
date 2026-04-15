# RLS Retrofit — Defense-in-Depth Multi-Tenant Isolation

**Status:** Design approved, ready for implementation plan
**Date:** 2026-04-14
**Related:** Follow-up to the security hardening batch (PR #58, merged 2026-04-13)

## Context

Seder is a multi-tenant app: every user's income entries, clients, categories, etc. are scoped by `userId`. Today, tenant isolation is enforced **entirely at the application layer** — every Drizzle query includes an `eq(table.userId, userId)` filter. The database itself has no enforcement. A single missed filter, a bad `JOIN` during a refactor, a cron job that accidentally pulls cross-user data — any of these becomes a cross-tenant data leak with no safety net.

This spec adds **Postgres Row-Level Security** as a second line of defense. Even if a future query forgets its `userId` filter, the database will return zero rows instead of leaking data.

A previous attempt at this exists (`apps/web/drizzle/0004_enable_rls_multi_tenant_isolation.sql`) but was never applied and its policies were toothless (`USING (user_id IS NOT NULL)` grants read access to any row with a user_id set — no isolation). **We are not building on that work** — we're replacing it.

### Non-goals

- **Not a compromise-resistant design.** The threat model (decided explicitly, see Decisions Log) is "defense in depth against my own future bugs," not "assume SQL injection is possible." We use the existing DB user (no separate `seder_app` role with `NOBYPASSRLS`), and the admin bypass is a simple GUC flag — not a separate role. A leaked `DATABASE_URL` or SQL injection still constitutes a full breach. Hardening beyond that is a separate future effort.
- **Not touching Better Auth tables.** `user`, `session`, `account`, `verification` are managed by Better Auth, which writes to them directly without going through our wrapper. RLS on these would break signup/login immediately.
- **Not adding integration tests.** (See Decisions Log — this was an explicit tradeoff.)

## Decisions Log (for future-me)

These were locked in brainstorming with the user on 2026-04-14:

1. **Threat model: defense-in-depth against own bugs**, not SQL-injection-resistant. Uses the existing DB user; admin bypass is a GUC flag, not a separate role.
2. **Rollout style: big-bang** (single PR, enables RLS on all 7 tables atomically). No phased rollout. Explicit tradeoff against the more conservative table-by-table approach — user accepted the blast radius because failure modes are non-destructive.
3. **No integration tests.** No Postgres-in-CI cross-tenant isolation test suite. Explicitly deferred. Safety rests on: (a) manual pre-merge coverage audit of all 26 `db/client` importers, (b) a committed `rollback.sql` that can disable RLS in under 60 seconds, (c) Sentry monitoring post-deploy.

These are deliberate tradeoffs made for shipping velocity. Future-me: don't assume gaps here are oversights.

## Core architecture

### The wrapper

A single helper in `apps/web/db/client.ts`:

```ts
export async function withUser<T>(
  userId: string,
  fn: (tx: PgTransaction) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.user_id = ${userId}`);
    return fn(tx);
  });
}
```

Key properties:

- **`SET LOCAL`** scopes the setting to the transaction. Auto-cleared on commit or rollback. Impossible to leak the userId between requests via connection pooling.
- **The `db` Pool is shared.** No separate "RLS-aware" Drizzle instance. The same `db` connects, but queries inside the transaction see the GUC.
- **Callback receives `tx`**, not `db`. Any query run on `tx` runs inside the transaction with the GUC set. Any query accidentally run on the outer `db` runs outside the transaction and fails the policy → returns 0 rows (loud failure).

### The bypass

A parallel helper for cron/admin/RISC paths that operate across users:

```ts
export async function withAdminBypass<T>(
  fn: (tx: PgTransaction) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.bypass_rls = 'on'`);
    return fn(tx);
  });
}
```

Same transaction-scoped pattern. Call sites that need this are audited below and listed by name.

### The policies

For each of the 7 user-scoped tables, one permissive policy covers all operations:

```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY <table>_tenant_isolation ON <table>
  USING (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  )
  WITH CHECK (
    user_id = current_setting('app.user_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );
```

**Why a single policy per table instead of separate SELECT/INSERT/UPDATE/DELETE policies:** simpler to reason about, same semantics, fewer things to maintain. The `USING` clause controls which rows are visible to SELECT/UPDATE/DELETE; the `WITH CHECK` clause prevents INSERT/UPDATE from producing rows that violate the policy.

**The `true` arg to `current_setting`:** makes it return NULL instead of throwing when the GUC is unset. If a query runs outside any wrapper transaction, both GUCs are NULL, the whole expression evaluates to NULL (not true), and the policy denies — the loud failure mode we want.

**`FORCE ROW LEVEL SECURITY` is required.** By default Postgres exempts table owners from RLS policies, and Seder's app connects using the DB owner role (via `DATABASE_URL`). Without `FORCE`, the policies would be skipped entirely and the GUCs would be meaningless — no enforcement at all. Every table enables RLS with `ALTER TABLE <table> FORCE ROW LEVEL SECURITY;` so the app user is subject to its own policies, and the `app.bypass_rls` GUC is the sole intended escape hatch.

## Tables to cover

Seven tables with `userId` columns (excluding Better Auth internals):

| Table | userId column | Notes |
|---|---|---|
| `income_entries` | `user_id text NOT NULL` | Primary data, highest query volume |
| `categories` | `user_id text NOT NULL` | Written by Better Auth signup hook (see Special Cases) |
| `clients` | `user_id text NOT NULL` | |
| `user_settings` | `user_id text PK` | PK is userId (one row per user) |
| `device_tokens` | `user_id text NOT NULL` | ON DELETE CASCADE |
| `dismissed_nudges` | `user_id text NOT NULL` | ON DELETE CASCADE |
| `feedback` | `user_id text NOT NULL` | ON DELETE CASCADE |

Excluded from RLS:
- **Better Auth tables** (`user`, `session`, `account`, `verification`) — managed directly by Better Auth, which does not use our wrapper. Enabling RLS would break authentication immediately.
- **`site_config`** — no user_id, admin-only, already isolated by app-layer admin checks.

## Call-site inventory

Exhaustive audit of every file that imports from `@/db/client`. Each is categorized by how it needs to be migrated:

**Category W — Wrap with `withUser(userId, ...)`:**
- `app/income/data.ts` — 30+ functions, all already take `userId`. Wrap internally so callers don't change.
- `app/clients/data.ts` — wrap internally
- `app/categories/data.ts` — wrap internally
- `lib/nudges/queries.ts` — wrap internally (each function takes userId)
- `app/settings/actions.ts` — wrap each action
- `app/api/v1/feedback/route.ts` — wrap route body
- `app/api/v1/devices/route.ts` — wrap route body
- `app/api/v1/devices/[token]/route.ts` — wrap route body
- `app/api/v1/settings/route.ts` — wrap route body
- `app/api/v1/settings/export/route.ts` — wrap route body
- `app/api/v1/settings/account/route.ts` — wrap route body (existing transaction stays, just add SET LOCAL at the top)
- `app/api/v1/income/[id]/route.ts` — wrap route body
- `app/api/calendar/sync-now/route.ts` — wrap route body
- `app/api/settings/calendar/route.ts` — wrap route body
- `app/api/google/disconnect/route.ts` — wrap route body (touches Better Auth `account` — may need bypass, see Special Cases)
- `app/api/calendar/auto-sync/route.ts` — wrap route body
- `app/admin/page.tsx` — (mostly bypass, see Category B)
- `lib/pushNotifications.ts` — wrap (takes userId, queries deviceTokens + userSettings)

**Category B — Wrap with `withAdminBypass(...)`:**
- `app/api/cron/overdue-notifications/route.ts` — iterates all users, queries nudges/entries cross-user. Alternative: iterate users and use `withUser(u.id, ...)` inside the loop (cleaner — no bypass needed). **Use `withUser` per-user in the loop.**
- `app/admin/actions.ts` — `deleteUser`, `verifyUserEmail`, `replyToFeedback`, `sendTestPush`, all admin feedback operations. These operate cross-user → bypass.
- `app/admin/page.tsx` — reads feedback, users, entries across all users → bypass.

**Category N — No wrap needed (touches only Better Auth or `site_config`):**
- `app/api/google/risc/route.ts` — only touches `session` and `account` (Better Auth tables). No RLS on these. Untouched.
- `app/api/cron/backup/route.ts` — only reads `site_config`. No RLS. Untouched.
- `lib/googleTokens.ts` — only touches `account` (Better Auth). Untouched.

**Category M — Mixed (mostly Category N but one specific write needs wrapping):**
- `lib/auth.ts` — Better Auth's own table writes are untouched. But its `user.create.after` hook inserts into `categories` (a user-scoped table) for the new user. That single insert needs a `withUser(user.id, ...)` wrap. See Special Case 1.

**Category S — Scripts (outside request lifecycle):**
- `scripts/backup.ts` — standalone script run from CLI. Won't hit RLS in normal dev/ops flow. If it ever reads user data it'll fail loudly — that's acceptable. No wrap.
- `scripts/check-schema.ts` — schema introspection, no user data. Untouched.

## Special cases

### 1. Better Auth signup hook inserts categories

`lib/auth.ts` has a `user.create.after` hook that inserts 3 default categories for new users. This runs inside Better Auth's own DB context, not ours. If RLS is on `categories`, that insert will fail because `app.user_id` isn't set.

**Fix:** wrap the insert in `withAdminBypass` inside the hook. The hook already has `user.id` available, so strictly speaking we could use `withUser(user.id, ...)` — and we should, because it's more scoped than bypass. Use `withUser`.

```ts
// In lib/auth.ts user.create.after hook:
await withUser(user.id, async (tx) => {
  await tx.insert(schema.categories).values(...);
});
```

### 2. Server Components call data.ts helpers

Next.js Server Components (`app/income/page.tsx`, `app/analytics/page.tsx`, etc.) call functions like `getIncomeEntriesForMonth({ year, month, userId })`. Since we're wrapping those helpers internally in `withUser`, Server Components don't change. They continue calling helpers as-is.

**The tradeoff:** a Server Component that calls 5 different helpers creates 5 separate transactions (one per helper call), not one request-scoped transaction. For Seder's low-traffic scale this is fine. For a higher-traffic app this would be a concern and we'd want a request-scoped transaction via AsyncLocalStorage — but that's a more complex retrofit and is explicitly out of scope.

### 3. The existing transaction in `account/route.ts`

`app/api/v1/settings/account/route.ts` already uses `db.transaction()` for user account deletion (7 sequential deletes). We need to add `SET LOCAL app.user_id = <userId>` as the FIRST statement inside that transaction. Or — because it deletes across user-scoped AND Better Auth tables, and the Better Auth deletes need to NOT be scoped by the GUC — this one should use `withAdminBypass` instead. The user is deleting their own account, so bypass is semantically fine.

### 4. Raw SQL in analytics queries

Some analytics functions in `income/data.ts` use `sql\`...\`` raw fragments for things like `SUM(CASE WHEN ... END)`. These need to run inside the transaction like everything else. Since we're wrapping the whole function in `withUser`, the `sql` fragments execute inside the transaction — no change needed.

## Rollback plan

Committed alongside the migration as `apps/web/drizzle/rollback_rls.sql`:

```sql
ALTER TABLE income_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE dismissed_nudges DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;
```

Can be run from the Neon console, Drizzle Studio, or `psql $DATABASE_URL -f apps/web/drizzle/rollback_rls.sql`. Takes seconds. No app redeploy required. Restores the current behavior (app-layer-only isolation) immediately.

The `withUser` / `withAdminBypass` wrappers remain in the code after rollback — they become no-ops (transaction + GUC set, but no policies enforcing anything). Re-enabling RLS is a single forward migration.

## Failure mode reference

When RLS is active and a query runs outside a `withUser` transaction (i.e., a missed wrapper site):

| Operation | Behavior | User-visible symptom |
|---|---|---|
| `SELECT` | Returns 0 rows | Empty list / missing data |
| `INSERT` | Throws policy violation error | 500 error from the API |
| `UPDATE` | Affects 0 rows | "Save" button looks like it worked but nothing changed |
| `DELETE` | Affects 0 rows | Deletion silently does nothing |

**No operation is destructive.** No data can be corrupted or deleted by a missing wrapper. Worst case: a feature appears broken until the wrapper is added.

## Out of scope / future work

- **Separate `seder_app` DB role with `NOBYPASSRLS`** — would make the policies resistant to SQL injection, not just own-bugs. Requires Neon role management, connection string changes, coordinated rollout.
- **Request-scoped transactions via AsyncLocalStorage** — would let server components call multiple helpers inside a single transaction. Significant Next.js App Router + Server Component integration complexity.
- **Cross-tenant isolation integration tests** — explicitly deferred (see Decisions Log). Worth revisiting if we ever hit a missed-wrapper incident in production.
- **`NOT NULL` constraint on `app.user_id` GUC** — Postgres can't enforce "this setting must be set" as a schema constraint. The loud-failure mode relies on policies denying when it's unset.

## Deliverables

A single PR containing:

1. **Migration** `apps/web/drizzle/0007_enable_rls.sql` — enables RLS, forces it, creates 7 policies
2. **Rollback script** `apps/web/drizzle/rollback_rls.sql`
3. **Wrapper helpers** in `apps/web/db/client.ts` — `withUser`, `withAdminBypass`
4. **Wrapped data helpers** in `app/income/data.ts`, `app/clients/data.ts`, `app/categories/data.ts`, `lib/nudges/queries.ts`
5. **Wrapped route handlers and server actions** per the Call-site inventory
6. **Wrapped Better Auth signup hook** in `lib/auth.ts`
7. **Updated `account/route.ts`** to use `withAdminBypass`
8. **Manual pre-merge QA checklist** (in the PR description) covering all feature flows
9. **Runbook snippet** in `docs/RUNBOOK.md` explaining the rollback command and when to reach for it
