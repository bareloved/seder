# Seder iOS App — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full-featured iOS app for Seder using Expo/React Native in a Turborepo monorepo, with a new REST API layer and shared type packages.

**Architecture:** Turborepo monorepo with `apps/web` (existing Next.js), `apps/mobile` (new Expo), `packages/shared` (types/schemas/constants), and `packages/api-client` (typed HTTP client). The mobile app communicates exclusively through REST API routes added to the Next.js app, which reuse existing `data.ts` functions.

**Tech Stack:** Expo SDK 52+, Expo Router, TanStack Query, ky, expo-secure-store, expo-notifications, react-hook-form, Zod, date-fns, Turborepo, pnpm workspaces.

**Design doc:** `docs/plans/2026-03-03-ios-app-design.md`

---

## Phase 1: Monorepo Foundation

### Task 1: Initialize Turborepo + pnpm Workspaces

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Modify: `package.json` (root — convert to workspace root)

**Step 1: Install pnpm if not already available**

Run: `corepack enable && corepack prepare pnpm@latest --activate`
Expected: pnpm available globally

**Step 2: Create workspace config**

Create `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "db:generate": { "cache": false },
    "db:push": { "cache": false },
    "db:migrate": { "cache": false },
    "db:studio": { "cache": false }
  }
}
```

**Step 4: Convert root package.json to workspace root**

Update root `package.json`:
```json
{
  "name": "seder",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "dev:web": "turbo dev --filter=@seder/web",
    "dev:mobile": "turbo dev --filter=@seder/mobile",
    "build": "turbo build",
    "lint": "turbo lint",
    "test": "turbo test",
    "db:generate": "turbo db:generate --filter=@seder/web",
    "db:push": "turbo db:push --filter=@seder/web",
    "db:migrate": "turbo db:migrate --filter=@seder/web",
    "db:studio": "turbo db:studio --filter=@seder/web"
  },
  "devDependencies": {
    "turbo": "^2"
  },
  "packageManager": "pnpm@9.15.0"
}
```

**Step 5: Commit**

```bash
git add pnpm-workspace.yaml turbo.json package.json
git commit -m "chore: initialize Turborepo monorepo structure"
```

---

### Task 2: Move Web App to apps/web

This is the most delicate task — moving the entire existing Next.js app into `apps/web/` without breaking it.

**Files:**
- Create: `apps/web/` (move all existing app files here)
- Modify: `apps/web/package.json` (rename to `@seder/web`)
- Modify: `apps/web/tsconfig.json` (update paths)
- Modify: `apps/web/drizzle.config.ts` (update paths)

**Step 1: Create apps directory and move web app**

```bash
mkdir -p apps
# Move all app-related files/dirs into apps/web
# Keep root config files (pnpm-workspace.yaml, turbo.json, root package.json)
```

Files to move into `apps/web/`:
- `app/` directory
- `components/` directory
- `db/` directory
- `lib/` directory
- `documents/` directory
- `drizzle/` directory (migrations)
- `public/` directory
- `next.config.js`
- `next-env.d.ts`
- `tsconfig.json`
- `tsconfig.tsbuildinfo`
- `drizzle.config.ts`
- `postcss.config.mjs`
- `tailwind.config.ts`
- `eslint.config.mjs`
- `.env` / `.env.local` (if they exist)
- `vitest.config.ts` (if exists)

Do NOT move: `pnpm-workspace.yaml`, `turbo.json`, root `package.json`, `.git/`, `node_modules/`, `docs/`, `CLAUDE.md`.

**Step 2: Update apps/web/package.json**

- Change `"name"` to `"@seder/web"`
- Keep all dependencies and scripts as-is
- Add workspace dependency stubs (will be filled in Phase 2):
```json
{
  "name": "@seder/web",
  "version": "0.1.0",
  "private": true
}
```

**Step 3: Update apps/web/tsconfig.json paths**

The `@/*` path alias should now resolve relative to `apps/web/`:
```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./*"] }
  }
}
```

**Step 4: Install dependencies from the workspace root**

Run: `cd /path/to/seder && pnpm install`
Expected: pnpm resolves workspace packages and installs dependencies

**Step 5: Verify web app builds and runs**

Run: `pnpm dev:web`
Expected: Next.js dev server starts on localhost:3000 with no errors

Run: `pnpm build --filter=@seder/web`
Expected: Build succeeds

**Step 6: Run existing tests**

Run: `pnpm test --filter=@seder/web`
Expected: All existing tests pass

**Step 7: Commit**

```bash
git add -A
git commit -m "chore: move web app to apps/web in monorepo"
```

---

## Phase 2: Shared Package (`@seder/shared`)

### Task 3: Create @seder/shared Package Scaffold

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

**Step 1: Create package scaffold**

`packages/shared/package.json`:
```json
{
  "name": "@seder/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^4.1.13"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

`packages/shared/src/index.ts`:
```typescript
// Re-export all shared types, schemas, and constants
export * from "./types";
export * from "./schemas";
export * from "./constants";
```

**Step 2: Install**

Run: `pnpm install`

**Step 3: Commit**

```bash
git add packages/shared/
git commit -m "chore: scaffold @seder/shared package"
```

---

### Task 4: Extract Types to @seder/shared

**Files:**
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/types/income.ts`
- Create: `packages/shared/src/types/category.ts`
- Create: `packages/shared/src/types/client.ts`
- Create: `packages/shared/src/types/settings.ts`
- Create: `packages/shared/src/types/calendar.ts`
- Create: `packages/shared/src/types/analytics.ts`

**Step 1: Extract income types**

