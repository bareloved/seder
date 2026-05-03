// Bump this date whenever the Terms of Service or Privacy Policy materially changes.
// All consent rows in user_consent reference the version that was active at acceptance time.
// When this changes, existing users' termsAcceptedAt should be cleared so they re-consent.
export const TERMS_VERSION = "2026-05-03";

// Consent log values used by the user_consent table.
export const CONSENT_TYPES = ["terms", "marketing_opt_in", "marketing_opt_out"] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export const CONSENT_SOURCES = [
  "signup_email",
  "signup_google",
  "consent_banner",
  "settings",
] as const;
export type ConsentSource = (typeof CONSENT_SOURCES)[number];
