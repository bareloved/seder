# Apple Developer Tasks

Tasks blocked until Apple Developer Program enrollment ($99/year at developer.apple.com/enroll).

## 1. Privacy Manifest Verification

Upload a build to App Store Connect / TestFlight and verify the privacy manifest (`PrivacyInfo.xcprivacy`) doesn't flag any issues.

- [ ] Enroll in Apple Developer Program
- [ ] Create App ID in developer portal
- [ ] Create provisioning profiles (development + distribution)
- [ ] Archive and upload build from Xcode
- [ ] Verify no privacy warnings in App Store Connect

## 2. TestFlight Beta

- [ ] Upload first build to TestFlight
- [ ] Add beta testers
- [ ] Test push notifications with production APNs
- [ ] Test Google OAuth flow on real device (not simulator)
- [ ] Test Sentry crash reporting in TestFlight build

## 3. App Store Submission

- [ ] Prepare App Store listing (screenshots, description in Hebrew)
- [ ] Set pricing (free)
- [ ] Submit for review
- [ ] Address any review feedback

## 4. Production iOS Config

- [ ] Set Sentry DSN in release scheme (already hardcoded, verify it works)
- [ ] Verify API base URL points to `sedder.app`
- [ ] Remove DEBUG-only Sentry test button (automatic via `#if DEBUG`)
- [ ] Test rate limiting error display (429 handling)