Copy types from `apps/web/app/income/types.ts` into `packages/shared/src/types/income.ts`:

- `InvoiceStatus` type
- `PaymentStatus` type
- `DisplayStatus` type
- `VatType` type
- `WorkStatus` type
- `MoneyStatus` type
- `FilterType` type
- `IncomeEntry` interface
- `KPIData` interface
- `DEFAULT_VAT_RATE` constant
- `STATUS_CONFIG`, `WORK_STATUS_CONFIG`, `MONEY_STATUS_CONFIG` constants

**Step 2: Extract category types**

From `apps/web/db/schema.ts` type exports and `apps/web/app/categories/schemas.ts`:
- `Category` interface (derived from Drizzle schema)
- `categoryColors` enum values
- `categoryIcons` enum values
- `DEFAULT_CATEGORIES` array

**Step 3: Extract client types**

From `apps/web/app/clients/types.ts`:
- `ClientWithAnalytics` interface
- `DuplicateGroup` type

From `apps/web/db/schema.ts`:
- `Client` interface

**Step 4: Extract settings types**

From `apps/web/db/schema.ts` `userSettings` table:
- `UserSettings` interface

**Step 5: Extract calendar types**

From `apps/web/lib/googleCalendar.ts`:
- `CalendarEvent` interface
- `GoogleCalendar` interface

**Step 6: Extract analytics types**

From `apps/web/app/income/data.ts`:
- `IncomeAggregates` interface
- `MonthPaymentStatus` type

**Step 7: Create barrel export**

`packages/shared/src/types/index.ts`:
```typescript
export * from "./income";
export * from "./category";
export * from "./client";
export * from "./settings";
export * from "./calendar";
export * from "./analytics";
```

**Step 8: Commit**

```bash
git add packages/shared/src/types/
git commit -m "feat(shared): extract domain types to shared package"
```

---

### Task 5: Extract Zod Schemas to @seder/shared

**Files:**
- Create: `packages/shared/src/schemas/index.ts`
- Create: `packages/shared/src/schemas/income.ts`
- Create: `packages/shared/src/schemas/category.ts`
- Create: `packages/shared/src/schemas/client.ts`

**Step 1: Extract income schemas**

From `apps/web/app/income/schemas.ts`:
- `createIncomeEntrySchema` — **Important:** This currently uses `zod-form-data` for FormData parsing. Extract the **core validation schema** (plain Zod, no FormData transforms) for the shared package. The web app can keep its FormData wrapper locally.
- `updateIncomeEntrySchema`

Create pure Zod schemas without FormData dependency:
```typescript
// packages/shared/src/schemas/income.ts
import { z } from "zod";

export const incomeEntrySchema = z.object({
  date: z.string(), // ISO date string
  description: z.string().min(1),
  clientName: z.string().optional(),
  clientId: z.string().uuid().optional(),
  amountGross: z.number().positive(),
  amountPaid: z.number().min(0).optional(),
  vatRate: z.number().min(0).max(100).optional(),
  includesVat: z.boolean().optional(),
  invoiceStatus: z.enum(["draft", "sent", "paid", "cancelled"]).optional(),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).optional(),
  categoryId: z.string().uuid().optional(),
  notes: z.string().optional(),
  calendarEventId: z.string().optional(),
});

export const createIncomeEntrySchema = incomeEntrySchema;
export const updateIncomeEntrySchema = incomeEntrySchema.partial();

export type CreateIncomeEntryInput = z.infer<typeof createIncomeEntrySchema>;
export type UpdateIncomeEntryInput = z.infer<typeof updateIncomeEntrySchema>;
```

**Step 2: Extract category schemas**

From `apps/web/app/categories/schemas.ts`:
- `createCategorySchema`
- `updateCategorySchema`
- `reorderCategoriesSchema`

**Step 3: Extract client schemas**

From `apps/web/app/clients/schemas.ts`:
- `createClientSchema`
- `updateClientSchema`

**Step 4: Create barrel export**

**Step 5: Commit**

```bash
git add packages/shared/src/schemas/
git commit -m "feat(shared): extract Zod validation schemas"
```

---

### Task 6: Extract Constants & Utilities

**Files:**
- Create: `packages/shared/src/constants/index.ts`
- Create: `packages/shared/src/constants/statuses.ts`
- Create: `packages/shared/src/constants/vat.ts`

**Step 1: Extract status constants**

From `apps/web/app/income/types.ts`:
- Invoice status values: `["draft", "sent", "paid", "cancelled"]`
- Payment status values: `["unpaid", "partial", "paid"]`
- `STATUS_CONFIG` (Hebrew labels and colors for each status)
- `WORK_STATUS_CONFIG`, `MONEY_STATUS_CONFIG`

**Step 2: Extract VAT constants**

- `DEFAULT_VAT_RATE = 18`
- VAT type labels (Hebrew)

**Step 3: Commit**

```bash
git add packages/shared/src/constants/
git commit -m "feat(shared): extract constants to shared package"
```

---

### Task 7: Update Web App Imports to Use @seder/shared

**Files:**
- Modify: `apps/web/package.json` (add `@seder/shared` dependency)
- Modify: `apps/web/app/income/types.ts` (re-export from shared)
- Modify: `apps/web/app/income/schemas.ts` (import base from shared)
- Modify: Various files importing from local types

**Step 1: Add workspace dependency**

In `apps/web/package.json`:
```json
{
  "dependencies": {
    "@seder/shared": "workspace:*"
  }
}
```

Run: `pnpm install`

**Step 2: Update import paths**

