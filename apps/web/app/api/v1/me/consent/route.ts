import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../_lib/middleware";
import { apiError } from "../../_lib/response";
import { withUser } from "@/db/client";
import { user, userConsent } from "@/db/schema";
import { getClientIp, getUserAgent } from "@/lib/ip";
import { CONSENT_COOKIE, CONSENT_COOKIE_MAX_AGE } from "@/lib/consent-cookie";
import { TERMS_VERSION, type ConsentSource } from "@seder/shared";

const SubmitConsent = z.object({
  termsAccepted: z.literal(true, {
    message: "יש לאשר את תנאי השימוש ומדיניות הפרטיות",
  }),
  marketingOptIn: z.boolean(),
  source: z
    .enum(["signup_email", "signup_google", "consent_banner", "settings"])
    .default("consent_banner"),
});

// Records terms acceptance (required) + marketing opt-in (optional) for the
// authenticated user. Updates the user row with the latest snapshot AND writes
// immutable rows to user_consent — the audit log is what we surface in court.
//
// Used by:
//   - web sign-up form (POST after authClient.signUp.email succeeds)
//   - Google OAuth callback (drains pending consent from sessionStorage)
//   - /auth/consent interstitial (existing users / OAuth new users)
//   - iOS sign-up + post-auth ConsentSheet
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = SubmitConsent.parse(body);

    const ip = getClientIp(request);
    const ua = getUserAgent(request);
    const now = new Date();
    const source: ConsentSource = parsed.source;

    await withUser(userId, async (tx) => {
      // Snapshot on the user row — what's "currently true" for fast checks.
      await tx
        .update(user)
        .set({
          termsAcceptedAt: now,
          termsVersion: TERMS_VERSION,
          marketingOptIn: parsed.marketingOptIn,
          marketingOptInAt: parsed.marketingOptIn ? now : null,
          updatedAt: now,
        })
        .where(eq(user.id, userId));

      // Audit log — never updated, only inserted, so we can prove who consented
      // to what at which moment from which IP.
      const rows: Array<{
        userId: string;
        consentType: "terms" | "marketing_opt_in" | "marketing_opt_out";
        termsVersion: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        source: ConsentSource;
      }> = [
        {
          userId,
          consentType: "terms",
          termsVersion: TERMS_VERSION,
          ipAddress: ip,
          userAgent: ua,
          source,
        },
      ];
      if (parsed.marketingOptIn) {
        rows.push({
          userId,
          consentType: "marketing_opt_in",
          termsVersion: TERMS_VERSION,
          ipAddress: ip,
          userAgent: ua,
          source,
        });
      }
      await tx.insert(userConsent).values(rows);
    });

    const res = NextResponse.json(
      {
        success: true,
        data: {
          termsAccepted: true,
          termsVersion: TERMS_VERSION,
          marketingOptIn: parsed.marketingOptIn,
        },
      },
      { status: 200 }
    );
    // Fast-path cookie read by middleware. Carries the version so bumping
    // TERMS_VERSION invalidates every browser at once.
    res.cookies.set(CONSENT_COOKIE, TERMS_VERSION, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: CONSENT_COOKIE_MAX_AGE,
    });
    return res;
  } catch (error) {
    return apiError(error);
  }
}
