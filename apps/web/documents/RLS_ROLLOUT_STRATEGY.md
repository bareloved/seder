# Multi-Tenant RLS Rollout Strategy

## Overview
This document outlines the safe rollout strategy for enabling strict multi-tenant isolation using Postgres Row Level Security (RLS) on the income-tracker application.

## Current State Assessment
- ✅ `income_entries` table already has `user_id` column (NOT NULL)
- ✅ All application queries already filter by `userId`
- ✅ No service role bypass mechanisms found
- ✅ Historical data already backfilled with proper `user_id` values
- ✅ RLS now enabled (database-level security enforcement)

## Phase 1: Pre-Rollout Verification (Non-Disruptive)
**Duration:** 1-2 days
**Risk Level:** None

### Tasks:
1. **Run automated tests** (if available) to ensure current functionality works
2. **Manual verification:**
   - Create test users A and B
   - Add data for both users
   - Verify application-level filtering prevents cross-user access
3. **Database backup:** Create full backup of production data
4. **Review migration:** Verify `0004_enable_rls_multi_tenant_isolation.sql` is correct

### Success Criteria:
- All existing functionality works
- Application-level filtering prevents data leakage
- Clean database backup available

## Phase 2: RLS Enablement (High-Risk Window)
**Duration:** 30-60 minutes
**Risk Level:** High (requires immediate rollback if issues)

### Pre-Deployment Checklist:
- [ ] Database backup completed and verified
- [ ] Rollback procedure documented and tested
- [ ] Monitoring alerts configured for auth failures
- [ ] Support team notified of maintenance window
- [ ] Test environment verified with RLS enabled

### Deployment Steps:
1. **Apply RLS migration:**
   ```bash
   npm run db:migrate
   ```

2. **Immediate verification:**
   - Check migration applied successfully
   - Run automated isolation tests
   - Quick manual check: login as test user, verify data access

3. **Monitor for 30 minutes:**
   - Watch application logs for auth errors
   - Monitor database performance
   - Check user reports of access issues

### Rollback Plan (Execute within 5 minutes if issues detected):
1. **Disable RLS temporarily:**
   ```sql
   ALTER TABLE "income_entries" DISABLE ROW LEVEL SECURITY;
   DROP POLICY IF EXISTS "income_entries_select_policy" ON "income_entries";
   DROP POLICY IF EXISTS "income_entries_insert_policy" ON "income_entries";
   DROP POLICY IF EXISTS "income_entries_update_policy" ON "income_entries";
   DROP POLICY IF EXISTS "income_entries_delete_policy" ON "income_entries";
   ```

2. **Verify rollback:**
   - Application should work normally again
   - All users can access their data

3. **Investigate root cause** before attempting re-deployment

## Phase 3: Post-Rollout Verification (24-48 hours)
**Duration:** 2 days
**Risk Level:** Low

### Verification Tasks:
1. **Automated testing:**
   ```bash
   npx tsx scripts/test-multi-tenant-isolation.ts
   ```

2. **Manual testing checklist:**
   - [ ] User A can only see User A's data
   - [ ] User B can only see User B's data
   - [ ] Admin/manager account behaves like normal user
   - [ ] All CRUD operations work for authenticated users
   - [ ] Calendar integration respects isolation
   - [ ] API endpoints properly scoped

3. **Performance monitoring:**
   - Query performance unchanged
   - No increase in auth failures
   - Database load acceptable

4. **User feedback collection:**
   - Monitor support tickets
   - Check user reports for 48 hours

## Success Metrics
- ✅ Zero cross-user data access incidents
- ✅ All existing users can access their historical data
- ✅ No performance degradation
- ✅ Admin/manager behaves as normal user
- ✅ All automated tests pass

## Emergency Contacts
- Database Admin: [contact]
- DevOps: [contact]
- Application Support: [contact]

## Risk Mitigation
1. **Zero-downtime rollback:** RLS can be disabled instantly
2. **Comprehensive testing:** Both automated and manual verification
3. **Gradual rollout:** Start with test environment validation
4. **Monitoring:** Real-time alerts for auth issues
5. **User communication:** Clear messaging about security improvements

## Alternative Rollout Strategies (if needed)

### Option A: Feature Flag Approach
- Add feature flag to conditionally enable RLS
- Enable for 10% of users first
- Gradually increase rollout percentage
- **Pros:** Safer, can rollback per-user
- **Cons:** Complex implementation, requires feature flag infrastructure

### Option B: Blue-Green Deployment
- Deploy new version with RLS to separate database
- Gradually migrate users to new environment
- **Pros:** Complete isolation of risky changes
- **Cons:** Requires duplicate infrastructure, complex user migration

## Post-Implementation Tasks
1. **Remove application-level filtering** (optional cleanup)
2. **Update documentation** to reflect RLS enforcement
3. **Add monitoring** for RLS policy violations
4. **Security audit** to confirm implementation
5. **Team training** on RLS concepts and troubleshooting