Update `apps/web/app/income/types.ts` to re-export from shared:
```typescript
// Re-export shared types for backwards compatibility
export { type IncomeEntry, type KPIData, type InvoiceStatus, type PaymentStatus, ... } from "@seder/shared";

// Web-specific types stay here
// ... any types only used by the web app
```

**Important:** This should be done incrementally — update one file, verify the web app still builds, move to the next. Don't update all imports at once.

**Step 3: Verify web app builds**

Run: `pnpm build --filter=@seder/web`
Expected: Build succeeds with no type errors

**Step 4: Run tests**

Run: `pnpm test --filter=@seder/web`
Expected: All tests pass

**Step 5: Commit**

```bash
git add apps/web/ packages/shared/
git commit -m "refactor(web): use @seder/shared for types and schemas"
```

---

## Phase 3: REST API Layer — Auth & Middleware

### Task 8: Create API Middleware (Auth + Error Handling)

**Files:**
- Create: `apps/web/app/api/v1/_lib/middleware.ts`
- Create: `apps/web/app/api/v1/_lib/errors.ts`
- Create: `apps/web/app/api/v1/_lib/response.ts`

**Step 1: Create API error classes**

`apps/web/app/api/v1/_lib/errors.ts`:
```typescript
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(401, message, "UNAUTHORIZED");
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = "Resource") {
    super(404, `${resource} not found`, "NOT_FOUND");
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public details?: unknown) {
    super(400, message, "VALIDATION_ERROR");
  }
}
```

**Step 2: Create response helpers**

`apps/web/app/api/v1/_lib/response.ts`:
```typescript
import { NextResponse } from "next/server";
import { ApiError } from "./errors";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  console.error("Unhandled API error:", error);
  return NextResponse.json(
    { success: false, error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
```

**Step 3: Create auth middleware**

`apps/web/app/api/v1/_lib/middleware.ts`:
```typescript
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "./errors";

export async function requireAuth(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session.user.id;
}
```

**Step 4: Commit**

```bash
git add apps/web/app/api/v1/
git commit -m "feat(api): add REST API middleware, error handling, and auth"
```

---

### Task 9: Income API Routes — Read Operations

**Files:**
- Create: `apps/web/app/api/v1/income/route.ts` (GET, POST)
- Create: `apps/web/app/api/v1/income/[id]/route.ts` (GET, PUT, DELETE)

**Step 1: Write tests for income GET endpoint**

Create test file: `apps/web/app/api/v1/income/__tests__/route.test.ts`

Test cases:
- Returns 401 when not authenticated
- Returns income entries for a given month
- Filters by status, client
- Returns proper pagination metadata

**Step 2: Implement GET /api/v1/income**

`apps/web/app/api/v1/income/route.ts`:
```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { getIncomeEntriesForMonth } from "@/app/income/data";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { searchParams } = request.nextUrl;
    const month = searchParams.get("month"); // "2026-03" format

    if (!month) {
      // Default to current month
      const now = new Date();
      const year = now.getFullYear();
      const m = now.getMonth() + 1;
      const entries = await getIncomeEntriesForMonth({ year, month: m, userId });
      return apiSuccess(entries);
    }

    const [year, m] = month.split("-").map(Number);
    const entries = await getIncomeEntriesForMonth({ year, month: m, userId });
    return apiSuccess(entries);
  } catch (error) {
    return apiError(error);
  }
}
```

**Step 3: Implement POST /api/v1/income**

```typescript
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    // Validate with Zod schema from @seder/shared
    const parsed = createIncomeEntrySchema.parse(body);
    const entry = await createIncomeEntry({ ...parsed, userId });
    return apiSuccess(entry, 201);
  } catch (error) {
    return apiError(error);
  }
}
```

**Step 4: Implement GET/PUT/DELETE /api/v1/income/[id]**

`apps/web/app/api/v1/income/[id]/route.ts`:
- GET: Fetch single entry by ID, verify userId ownership
- PUT: Validate with `updateIncomeEntrySchema`, call `updateIncomeEntry`
- DELETE: Call `deleteIncomeEntry`

**Step 5: Run tests**

Run: `pnpm test --filter=@seder/web`

**Step 6: Commit**

```bash
git add apps/web/app/api/v1/income/
git commit -m "feat(api): add income CRUD REST endpoints"
```

---

### Task 10: Income API Routes — Status Transitions & Batch

**Files:**
- Create: `apps/web/app/api/v1/income/[id]/mark-paid/route.ts`
- Create: `apps/web/app/api/v1/income/[id]/mark-sent/route.ts`
- Create: `apps/web/app/api/v1/income/batch/route.ts`

**Step 1: Implement status transition endpoints**

