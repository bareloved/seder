# Add Google Sign-In to iOS App

## Overview

Add Google OAuth sign-in to the iOS app using the native Google Sign-In SDK. This includes a new backend endpoint for token exchange, SDK integration in the iOS app, and UI changes to the sign-in/sign-up screens.

**Calendar scope** will be requested during sign-in (matching the web app).

## Prerequisites (User Action Required)

Before or after implementation, you'll need to create an **iOS OAuth Client ID** in Google Cloud Console:
1. Go to [Google Cloud Console](https://console.cloud.google.com) > APIs & Credentials
2. Click "Create Credentials" > "OAuth 2.0 Client ID"
3. Select **iOS** as the application type
4. Set Bundle ID to `com.bareloved.seder`
5. Save the **iOS Client ID** (format: `xxx.apps.googleusercontent.com`)
6. The **reversed client ID** (format: `com.googleusercontent.apps.xxx`) is needed for the URL scheme

The iOS Client ID will need to be added to the Swift code (`GoogleSignInService.swift`) and the URL scheme added to the Xcode project.

## Implementation Steps

### Step 1: Create Backend Token Exchange Endpoint

**New file:** `apps/web/app/api/v1/auth/google-signin/route.ts`

Create `POST /api/v1/auth/google-signin`:
- Accepts `{ idToken: string }` body
- Verifies the ID token with Google's tokeninfo API
- Finds or creates a user via Better Auth's internal API (`auth.api`)
- Links Google account in the `account` table (stores access token, refresh token if available)
- Creates a bearer session token
- Returns `{ user, session: { token } }` matching existing `SignInResponse` format

### Step 2: Add Google Sign-In SDK to iOS

- Add `google-signin-ios` SPM package to `Seder.xcodeproj` (must be done in Xcode)
- Add URL scheme for the reversed iOS client ID in Xcode target > Info > URL Types
- Create `GoogleSignInService.swift` — wraps the SDK setup and sign-in flow
- Handle OAuth URL callback in `SederApp.swift`

### Step 3: Add `signInWithGoogle()` to AuthViewModel

In `AuthViewModel.swift`, add:
```swift
func signInWithGoogle() async {
    // 1. Call GoogleSignInService to present sign-in UI
    // 2. Get idToken from Google Sign-In result
    // 3. POST idToken to /api/v1/auth/google-signin
    // 4. Store bearer token in Keychain
    // 5. Set user, isAuthenticated = true
}
```

### Step 4: Add Google Sign-In Button to Auth Views

In both `SignInView.swift` and `SignUpView.swift`:
- Add a divider with "או" (or) text
- Add "התחברות עם Google" button with Google icon
- Consistent with existing RTL Hebrew UI styling

### Step 5: Add Supporting Models and API Methods

- `GoogleSignInRequest` struct in `User.swift`
- Google sign-in method in `APIClient.swift`

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `apps/web/app/api/v1/auth/google-signin/route.ts` | Create | Backend token exchange endpoint |
| `apps/ios/Seder/Seder/Services/GoogleSignInService.swift` | Create | Wraps Google Sign-In SDK |
| `apps/ios/Seder/Seder/SederApp.swift` | Modify | Handle Google Sign-In URL callback |
| `apps/ios/Seder/Seder/ViewModels/AuthViewModel.swift` | Modify | Add `signInWithGoogle()` method |
| `apps/ios/Seder/Seder/Views/Auth/SignInView.swift` | Modify | Add Google button + divider |
| `apps/ios/Seder/Seder/Views/Auth/SignUpView.swift` | Modify | Add Google button + divider |
| `apps/ios/Seder/Seder/Services/APIClient.swift` | Modify | Add google-signin request |
| `apps/ios/Seder/Seder/Models/User.swift` | Modify | Add GoogleSignInRequest model |

**Note:** Adding the GoogleSignIn SPM dependency and URL scheme to the Xcode project (`project.pbxproj`) requires Xcode. The code changes will be committed, and instructions provided for the Xcode configuration steps.

## Edge Cases Handled

- **Account linking**: If user signed up with email, then signs in with Google (same email), accounts are linked
- **Existing Google user**: Returns existing session, doesn't create duplicate
- **Invalid token**: Returns 401 with descriptive error
- **Network errors**: Standard APIClient error handling applies
- **Loading state**: Google button disabled during sign-in, shows spinner
