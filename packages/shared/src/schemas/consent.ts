import { z } from "zod";

// Consent fields submitted at signup time and via the consent interstitial.
// Israeli law requires:
//   1. Explicit acceptance of Terms (`termsAccepted` MUST be literal true).
//   2. Separate, unchecked-by-default opt-in for marketing.
export const consentInputSchema = z.object({
  termsAccepted: z.literal(true, {
    message: "יש לאשר את תנאי השימוש ומדיניות הפרטיות",
  }),
  marketingOptIn: z.boolean(),
});

export type ConsentInput = z.infer<typeof consentInputSchema>;

// Body accepted by POST /api/v1/me/consent (interstitial submit + iOS gate).
// Terms version is set server-side from the shared constant; client only sends booleans.
export const submitConsentSchema = z.object({
  termsAccepted: z.literal(true),
  marketingOptIn: z.boolean(),
});

export type SubmitConsentInput = z.infer<typeof submitConsentSchema>;

// Response from GET /api/v1/me/consent-status used by iOS to decide whether to show the gate.
export const consentStatusSchema = z.object({
  termsAccepted: z.boolean(),
  termsVersion: z.string().nullable(),
  marketingOptIn: z.boolean(),
  currentTermsVersion: z.string(),
});

export type ConsentStatus = z.infer<typeof consentStatusSchema>;