`mark-paid/route.ts`:
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const entry = await markIncomeEntryAsPaid(id, userId);
    return apiSuccess(entry);
  } catch (error) {
    return apiError(error);
  }
}
```

Similar pattern for `mark-sent`.

**Step 2: Implement batch endpoint**

`batch/route.ts`:
```typescript
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const { action, ids, updates } = body;

    if (action === "delete") {
      const count = await batchDeleteIncomeEntries(ids, userId);
      return apiSuccess({ deletedCount: count });
    }
    if (action === "update") {
      const count = await batchUpdateIncomeEntries(ids, userId, updates);
      return apiSuccess({ updatedCount: count });
    }
    return apiError(new ValidationError("Invalid batch action"));
  } catch (error) {
    return apiError(error);
  }
}
```

**Step 3: Test manually with curl or write API tests**

**Step 4: Commit**

```bash
git add apps/web/app/api/v1/income/
git commit -m "feat(api): add income status transitions and batch operations"
```

---

### Task 11: Analytics API Routes

**Files:**
- Create: `apps/web/app/api/v1/analytics/kpis/route.ts`
- Create: `apps/web/app/api/v1/analytics/trends/route.ts`

**Step 1: Implement KPI endpoint**

Reuses `getIncomeAggregatesForMonth` from `apps/web/app/income/data.ts`.

```typescript
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const month = request.nextUrl.searchParams.get("month");
    const [year, m] = (month || getCurrentMonth()).split("-").map(Number);
    const kpis = await getIncomeAggregatesForMonth({ year, month: m, userId });
    return apiSuccess(kpis);
  } catch (error) {
    return apiError(error);
  }
}
```

**Step 2: Implement trends endpoint**

Reads `getMonthPaymentStatuses` from `apps/web/app/income/data.ts`.

**Step 3: Commit**

```bash
git add apps/web/app/api/v1/analytics/
git commit -m "feat(api): add analytics KPI and trends endpoints"
```

---

### Task 12: Categories API Routes

**Files:**
- Create: `apps/web/app/api/v1/categories/route.ts` (GET, POST)
- Create: `apps/web/app/api/v1/categories/[id]/route.ts` (PUT)
- Create: `apps/web/app/api/v1/categories/reorder/route.ts` (POST)

**Step 1: Implement CRUD**

Reuse functions from `apps/web/app/categories/data.ts`:
- GET: `getUserCategories(userId)`
- POST: `createCategory({ ...body, userId })`
- PUT [id]: `updateCategory({ ...body, id, userId })`

**Step 2: Implement reorder**

POST: `reorderCategories(userId, body.reorders)`

**Step 3: Commit**

```bash
git add apps/web/app/api/v1/categories/
git commit -m "feat(api): add categories REST endpoints"
```

---

### Task 13: Clients API Routes

**Files:**
- Create: `apps/web/app/api/v1/clients/route.ts` (GET, POST)
- Create: `apps/web/app/api/v1/clients/[id]/route.ts` (PUT)

**Step 1: Implement CRUD**

Reuse from `apps/web/app/clients/data.ts`:
- GET: `getUserClients(userId)` (or `getClientsWithAnalytics(userId)` with `?analytics=true` param)
- POST: `createClient({ ...body, userId })`
- PUT [id]: `updateClient({ ...body, id, userId })`

**Step 2: Commit**

```bash
git add apps/web/app/api/v1/clients/
git commit -m "feat(api): add clients REST endpoints"
```

---

### Task 14: Calendar API Routes

**Files:**
- Create: `apps/web/app/api/v1/calendar/events/route.ts` (GET)
- Create: `apps/web/app/api/v1/calendar/import/route.ts` (POST)
- Create: `apps/web/app/api/v1/calendar/list/route.ts` (GET)

**Step 1: Implement calendar list**

Reuse existing `listUserCalendars` from `lib/googleCalendar.ts`. Needs to fetch Google access token from the `account` table for the authenticated user.

**Step 2: Implement events fetch**

Reuse `listEventsForMonth` + `getImportedCalendarEventIds` to mark already-imported events.

**Step 3: Implement import**

Reuse logic from `importSelectedEventsAction` in `apps/web/app/income/actions.ts`.

**Step 4: Commit**

```bash
git add apps/web/app/api/v1/calendar/
git commit -m "feat(api): add calendar REST endpoints"
```

---

### Task 15: Settings API Routes

**Files:**
- Create: `apps/web/app/api/v1/settings/route.ts` (GET, PUT)

**Step 1: Implement settings CRUD**

- GET: Query `userSettings` table for authenticated user
- PUT: Update settings using existing `updateUserSettings` logic

**Step 2: Commit**

```bash
git add apps/web/app/api/v1/settings/
git commit -m "feat(api): add settings REST endpoints"
```

---

### Task 16: Device Tokens — Database + API

**Files:**
- Modify: `apps/web/db/schema.ts` (add `deviceTokens` table)
- Create: `apps/web/app/api/v1/devices/route.ts` (POST)
- Create: `apps/web/app/api/v1/devices/[token]/route.ts` (DELETE)

**Step 1: Add Drizzle schema for device_tokens**

In `apps/web/db/schema.ts`:
```typescript
export const deviceTokens = pgTable("device_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform").notNull(), // 'ios' | 'android'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  uniqueIndex("device_tokens_user_token_idx").on(table.userId, table.token),
]);
```

**Step 2: Generate and run migration**

Run: `pnpm db:generate --filter=@seder/web`
Run: `pnpm db:push --filter=@seder/web`

**Step 3: Implement register/unregister endpoints**

POST `/api/v1/devices`:
```typescript
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const { token, platform } = await request.json();
    await db.insert(deviceTokens).values({ userId, token, platform })
      .onConflictDoNothing();
    return apiSuccess({ registered: true }, 201);
  } catch (error) {
    return apiError(error);
  }
}
```

DELETE `/api/v1/devices/[token]`: Remove token for the authenticated user.

**Step 4: Commit**

```bash
git add apps/web/db/schema.ts apps/web/app/api/v1/devices/ drizzle/
git commit -m "feat(api): add device token registration for push notifications"
```

---

## Phase 4: API Client Package (`@seder/api-client`)

### Task 17: Create @seder/api-client Package

**Files:**
- Create: `packages/api-client/package.json`
- Create: `packages/api-client/tsconfig.json`
- Create: `packages/api-client/src/index.ts`
- Create: `packages/api-client/src/client.ts`
- Create: `packages/api-client/src/income.ts`
- Create: `packages/api-client/src/categories.ts`
- Create: `packages/api-client/src/clients.ts`
- Create: `packages/api-client/src/analytics.ts`
- Create: `packages/api-client/src/calendar.ts`
- Create: `packages/api-client/src/settings.ts`
- Create: `packages/api-client/src/devices.ts`

**Step 1: Create package.json**

```json
{
  "name": "@seder/api-client",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@seder/shared": "workspace:*",
    "ky": "^1"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

**Step 2: Create HTTP client wrapper**

`packages/api-client/src/client.ts`:
```typescript
import ky, { type KyInstance } from "ky";

export interface ApiClientConfig {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}

export function createApiClient(config: ApiClientConfig): KyInstance {
  return ky.create({
    prefixUrl: config.baseUrl,
    hooks: {
      beforeRequest: [
        async (request) => {
          const token = await config.getToken();
          if (token) {
            request.headers.set("Authorization", `Bearer ${token}`);
          }
        },
      ],
    },
  });
}
```

**Step 3: Create domain-specific API modules**

`packages/api-client/src/income.ts`:
```typescript
import type { KyInstance } from "ky";
import type { IncomeEntry, CreateIncomeEntryInput, UpdateIncomeEntryInput } from "@seder/shared";

export function createIncomeApi(client: KyInstance) {
  return {
    list: (month: string) =>
      client.get("api/v1/income", { searchParams: { month } }).json<{ success: true; data: IncomeEntry[] }>(),

    get: (id: string) =>
      client.get(`api/v1/income/${id}`).json<{ success: true; data: IncomeEntry }>(),

    create: (data: CreateIncomeEntryInput) =>
      client.post("api/v1/income", { json: data }).json<{ success: true; data: IncomeEntry }>(),

    update: (id: string, data: UpdateIncomeEntryInput) =>
      client.put(`api/v1/income/${id}`, { json: data }).json<{ success: true; data: IncomeEntry }>(),

    delete: (id: string) =>
      client.delete(`api/v1/income/${id}`).json<{ success: true }>(),

    markPaid: (id: string) =>
      client.post(`api/v1/income/${id}/mark-paid`).json<{ success: true; data: IncomeEntry }>(),

    markSent: (id: string) =>
      client.post(`api/v1/income/${id}/mark-sent`).json<{ success: true; data: IncomeEntry }>(),

    batch: (action: "update" | "delete", ids: string[], updates?: Record<string, unknown>) =>
      client.post("api/v1/income/batch", { json: { action, ids, updates } }).json(),
  };
}
```

Follow the same pattern for `categories.ts`, `clients.ts`, `analytics.ts`, `calendar.ts`, `settings.ts`, `devices.ts`.

**Step 4: Create barrel export**

`packages/api-client/src/index.ts`:
```typescript
export { createApiClient, type ApiClientConfig } from "./client";
export { createIncomeApi } from "./income";
export { createCategoriesApi } from "./categories";
export { createClientsApi } from "./clients";
export { createAnalyticsApi } from "./analytics";
export { createCalendarApi } from "./calendar";
export { createSettingsApi } from "./settings";
export { createDevicesApi } from "./devices";
```

**Step 5: Install and verify**

Run: `pnpm install`
Run: `pnpm build --filter=@seder/api-client` (if using tsc build)

**Step 6: Commit**

```bash
git add packages/api-client/
git commit -m "feat(api-client): create typed REST API client package"
```

---

## Phase 5: Expo App Foundation

### Task 18: Create Expo App with Expo Router

**Files:**
- Create: `apps/mobile/` (entire Expo app scaffold)

**Step 1: Create Expo app**

Run from the repo root:
```bash
cd apps
npx create-expo-app mobile --template tabs
cd ..
```

**Step 2: Update apps/mobile/package.json**

- Change name to `@seder/mobile`
- Add workspace dependencies:
```json
{
  "name": "@seder/mobile",
  "dependencies": {
    "@seder/shared": "workspace:*",
    "@seder/api-client": "workspace:*",
    "@tanstack/react-query": "^5",
    "expo-secure-store": "~14.0.0",
    "expo-notifications": "~0.29.0",
    "react-hook-form": "^7",
    "date-fns": "^4.1.0"
  }
}
```

**Step 3: Install dependencies**

Run: `pnpm install`

**Step 4: Configure RTL**

In `apps/mobile/app/_layout.tsx`:
```typescript
import { I18nManager } from "react-native";

// Force RTL for Hebrew
if (!I18nManager.isRTL) {
  I18nManager.forceRTL(true);
  I18nManager.allowRTL(true);
}
```

**Step 5: Verify Expo app runs**

Run: `cd apps/mobile && npx expo start`
Expected: Expo dev server starts, app loads on simulator

**Step 6: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): scaffold Expo app with Expo Router"
```

---

### Task 19: Set Up TanStack Query + API Client Provider

**Files:**
- Create: `apps/mobile/providers/ApiProvider.tsx`
- Create: `apps/mobile/providers/QueryProvider.tsx`
- Create: `apps/mobile/hooks/useApi.ts`
- Create: `apps/mobile/lib/auth-storage.ts`
- Modify: `apps/mobile/app/_layout.tsx`

**Step 1: Create auth token storage**

`apps/mobile/lib/auth-storage.ts`:
```typescript
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "seder_auth_token";

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
```

**Step 2: Create API provider**

`apps/mobile/providers/ApiProvider.tsx`:
```typescript
import { createContext, useContext, useMemo } from "react";
import { createApiClient, createIncomeApi, createCategoriesApi, createClientsApi, createAnalyticsApi, createCalendarApi, createSettingsApi, createDevicesApi } from "@seder/api-client";
import { getAuthToken } from "../lib/auth-storage";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const ApiContext = createContext<ReturnType<typeof createApis> | null>(null);

