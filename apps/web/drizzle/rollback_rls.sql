-- Emergency RLS rollback.
-- Run this if a missing withUser/withAdminBypass wrapper causes
-- any feature to silently fail after deploying 0008_enable_rls.
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
-- Re-enabling RLS later: re-run 0008_enable_rls.sql.

ALTER TABLE "income_entries" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "user_settings" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "device_tokens" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "dismissed_nudges" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "feedback" DISABLE ROW LEVEL SECURITY;
