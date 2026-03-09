# Cross-Platform Development Guide

Guide for developing features that span both the web app and iOS app.

## Architecture Overview

```
@seder/shared (TypeScript)
    ├── apps/web (Next.js — server + client)
    │     └── app/api/v1/* (REST API)
    └── apps/ios (Swift/SwiftUI — native iOS)
              └── APIClient → REST API
```

- `@seder/shared` is the **single source of truth** for types, schemas, constants, and platform-agnostic business logic
- The web app consumes shared directly via TypeScript imports
- The iOS app is a native Swift consumer of the REST API — its models must match the shared contract
- Run `pnpm sync:contract` to generate `docs/api-contract.json` and `pnpm sync:check-ios` to detect drift

## Adding a New Feature (Checklist)

1. **Define types/schemas** in `packages/shared/src/`
   - Types in `types/` — add to barrel export in `types/index.ts`
   - Schemas in `schemas/` — add to barrel export in `schemas/index.ts`
   - Constants in `constants/` — add to barrel export in `constants/index.ts`
   - Pure logic in `utils/` — add to barrel export in `utils/index.ts`

2. **Add API endpoint** in `apps/web/app/api/v1/`
   - Use shared schemas for validation
   - Return JSON matching shared types

3. **Build web UI**
   - Import types/utils from `@seder/shared` (or from local shim files like `income/types.ts`)
   - Keep Tailwind classes, Lucide icons, `zfd` schemas local to web

4. **Update contract**: `pnpm sync:contract`

5. **Check iOS sync**: `pnpm sync:check-ios`

6. **Update Swift models** in `apps/ios/Seder/Seder/Models/`
   - Add Codable structs matching the contract
   - Add CodingKeys if field names differ

7. **Add iOS ViewModel + Views**
   - ViewModel in `ViewModels/` — calls APIClient
   - Views in `Views/` — SwiftUI

## Modifying an Existing Type

Example: adding a `priority` field to `IncomeEntry`.

### Step 1: Database migration
```sql
ALTER TABLE income_entries ADD COLUMN priority VARCHAR(20) DEFAULT 'normal';
```
Update `apps/web/db/schema.ts` to add the column.

### Step 2: Shared types
In `packages/shared/src/types/income.ts`:
```ts
export interface IncomeEntry {
  // ... existing fields
  priority?: "low" | "normal" | "high" | null;
}
```

### Step 3: Web app
- Update `apps/web/app/income/types.ts` if it has a local override (it keeps `IncomeEntry` local for DB Category compatibility)
- Update `data.ts` queries to select the new column
- Update `actions.ts` to handle the field
- Update components to display/edit it

### Step 4: API routes
- Update `apps/web/app/api/v1/income/route.ts` to include the field in responses

### Step 5: Regenerate contract
```bash
pnpm sync:contract
pnpm sync:check-ios
```

### Step 6: Swift models
In `apps/ios/Seder/Seder/Models/IncomeEntry.swift`:
```swift
struct IncomeEntry: Codable, Identifiable {
    // ... existing fields
    let priority: String?
}
```

### Step 7: iOS UI
Update relevant ViewModels and Views to use the new field.

## TypeScript-to-Swift Type Mapping

| TypeScript | Swift (Codable) | Notes |
|---|---|---|
| `string` | `String` | |
| `number` | `String` | Drizzle numeric columns return strings. Use computed `Double` property. |
| `boolean` | `Bool` | |
| `T \| null` | `T?` | Optional in Swift |
| `T \| undefined` | `T?` | Also optional — API omits undefined fields |
| `Date` | `String` | ISO 8601 string in JSON |
| String union (e.g., `"draft" \| "sent"`) | `enum Foo: String, Codable` | |
| `number` (non-DB, actual number) | `Double` or `Int` | e.g., KPI calculations |

### Important: Numeric columns

Drizzle ORM returns `numeric`/`decimal` columns as **strings** (e.g., `"1234.50"`). The iOS Codable models use `String` and add computed `Double` properties:

```swift
let amountGross: String  // from API
var grossAmount: Double { Double(amountGross) ?? 0 }  // computed
```

## Constants Sync Reference

| Shared Constant | iOS File | iOS Location |
|---|---|---|
| `STATUS_CONFIG` | `Theme.swift` | Status color/label mappings |
| `WORK_STATUS_CONFIG` | `Theme.swift` | Work status styling |
| `MONEY_STATUS_CONFIG` | `Theme.swift` | Money status styling |
| `DEFAULT_CATEGORIES` | `Category.swift` | Default category list |
| `DEFAULT_VAT_RATE` | `IncomeEntry.swift` | Default VAT (18%) |
| `categoryColors` | `Theme.swift` | Color palette |
| `categoryIcons` | `Theme.swift` | SF Symbol mappings |
| `DEFAULT_RULES` | `ClassificationEngine.swift` | Classification rules |
| `MONTH_NAMES` | `Localization` | Hebrew month names |

## Classification Engine Sync

The classification engine exists in two implementations:

1. **TypeScript**: `packages/shared/src/classification/index.ts`
2. **Swift**: `apps/ios/Seder/Seder/Lib/ClassificationEngine.swift`

When modifying classification logic:
- Update the shared TypeScript version first
- Mirror changes in the Swift version
- Ensure `TRANSLATIONS`, `DEFAULT_RULES`, and confidence values match
- Run `pnpm sync:contract` to update the contract with new rules/translations