function createApis() {
  const client = createApiClient({
    baseUrl: API_BASE_URL,
    getToken: getAuthToken,
  });
  return {
    income: createIncomeApi(client),
    categories: createCategoriesApi(client),
    clients: createClientsApi(client),
    analytics: createAnalyticsApi(client),
    calendar: createCalendarApi(client),
    settings: createSettingsApi(client),
    devices: createDevicesApi(client),
  };
}

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const apis = useMemo(createApis, []);
  return <ApiContext.Provider value={apis}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error("useApi must be used within ApiProvider");
  return ctx;
}
```

**Step 3: Create QueryProvider**

`apps/mobile/providers/QueryProvider.tsx`:
```typescript
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60, retry: 2 },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

**Step 4: Wire providers into root layout**

Update `apps/mobile/app/_layout.tsx` to wrap the app in `QueryProvider` and `ApiProvider`.

**Step 5: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): set up TanStack Query and API client providers"
```

---

### Task 20: Auth Screens (Sign In / Sign Up)

**Files:**
- Create: `apps/mobile/app/(auth)/_layout.tsx`
- Create: `apps/mobile/app/(auth)/sign-in.tsx`
- Create: `apps/mobile/app/(auth)/sign-up.tsx`
- Create: `apps/mobile/hooks/useAuth.ts`
- Modify: `apps/mobile/app/_layout.tsx` (auth redirect logic)

**Step 1: Create auth hook**

`apps/mobile/hooks/useAuth.ts`:
```typescript
import { useState, useEffect, useCallback } from "react";
import { router } from "expo-router";
import { getAuthToken, setAuthToken, clearAuthToken } from "../lib/auth-storage";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    getAuthToken().then((token) => setIsAuthenticated(!!token));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.token) {
      await setAuthToken(data.token);
      setIsAuthenticated(true);
      router.replace("/(tabs)/income");
    }
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await clearAuthToken();
    setIsAuthenticated(false);
    router.replace("/(auth)/sign-in");
  }, []);

  return { isAuthenticated, signIn, signOut };
}
```

**Note:** The exact Better Auth sign-in response shape needs to be verified — check how Better Auth returns session tokens for API (non-browser) clients. May need to use Better Auth's `signIn.email()` client method or adjust the endpoint.

**Step 2: Create sign-in screen**

`apps/mobile/app/(auth)/sign-in.tsx`:
- Hebrew text labels
- Email input (LTR, `dir="ltr"`)
- Password input (LTR)
- Sign in button
- Link to sign-up
- Google OAuth button (using `expo-auth-session`)

**Step 3: Create sign-up screen**

Similar to sign-in with name, email, password, confirm password fields.

**Step 4: Add auth redirect logic to root layout**

Check auth state on mount. If authenticated → redirect to `/(tabs)/income`. If not → redirect to `/(auth)/sign-in`.

**Step 5: Test auth flow on simulator**

Run: `cd apps/mobile && npx expo start --ios`
Expected: App launches, shows sign-in screen, can authenticate against local dev server

**Step 6: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): implement auth screens with Better Auth"
```

