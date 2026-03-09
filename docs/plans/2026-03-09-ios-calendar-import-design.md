# iOS Calendar Import — Multi-Step Flow

## Overview
Replace the current single-step calendar import in the iOS app with a multi-step flow matching the web app: calendar selection → event preview with smart filtering → import.

## Flow

### Step 1: Calendar & Month Selection
- Fetch Google calendars via `GET /api/v1/calendar/list`
- Show multi-select list of calendars (checkboxes)
- Save selected calendar IDs to UserDefaults for persistence
- Month/year pickers (default to current month from IncomeListView)
- "המשך" (Next) button → proceeds to Step 2
- Handle `connected: false` → show "connect Google" message

### Step 2: Event Preview
- Fetch events via `GET /api/v1/calendar/events?year=X&month=Y&calendarIds=X,Y,Z`
- Fetch classification rules via `GET /api/v1/settings` → `calendarSettings.rules`
- Run client-side classification using rules (keyword matching against event titles)
- Display scrollable list of events:
  - Checkbox (toggle select/deselect)
  - Event title (summary)
  - Date + time
  - Badge: "עבודה" (green) / "אישי" (red) / "יובא" (blue, disabled)
- Auto-select: events where `isWork && confidence >= 0.7 && !alreadyImported`
- Already-imported events: shown with "יובא" badge, checkbox disabled
- Toolbar actions:
  - "בחר הכל עבודה" (Select all work)
  - "נקה בחירה" (Clear selection)
  - "הסתר אישי" toggle (hide/show personal events)
  - Settings gear → opens Rules Manager (Step 3)
- Footer: "ייבא X אירועים" button + "ביטול" (Cancel)
- No client name input — import as drafts

### Step 3: Rules Manager (sub-sheet from Step 2)
- Two tabs: "עבודה" (work) / "אישי" (personal)
- List of keyword badges with X to remove
- Text field to add new keywords
- Fetch rules from server via settings API
- Save rules to server via `PUT /api/v1/settings` with `calendarSettings.rules`
- Hebrew↔English translation pairs (hardcoded mapping, same as web)

## Import Action
- For each selected event, POST to create individual income entries via `POST /api/v1/income`
- Entry defaults: `amountGross: 0`, `invoiceStatus: draft`, `paymentStatus: unpaid`, `notes: "יובא מהיומן"`
- Set `calendarEventId` for deduplication
- On success: dismiss sheet, reload entries, show count toast

## Backend Requirements
None — all endpoints already exist:
- `GET /api/v1/calendar/list` — list Google calendars
- `GET /api/v1/calendar/events` — fetch events with `alreadyImported` flag
- `GET /api/v1/settings` — fetch rules from `calendarSettings.rules`
- `PUT /api/v1/settings` — save rules
- `POST /api/v1/income` — create income entries

Classification runs client-side on iOS (same algorithm as web).

## Data Flow
```
CalendarList API → calendar picker
                      ↓
              month/year + calendarIds
                      ↓
           CalendarEvents API → classify events (client-side rules)
                                        ↓
                               preview list (select/deselect)
                                        ↓
                              create income entries (POST each)
```

## RTL
All views must be RTL. `.environment(\.layoutDirection, .rightToLeft)` on every NavigationStack (outside, not inside).

## Files to Create
- `Views/Calendar/CalendarImportView.swift` — rewrite (step 1 + step 2 navigation)
- `Views/Calendar/EventPreviewView.swift` — step 2 event list
- `Views/Calendar/RulesManagerView.swift` — step 3 rules editor
- `ViewModels/CalendarImportViewModel.swift` — state management for the full flow
- `Models/CalendarEvent.swift` — event model + classification result
- `Lib/ClassificationEngine.swift` — client-side classification logic
