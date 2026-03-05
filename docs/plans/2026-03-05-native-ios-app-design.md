# Native Swift iOS App — Design Document

## Overview

Replace the Expo/React Native mobile app with a native Swift/SwiftUI iOS app. The app communicates with the existing Next.js REST API at `https://sedder.app/api/v1/*`. No backend changes required (except APNs support for push notifications).

## Tech Stack

- **Language**: Swift 5.9+
- **UI Framework**: SwiftUI
- **Minimum iOS**: 16.0
- **Charts**: Swift Charts (built-in)
- **Networking**: URLSession + async/await
- **State**: @Observable (iOS 17+), fallback ObservableObject
- **Secure Storage**: Keychain Services
- **Push Notifications**: Native APNs
- **Third-party dependencies**: None

## Why Native Swift

- RTL/Hebrew works automatically via system locale — no hacks
- Full access to iOS APIs without bridges
- Better performance and smaller binary
- No React Native / Expo build complexity
- Apple's recommended approach for iOS development

## App Structure

```
apps/ios/Seder/
├── SederApp.swift                    # Entry point, root navigation
├── Info.plist
├── Models/
│   ├── IncomeEntry.swift
│   ├── Category.swift
│   ├── Client.swift
│   ├── AnalyticsData.swift
│   └── User.swift
├── Services/
│   ├── APIClient.swift               # Central HTTP client
│   ├── AuthService.swift             # Login, signup, token refresh
│   ├── KeychainService.swift         # Token storage
│   └── NotificationService.swift     # APNs registration
├── ViewModels/
│   ├── AuthViewModel.swift
│   ├── IncomeViewModel.swift
│   ├── AnalyticsViewModel.swift
│   ├── ClientsViewModel.swift
│   ├── CategoriesViewModel.swift
│   └── SettingsViewModel.swift
├── Views/
│   ├── Auth/
│   │   ├── SignInView.swift
│   │   └── SignUpView.swift
│   ├── Income/
│   │   ├── IncomeListView.swift      # Main list + filters + month picker
│   │   ├── IncomeEntryRow.swift      # Single entry row
│   │   └── IncomeFormSheet.swift     # Add/edit entry sheet
│   ├── Analytics/
│   │   ├── AnalyticsView.swift       # KPI cards + chart tabs
│   │   └── ChartViews.swift          # Revenue, category, trend charts
│   ├── Clients/
│   │   └── ClientsView.swift         # Client list + add/edit
│   ├── Categories/
│   │   └── CategoriesView.swift      # List with drag-to-reorder
│   ├── Calendar/
│   │   └── CalendarImportView.swift  # Google Calendar import trigger
│   ├── Settings/
│   │   ├── SettingsView.swift        # Main settings
│   │   └── ChangePasswordView.swift
│   └── Components/
│       ├── MonthPicker.swift
│       ├── StatusBadge.swift
│       ├── CurrencyText.swift        # ILS formatting
│       ├── LoadingView.swift
│       └── EmptyStateView.swift
└── Resources/
    ├── he.lproj/Localizable.strings
    └── Assets.xcassets
```

## Navigation

**Tab Bar (4 tabs):**
1. הכנסות (Income) — default tab
2. אנליטיקס (Analytics)
3. לקוחות (Clients)
4. הוצאות (Expenses)

**Modal presentations:**
- Add/edit income entry (sheet)
- Categories management (full screen modal)
- Calendar import (sheet)
- Settings (push navigation from profile button)

## Authentication

1. Email/password sign-in → `POST /api/auth/sign-in/email`
2. API returns session token + user data
3. Token stored in iOS Keychain
4. All subsequent requests include `Authorization: Bearer <token>`
5. On 401 → clear Keychain, navigate to sign-in
6. Sign-up via `POST /api/auth/sign-up/email`

## API Communication

Central `APIClient` class handles:
- Base URL configuration (`https://sedder.app`)
- Auth header injection from Keychain
- JSON encoding/decoding with snake_case ↔ camelCase mapping
- Error handling (network errors, 401, 4xx, 5xx)
- Generic request method: `func request<T: Decodable>(endpoint:method:body:) async throws -> T`

### Key Endpoints

| Feature | Method | Endpoint |
|---------|--------|----------|
| Sign in | POST | `/api/auth/sign-in/email` |
| Sign up | POST | `/api/auth/sign-up/email` |
| Income list | GET | `/api/v1/income?month=YYYY-MM` |
| Create income | POST | `/api/v1/income` |
| Update income | PUT | `/api/v1/income/:id` |
| Delete income | DELETE | `/api/v1/income/:id` |
| Analytics | GET | `/api/v1/analytics?month=YYYY-MM` |
| Categories | GET/POST/PUT/DELETE | `/api/v1/categories` |
| Reorder categories | PUT | `/api/v1/categories/reorder` |
| Clients | GET | `/api/v1/clients` |
| Calendar import | POST | `/api/v1/calendar/import` |
| Settings | GET/PUT | `/api/v1/settings` |
| Change password | POST | `/api/auth/change-password` |
| Register device | POST | `/api/v1/devices` |

## Data Flow

```
View (SwiftUI) → ViewModel (@Observable) → APIClient → REST API
     ↑                    |
     └────── @Published state ──┘
```

- ViewModels are `@Observable` classes
- Views observe ViewModels via `@State` or `@Environment`
- All API calls are `async throws`
- Pull-to-refresh on list views
- No local cache — always fetch fresh (simplicity first)

## RTL / Hebrew

- App primary language set to Hebrew in Xcode project settings
- SwiftUI automatically mirrors layout for RTL languages
- `Localizable.strings` in `he.lproj/` for all UI text
- `Environment(\.layoutDirection)` available if manual adjustments needed
- No plugins, no hacks — it just works

## Dark Mode

- Follows iOS system setting by default
- Manual override toggle in Settings, stored in UserDefaults
- SwiftUI `@Environment(\.colorScheme)` + `.preferredColorScheme()` modifier

## Push Notifications

- Register with APNs on app launch (after auth)
- Send device token to `POST /api/v1/devices`
- Backend change needed: add APNs sending alongside existing Expo Push
- Uses native `UNUserNotificationCenter`

## Google Calendar Import

- User taps "Import from Calendar" button
- Opens `ASWebAuthenticationSession` for Google OAuth
- OAuth handled server-side (tokens stored in DB)
- App calls `POST /api/v1/calendar/import` to trigger import
- Imported entries appear in income list

## Build Phases

### Phase 1: Foundation + Auth + Income (core)
- Xcode project setup
- APIClient, KeychainService, AuthService
- Sign in / Sign up screens
- Income list, add/edit/delete
- Month picker, filters, sorting
- Tab bar navigation

### Phase 2: Analytics + Categories + Clients
- Analytics KPI cards and charts
- Categories CRUD with drag-to-reorder
- Clients list

### Phase 3: Calendar + Settings + Polish
- Google Calendar import
- Settings (profile, dark mode, change password)
- Push notifications
- Expenses tab
- Error states, empty states, loading states
- App icon, splash screen

## What Gets Removed

- `apps/mobile/` — entire Expo/React Native app
- All Expo-related config and plugins
- React Native dependencies from root package.json (if any)

## Bundle Identifier

Keep existing: `com.bareloved.seder`
