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

### Mobile App (EAS Build)

```bash
cd apps/mobile
eas build --platform ios --profile production
eas submit --platform ios
```

Bundle ID: `com.bareloved.seder`

## Architecture Overview

```
Mobile App (Expo)
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

### Database
- **Neon Console**: Check connection pooling, query performance
- **Drizzle Studio**: `pnpm db:studio` for data inspection

### Push Notifications
- Cron endpoint: `POST /api/v1/cron` (requires `CRON_SECRET` header)
- Device tokens stored in `devices` table

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

### iOS build sandbox error
The project includes a custom plugin at `apps/mobile/plugins/disable-script-sandboxing` to work around Xcode sandbox restrictions. If builds fail:
1. Clean Xcode derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`
2. Rebuild: `npx expo prebuild --clean && npx expo run:ios`

### Mobile app stuck on loading
- Ensure `EXPO_PUBLIC_API_URL` points to reachable server
- For simulator: use `http://localhost:3001`
- For device: use your machine's local IP

### Auth token issues (mobile)
Tokens are stored via `expo-secure-store`. Clear with:
```bash
# In the app: Settings > Sign Out
# Or reset simulator: Device > Erase All Content and Settings
```

### Turborepo cache issues
```bash
turbo daemon stop
rm -rf node_modules/.cache/turbo
pnpm dev
```

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

## Security

- All data scoped by `userId` — Row-Level Security (RLS) enabled
- API routes validate Bearer tokens via Better Auth middleware (`apps/web/app/api/v1/_lib/`)
- Google OAuth tokens stored in `account` table, never exposed to client
- Mobile auth tokens in secure storage (`expo-secure-store`)
