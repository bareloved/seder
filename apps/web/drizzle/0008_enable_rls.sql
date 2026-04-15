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
