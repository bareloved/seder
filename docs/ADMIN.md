# Admin Dashboard

The admin dashboard is available at `/admin` and is restricted to the app owner (`bareloved@gmail.com`). Any other user attempting to access it is redirected to `/income`.

## Tabs

### סקירה (Overview)

KPI cards showing:
- Total users
- New users this week
- Active users this month (users who created entries)
- Unread feedback count

Quick links to external dashboards:
- Sentry (error tracking)
- Vercel Analytics (web analytics)
- Neon Console (database)
- Upstash Dashboard (Redis / rate limiting)
- Google Cloud Console (OAuth, Calendar API)

DB Backup section with a manual "גיבוי עכשיו" button that creates a Neon branch backup. Keeps a maximum of 3 backup branches — automatically deletes the oldest before creating a new one.

### משוב (Feedback)

All user feedback submitted from the web or iOS app, stored in the `feedback` database table.

- Filter by status: all / new / read / replied
- Click a row to expand and see the full message
- Expanding an unread message automatically marks it as read
- Reply textarea sends an email to the user via Resend and marks the feedback as "replied"
- Previous replies are shown inline

### משתמשים (Users)

Table of all registered users showing:
- Name and avatar
- Email (with verified checkmark)
- Signup date
- Number of income entries

## Access Control

Access is controlled by checking `session.user.email === "bareloved@gmail.com"` in both the server component (`page.tsx`) and server actions (`actions.ts`). There is no admin role in the database — it's a simple hardcoded check.

## Files

- `app/admin/page.tsx` — Server component with auth check and data fetching
- `app/admin/AdminPageClient.tsx` — Client component with tabs, filters, and interactions
- `app/admin/actions.ts` — Server actions: mark as read, reply to feedback, trigger backup
- `db/schema.ts` — `feedback` table definition
- `app/api/v1/feedback/route.ts` — Feedback API (stores in DB instead of sending email)
- `app/api/cron/backup/route.ts` — Backup endpoint (creates Neon branch, rotates old backups)

## Environment Variables

Required for full functionality:
- `NEON_API_KEY` — Neon API token for backups
- `NEON_PROJECT_ID` — Neon project ID
- `CRON_SECRET` — Auth token for the backup cron endpoint
- `RESEND_API_KEY` — For sending reply emails to users
