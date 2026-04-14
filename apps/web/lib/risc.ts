import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const RISC_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";

// Google's discovery doc lists the issuer with a trailing slash, but legacy
// tokens may use the canonical form without one. Accept both.
const RISC_ISSUERS = [
  "https://accounts.google.com",
  "https://accounts.google.com/",
];

const jwks = createRemoteJWKSet(new URL(RISC_JWKS_URL));

export const RISC_EVENT_TYPES = {
  SESSIONS_REVOKED:
    "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
  TOKENS_REVOKED:
    "https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked",
  TOKEN_REVOKED:
    "https://schemas.openid.net/secevent/oauth/event-type/token-revoked",
  ACCOUNT_DISABLED:
    "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
  ACCOUNT_ENABLED:
    "https://schemas.openid.net/secevent/risc/event-type/account-enabled",
  ACCOUNT_CREDENTIAL_CHANGE_REQUIRED:
    "https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required",
  VERIFICATION:
    "https://schemas.openid.net/secevent/risc/event-type/verification",
} as const;

export type RiscEventType =
  (typeof RISC_EVENT_TYPES)[keyof typeof RISC_EVENT_TYPES];

interface RiscSubject {
  subject_type?: string;
  iss?: string;
  sub?: string;
}

export interface RiscEventPayload {
  subject?: RiscSubject;
  reason?: string;
  state?: string;
}

export interface RiscClaims extends JWTPayload {
  events: Record<string, RiscEventPayload>;
  jti: string;
}

function getAcceptedAudiences(): string[] {
  const audiences = new Set<string>();
  if (process.env.GOOGLE_CLIENT_ID) audiences.add(process.env.GOOGLE_CLIENT_ID);
  if (process.env.GOOGLE_IOS_CLIENT_ID)
    audiences.add(process.env.GOOGLE_IOS_CLIENT_ID);
  return [...audiences];
}

export async function verifyRiscToken(token: string): Promise<RiscClaims> {
  const audiences = getAcceptedAudiences();
  if (audiences.length === 0) {
    throw new Error(
      "RISC token verification: no GOOGLE_CLIENT_ID env var configured"
    );
  }
  const { payload } = await jwtVerify(token, jwks, {
    issuer: RISC_ISSUERS,
    audience: audiences,
  });
  if (
    !payload.events ||
    typeof payload.events !== "object" ||
    Array.isArray(payload.events)
  ) {
    throw new Error("RISC token missing or invalid events claim");
  }
  return payload as RiscClaims;
}

export function extractGoogleSub(event: RiscEventPayload): string | null {
  const subject = event.subject;
  if (!subject) return null;
  // Spec uses "iss-sub" (hyphen). Some emitters historically used underscore.
  if (
    subject.subject_type !== "iss-sub" &&
    subject.subject_type !== "iss_sub"
  ) {
    return null;
  }
  if (!subject.iss?.startsWith("https://accounts.google.com")) return null;
  return subject.sub || null;
}