---

### Task 21: Tab Navigation Layout

**Files:**
- Create: `apps/mobile/app/(tabs)/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/income/index.tsx` (placeholder)
- Create: `apps/mobile/app/(tabs)/analytics/index.tsx` (placeholder)
- Create: `apps/mobile/app/(tabs)/calendar/index.tsx` (placeholder)
- Create: `apps/mobile/app/(tabs)/settings/index.tsx` (placeholder)

**Step 1: Create tab layout**

`apps/mobile/app/(tabs)/_layout.tsx`:
```typescript
import { Tabs } from "expo-router";
// Use appropriate icons from @expo/vector-icons

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="income"
        options={{
          title: "הכנסות",
          tabBarIcon: ({ color }) => <DollarIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "ניתוח",
          tabBarIcon: ({ color }) => <ChartIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "יומן",
          tabBarIcon: ({ color }) => <CalendarIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "הגדרות",
          tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
```

**Step 2: Create placeholder screens**

Each screen shows a simple Hebrew title text for now.

**Step 3: Verify navigation works**

Run: `cd apps/mobile && npx expo start --ios`
Expected: Tab bar with 4 tabs, navigation between them works, RTL layout

**Step 4: Commit**

```bash
git add apps/mobile/app/
git commit -m "feat(mobile): add tab navigation with 4 tabs"
```

---

## Phase 6: Mobile — Income Feature

### Task 22: Income List Screen

**Files:**
- Create: `apps/mobile/app/(tabs)/income/index.tsx`
- Create: `apps/mobile/components/income/IncomeEntryCard.tsx`
- Create: `apps/mobile/components/income/MonthSelector.tsx`
- Create: `apps/mobile/components/income/KPIRow.tsx`
- Create: `apps/mobile/hooks/useIncomeEntries.ts`

**Step 1: Create useIncomeEntries hook**

```typescript
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../providers/ApiProvider";

export function useIncomeEntries(month: string) {
  const api = useApi();
  return useQuery({
    queryKey: ["income", month],
    queryFn: () => api.income.list(month),
  });
}
```

**Step 2: Create MonthSelector component**

A horizontal month/year selector similar to the web app's month picker. Uses `date-fns` for month formatting in Hebrew.

**Step 3: Create KPIRow component**

Horizontal scrollable row showing: total gross, ready-to-invoice, outstanding, paid this month. Uses `useQuery` with analytics API.

**Step 4: Create IncomeEntryCard component**

