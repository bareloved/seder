import { eq } from "drizzle-orm";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { withUser } from "@/db/client";
import { user } from "@/db/schema";
import { TERMS_VERSION } from "@seder/shared";

// Used by the iOS app (and any client) to decide whether to show the consent
// gate. Returns true once the user has accepted the *current* TERMS_VERSION;
// older versions count as not-accepted so users re-consent on material changes.
export async function GET() {
  try {
    const userId = await requireAuth();

    const row = await withUser(userId, async (tx) => {
      const rows = await tx
        .select({
          termsAcceptedAt: user.termsAcceptedAt,
          termsVersion: user.termsVersion,
          marketingOptIn: user.marketingOptIn,
        })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
      return rows[0] ?? null;
    });

    const accepted =
      !!row?.termsAcceptedAt && row.termsVersion === TERMS_VERSION;

    return apiSuccess({
      termsAccepted: accepted,
      termsVersion: row?.termsVersion ?? null,
      marketingOptIn: row?.marketingOptIn ?? false,
      currentTermsVersion: TERMS_VERSION,
    });
  } catch (error) {
    return apiError(error);
  }
}
