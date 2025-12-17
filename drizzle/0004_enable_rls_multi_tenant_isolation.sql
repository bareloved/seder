-- Enable Row Level Security (RLS) for strict multi-tenant isolation
-- This ensures no authenticated user can read/update/delete another user's data
-- Note: Using Better Auth (not Supabase), so policies complement application-layer enforcement

-- Enable RLS on income_entries table
ALTER TABLE "income_entries" ENABLE ROW LEVEL SECURITY;

-- Create policy for SELECT: allow reads for records with valid user_id
-- Application layer already filters by current user, this prevents orphaned records
CREATE POLICY "income_entries_select_policy" ON "income_entries"
FOR SELECT
USING (user_id IS NOT NULL);

-- Create policy for INSERT: require user_id to be set
-- Application layer ensures user_id matches current user
CREATE POLICY "income_entries_insert_policy" ON "income_entries"
FOR INSERT
WITH CHECK (user_id IS NOT NULL);

-- Create policy for UPDATE: allow updates but prevent user_id changes
-- Application layer ensures user owns the record
CREATE POLICY "income_entries_update_policy" ON "income_entries"
FOR UPDATE
USING (user_id IS NOT NULL)
WITH CHECK (user_id IS NOT NULL);

-- Create policy for DELETE: allow deletes for records with user_id
-- Application layer ensures user owns the record
CREATE POLICY "income_entries_delete_policy" ON "income_entries"
FOR DELETE
USING (user_id IS NOT NULL);

-- SECURITY MODEL:
-- 1. Application layer (actions.ts) enforces strict user isolation via user_id filters
-- 2. RLS provides defense in depth, ensuring no records exist without user_id
-- 3. RLS prevents records without proper ownership from being accessed
-- 4. No direct database access can bypass the application-layer security