Card showing: date, description, client, amount, status badge. Swipeable for quick actions (mark paid, delete).

**Step 5: Create income list screen**

`apps/mobile/app/(tabs)/income/index.tsx`:
- MonthSelector at top
- KPIRow below
- FlatList of IncomeEntryCard items
- Pull-to-refresh
- FAB (floating action button) for quick add

**Step 6: Verify on simulator**

**Step 7: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): implement income list screen with KPIs"
```

---

### Task 23: Income Detail / Edit Screen

**Files:**
- Create: `apps/mobile/app/(tabs)/income/[id].tsx`
- Create: `apps/mobile/components/income/IncomeForm.tsx`
- Create: `apps/mobile/hooks/useIncomeMutations.ts`

**Step 1: Create income mutations hook**

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../providers/ApiProvider";

export function useIncomeMutations() {
  const api = useApi();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: api.income.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["income"] }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => api.income.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["income"] }),
  });

  const remove = useMutation({
    mutationFn: api.income.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["income"] }),
  });

  const markPaid = useMutation({
    mutationFn: api.income.markPaid,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["income"] }),
  });

  return { create, update, remove, markPaid };
}
```

**Step 2: Create IncomeForm component**

Form fields matching the web app:
- Date picker
- Description (text input, RTL)
- Client selector (dropdown)
- Amount gross (numeric input, LTR)
- Amount paid (numeric input, LTR)
- VAT rate (numeric input, LTR)
- Includes VAT toggle
- Category selector (dropdown with colors/icons)
- Notes (multiline text, RTL)
- Invoice status selector
- Payment status selector

Use `react-hook-form` with Zod schema from `@seder/shared`.

**Step 3: Create detail/edit screen**

`apps/mobile/app/(tabs)/income/[id].tsx`:
- If `id === "new"`: show empty form for creation
- Otherwise: fetch entry by ID, populate form
- Save button in header
- Delete button (with confirmation alert)

**Step 4: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): implement income detail/edit screen with form"
```

---

### Task 24: Quick Add Income (FAB + Bottom Sheet)

**Files:**
- Create: `apps/mobile/components/income/QuickAddSheet.tsx`
- Modify: `apps/mobile/app/(tabs)/income/index.tsx` (add FAB)

**Step 1: Create QuickAddSheet**

A bottom sheet with minimal fields for fast entry:
- Date (defaults to today)
- Description
- Client (autocomplete from recent clients)
- Amount gross
- Category

Uses `@gorhom/bottom-sheet` or similar.

**Step 2: Add FAB to income list**

Floating action button in bottom-right (or bottom-left for RTL) that opens the QuickAddSheet.

**Step 3: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): add quick-add income via FAB and bottom sheet"
```

---

## Phase 7: Mobile — Analytics

### Task 25: Analytics Dashboard Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/analytics/index.tsx`
- Create: `apps/mobile/components/analytics/KPICard.tsx`
- Create: `apps/mobile/components/analytics/TrendChart.tsx`
- Create: `apps/mobile/hooks/useAnalytics.ts`

**Step 1: Create useAnalytics hook**

Query both KPI and trends endpoints.

**Step 2: Create KPICard component**

Large card showing a single KPI metric with label, value, and trend indicator.

**Step 3: Create TrendChart component**

Line/bar chart showing monthly trends. Use `react-native-chart-kit` or `victory-native`.

**Step 4: Build analytics screen**

- Month selector at top
- Grid of KPI cards (2x2 or scrollable row)
- Trend chart below
- Pull-to-refresh

**Step 5: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): implement analytics dashboard with charts"
```

---

## Phase 8: Mobile — Calendar Import

### Task 26: Calendar Import Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/calendar/index.tsx`
- Create: `apps/mobile/components/calendar/CalendarEventCard.tsx`
- Create: `apps/mobile/components/calendar/CalendarSelector.tsx`
- Create: `apps/mobile/hooks/useCalendar.ts`

**Step 1: Create useCalendar hook**

```typescript
export function useCalendarEvents(year: number, month: number, calendarIds?: string[]) {
  const api = useApi();
  return useQuery({
    queryKey: ["calendar-events", year, month, calendarIds],
    queryFn: () => api.calendar.events(year, month, calendarIds),
  });
}

export function useCalendars() {
  const api = useApi();
  return useQuery({
    queryKey: ["calendars"],
    queryFn: () => api.calendar.list(),
  });
}
```

**Step 2: Create CalendarSelector**

Dropdown or chip selector to choose which Google Calendars to import from.

**Step 3: Create CalendarEventCard**

Shows event summary, date, time. Checkbox for selection. Grayed out if already imported.

**Step 4: Build calendar screen**

- Google Calendar connection status
- Calendar selector
- Month selector
- List of events with checkboxes
- "Import selected" button at bottom
- Shows count of selected events

**Step 5: Handle Google OAuth**

If user hasn't connected Google, show a "Connect Google Calendar" button that initiates OAuth via `expo-auth-session`.

**Step 6: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): implement calendar import screen"
```

---

## Phase 9: Mobile — Categories, Clients & Settings

### Task 27: Categories Management

**Files:**
- Create: `apps/mobile/app/categories/index.tsx` (modal/stack screen)
- Create: `apps/mobile/components/categories/CategoryItem.tsx`
- Create: `apps/mobile/hooks/useCategories.ts`

**Step 1: Create categories hooks and screen**

- List categories with color/icon
- Create new category (name, color picker, icon picker)
- Edit category
- Archive/unarchive
- Drag to reorder

Access from income form's category selector or from settings.

**Step 2: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): implement categories management"
```

---

