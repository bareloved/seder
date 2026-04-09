# Service Token API Access

Use the Seder API from external apps using a service token.

## Setup

### 1. Generate a token

```bash
openssl rand -hex 32
```

### 2. Add environment variables

Add to your `.env` (and Vercel environment variables for production):

```
SEDER_API_TOKEN=<the generated token>
SEDER_API_USER_ID=<your user ID from the database>
```

To find your user ID, open Drizzle Studio (`pnpm db:studio`) and look up your account in the `user` table.

### 3. Make requests

Include the token in the `Authorization` header:

```bash
curl -H "Authorization: Bearer <your-token>" \
  https://seder.app/api/v1/income?month=2026-03
```

## Available Endpoints

All existing `/api/v1/` endpoints work with the service token:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/income?month=YYYY-MM` | List income entries for a month |
| POST | `/api/v1/income` | Create an income entry |
| GET | `/api/v1/income?clientId=<id>` | Get recent entries for a client |
| GET | `/api/v1/analytics/monthly?year=YYYY` | Monthly analytics |
| GET | `/api/v1/categories` | List categories |
| POST | `/api/v1/categories` | Create a category |
| GET | `/api/v1/clients` | List clients |
| POST | `/api/v1/clients` | Create a client |
| GET | `/api/v1/settings` | Get user settings |

Check `apps/web/app/api/v1/` for the full list of routes and their parameters.

## Response Format

All endpoints return JSON in this shape:

```json
// Success
{ "data": { ... } }

// Error
{ "error": { "code": "ERROR_CODE", "message": "Description" } }
```

HTTP status codes: `200` success, `201` created, `400` validation error, `401` unauthorized, `404` not found.

## Security Notes

- The token grants full access to the associated user's data — treat it like a password.
- Do not commit the token to version control.
- Rotate the token by generating a new one and updating the env var.
- The token only works for the single user specified by `SEDER_API_USER_ID`.
