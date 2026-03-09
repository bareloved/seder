# iOS Settings Page Redesign

## Overview
Bring the iOS settings page to full parity with the web app. Replace the minimal current settings (appearance + password + sign out) with a comprehensive grouped list matching native iOS patterns.

## Layout
Single scrollable `List` with `.insetGrouped` style. All sections RTL with `.environment(\.layoutDirection, .rightToLeft)`.

## Sections

### 1. Profile (Header)
Keep existing profile card: avatar (first-letter circle), display name, email.

### 2. Account
- **Change Password** — existing `ChangePasswordView`, keep as-is
- **Change Email** — sheet with current email display, new email field, confirmation. Uses Better Auth `change-email` endpoint.

### 3. Preferences
- **Appearance** — existing dark/light/system picker, keep as-is
- **Currency** — Picker `.menu` style (ILS / USD / EUR). Persisted via `PUT /api/v1/settings`
- **Timezone** — Picker `.menu` style (Asia/Jerusalem default). Same API.
- **Language** — Picker `.menu` style (Hebrew / English). English gets "בקרוב" badge like web.

### 4. Calendar
- **Connection status** row — green/red dot + "מחובר" / "לא מחובר"
- If connected: last sync display + "סנכרון עכשיו" button + "נתק יומן" destructive button
- If not connected: "חבר דרך האתר" text with link opening `sedder.app/settings` in Safari

### 5. Data
- **Export CSV** — tapping opens a sheet:
  - What: segmented picker (Income / Categories / Both)
  - Range: segmented picker (All / This Year / This Month)
  - "Export" button → calls new API endpoint → opens iOS share sheet with CSV file

### 6. Management
- **Categories** — existing navigation link, keep as-is

### 7. Danger Zone
- **Delete Account** — red text row. Tapping shows:
  - First alert: "Are you sure?" with Cancel + destructive "Delete"
  - Second alert: "Type DELETE to confirm" (matching web pattern for safety)
  - Calls new API endpoint → signs out → returns to login

### 8. Sign Out
Keep existing sign-out button with confirmation dialog at bottom.

## New API Endpoints Required

### `POST /api/v1/settings/export`
Export is currently a server action only. Need a REST endpoint for iOS.
- Body: `{ includeIncomeEntries: bool, includeCategories: bool, dateRange: "all" | "thisYear" | "thisMonth" }`
- Response: `{ data: { csv: string } }` (CSV string with BOM for Hebrew)

### `DELETE /api/v1/settings/account`
Account deletion is currently a server action only. Need a REST endpoint.
- No body required (uses authenticated user)
- Response: `{ data: { success: true } }`
- Cascading delete: income entries → categories → clients → sessions → accounts → settings → user

### Calendar Status
Use existing `GET /api/v1/calendar/list` — if it returns `connected: true`, calendar is connected.

## Files to Create/Modify

### New iOS Files
- `Views/Settings/ChangeEmailView.swift` — email change sheet
- `Views/Settings/ExportDataSheet.swift` — CSV export sheet
- `Views/Settings/CalendarSettingsSection.swift` — calendar status + actions (optional, could inline)

### Modified iOS Files
- `Views/Settings/SettingsView.swift` — full redesign with all sections
- `Models/Settings.swift` — extend `UserSettings` with all fields, add `UpdateSettingsRequest` fields

### New Web API Files
- `apps/web/app/api/v1/settings/export/route.ts`
- `apps/web/app/api/v1/settings/account/route.ts`

## RTL Rules
- `.environment(\.layoutDirection, .rightToLeft)` on outermost NavigationStack
- HStack: first item = RIGHT side
- Labels use `.leading` alignment (= right in RTL)
- Picker labels on right, values on left