### Task 28: Clients Management

**Files:**
- Create: `apps/mobile/app/clients/index.tsx`
- Create: `apps/mobile/components/clients/ClientItem.tsx`
- Create: `apps/mobile/hooks/useClients.ts`

**Step 1: Create clients hooks and screen**

- List clients with analytics (total earned, last gig date)
- Create/edit client
- Archive/unarchive

**Step 2: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): implement clients management"
```

---

### Task 29: Settings Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/settings/index.tsx`
- Create: `apps/mobile/hooks/useSettings.ts`

**Step 1: Build settings screen**

Sections:
- **Account:** Name, email, sign out button
- **Calendar:** Connected Google account, calendar selection, auto-sync toggle
- **Categories:** Link to categories management
- **Clients:** Link to clients management
- **Data:** Export data button
- **Danger zone:** Delete account (with confirmation)

**Step 2: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): implement settings screen"
```

---

## Phase 10: Push Notifications

### Task 30: Mobile — Register for Push Notifications

**Files:**
- Create: `apps/mobile/hooks/usePushNotifications.ts`
- Modify: `apps/mobile/app/_layout.tsx` (register on auth)

**Step 1: Create push notification hook**

```typescript
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useApi } from "../providers/ApiProvider";

export function usePushNotifications() {
  const api = useApi();

  useEffect(() => {
    registerForPush();
  }, []);

  async function registerForPush() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;

    const token = await Notifications.getExpoPushTokenAsync();
    await api.devices.register({
      token: token.data,
      platform: Platform.OS,
    });
  }
}
```

**Step 2: Call hook in root layout after auth**

**Step 3: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): register for push notifications on login"
```

---

### Task 31: Server — Overdue Payment Notification Cron

**Files:**
- Create: `apps/web/app/api/cron/overdue-notifications/route.ts`
- Create: `apps/web/lib/pushNotifications.ts`

**Step 1: Create push notification sender**

`apps/web/lib/pushNotifications.ts`:
```typescript
import { db } from "@/db/client";
import { deviceTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushToUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  const tokens = await db.select().from(deviceTokens).where(eq(deviceTokens.userId, userId));

  const messages: PushMessage[] = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data,
  }));

  // Send via Expo Push API
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
}
```

**Step 2: Create cron handler**

`apps/web/app/api/cron/overdue-notifications/route.ts`:
- Query for income entries where `invoiceStatus = 'sent'` and `paymentStatus = 'unpaid'` and date is past 30 days
- Group by userId
- Send push notification per user with count of overdue entries
- Protected by cron secret header

**Step 3: Commit**

```bash
git add apps/web/lib/pushNotifications.ts apps/web/app/api/cron/
git commit -m "feat(api): add overdue payment push notification cron"
```

---

## Phase 11: Polish & Integration Testing

### Task 32: RTL Polish Pass

**Files:**
- All mobile component files

**Step 1: Review all screens for RTL correctness**

Check:
- Text alignment (should default to right)
- Icon positions (should be end-aligned where appropriate)
- Swipe directions (swipe from left-to-right to reveal actions in RTL)
- Number inputs stay LTR
- Tab bar order (rightmost tab = first tab in RTL)

**Step 2: Fix any RTL issues found**

**Step 3: Commit**

```bash
git commit -m "fix(mobile): RTL layout polish pass"
```

---

### Task 33: Update CLAUDE.md and Documentation

**Files:**
- Modify: `CLAUDE.md` (update commands and architecture docs for monorepo)
- Modify: `documents/APP_OVERVIEW.md`

**Step 1: Update CLAUDE.md**

- Update commands section for Turborepo scripts
- Add mobile app directory documentation
- Document new API routes
- Update architecture section

**Step 2: Update APP_OVERVIEW.md**

- Add mobile app section
- Document REST API
- Update tech stack

**Step 3: Commit**

```bash
git add CLAUDE.md documents/
git commit -m "docs: update documentation for monorepo and mobile app"
```

---

### Task 34: End-to-End API Testing

**Files:**
- Create: `apps/web/app/api/v1/__tests__/` (test files for each endpoint group)

**Step 1: Write API integration tests**

Test each endpoint group:
- Auth flow (sign up → sign in → get token → use token)
- Income CRUD (create → read → update → mark paid → delete)
- Categories CRUD
- Clients CRUD
- Analytics (verify KPI aggregation)
- Settings (get → update → verify)

Use Vitest with fetch calls against the API routes.

**Step 2: Run tests**

Run: `pnpm test --filter=@seder/web`
Expected: All tests pass

**Step 3: Commit**

```bash
git add apps/web/app/api/v1/__tests__/
git commit -m "test(api): add end-to-end API integration tests"
```

---

## Phase Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1-2 | Monorepo foundation (Turborepo + move web app) |
| 2 | 3-7 | Shared package (types, schemas, constants) |
| 3 | 8-16 | REST API layer (all endpoints) |
| 4 | 17 | API client package |
| 5 | 18-21 | Expo app foundation (scaffold, providers, auth, tabs) |
| 6 | 22-24 | Mobile income feature (list, detail, quick add) |
| 7 | 25 | Mobile analytics dashboard |
| 8 | 26 | Mobile calendar import |
| 9 | 27-29 | Mobile categories, clients, settings |
| 10 | 30-31 | Push notifications (mobile + server cron) |
| 11 | 32-34 | Polish, docs, and testing |

**Total: 34 tasks across 11 phases.**

**Critical path:** Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phases 6-9 (parallelizable) → Phase 10 → Phase 11.

Phases 6-9 can be worked on in parallel once the foundation (Phases 1-5) is complete.
