# Apple Developer Tasks

## 1. Privacy Manifest Verification

Upload a build to App Store Connect / TestFlight and verify the privacy manifest (`PrivacyInfo.xcprivacy`) doesn't flag any issues.

- [x] Enroll in Apple Developer Program
- [x] Create App ID in developer portal (auto via Xcode)
- [x] Create provisioning profiles (auto via Xcode automatic signing)
- [x] Archive and upload build from Xcode
- [x] Verify no privacy warnings in App Store Connect

## 2. TestFlight Beta

- [x] Upload first build to TestFlight
- [ ] Add beta testers (external group created, pending beta review)
- [ ] Create APNs key in developer portal
- [ ] Test push notifications with production APNs
- [ ] Test Google OAuth flow on real device (not simulator)
- [ ] Test Sentry crash reporting in TestFlight build

## 3. App Store Submission

- [ ] Prepare App Store listing (screenshots, description in Hebrew)
- [ ] Set pricing (free)
- [ ] Submit for review
- [ ] Address any review feedback

## 4. Production iOS Config

- [x] Sentry DSN hardcoded in release scheme (production environment)
- [x] API base URL points to `sedder.app`
- [x] No DEBUG-only Sentry test button (never existed)
- [ ] Test rate limiting error display (429 handling)
- [x] Encryption compliance key added (`ITSAppUsesNonExemptEncryption = NO`)
- [x] App icon alpha channels removed (all 13 icons)
