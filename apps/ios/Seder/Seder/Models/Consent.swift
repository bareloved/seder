import Foundation

// Mirrors packages/shared/src/schemas/consent.ts.

nonisolated struct ConsentStatus: Codable, Sendable {
    let termsAccepted: Bool
    let termsVersion: String?
    let marketingOptIn: Bool
    let currentTermsVersion: String
}

nonisolated struct SubmitConsentBody: Encodable, Sendable {
    let termsAccepted: Bool
    let marketingOptIn: Bool
    let source: String  // "signup_email" | "signup_google" | "consent_banner" | "settings"
}
