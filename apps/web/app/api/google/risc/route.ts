import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { account, session } from "@/db/schema";
import {
  RISC_EVENT_TYPES,
  extractGoogleSub,
  verifyRiscToken,
  type RiscEventPayload,
} from "@/lib/risc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let claims;
  try {
    const token = (await req.text()).trim();
    if (!token) {
      return NextResponse.json({ error: "Empty body" }, { status: 400 });
    }
    claims = await verifyRiscToken(token);
  } catch (err) {
    console.error("[risc] Token verification failed:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  for (const [eventType, payload] of Object.entries(claims.events)) {
    try {
      await handleEvent(eventType, payload, claims.jti);
    } catch (err) {
      // Swallow per-event errors so a single bad event doesn't cause Google
      // to retry the entire SET.
      console.error(`[risc] Failed to handle ${eventType}:`, err);
    }
  }

  // 202 Accepted per RFC 8935 — receiver acknowledges receipt.
  return new NextResponse(null, { status: 202 });
}

async function handleEvent(
  eventType: string,
  payload: RiscEventPayload,
  jti: string
) {
  if (eventType === RISC_EVENT_TYPES.VERIFICATION) {
    console.log(
      `[risc] verification ping jti=${jti} state=${payload.state ?? ""}`
    );
    return;
  }

  const googleSub = extractGoogleSub(payload);
  if (!googleSub) {
    console.warn(`[risc] ${eventType} missing Google sub jti=${jti}`);
    return;
  }

  const userId = await findUserIdForGoogleSub(googleSub);
  if (!userId) {
    // Event for a Google account we don't know about — common and harmless.
    console.log(
      `[risc] ${eventType} for unknown google sub=${googleSub} jti=${jti}`
    );
    return;
  }

  switch (eventType) {
    case RISC_EVENT_TYPES.SESSIONS_REVOKED:
    case RISC_EVENT_TYPES.ACCOUNT_CREDENTIAL_CHANGE_REQUIRED:
      await revokeAllSessions(userId);
      console.log(`[risc] revoked sessions user=${userId} event=${eventType}`);
      break;

    case RISC_EVENT_TYPES.TOKENS_REVOKED:
    case RISC_EVENT_TYPES.TOKEN_REVOKED:
      await clearGoogleTokens(userId);
      console.log(
        `[risc] cleared google tokens user=${userId} event=${eventType}`
      );
      break;

    case RISC_EVENT_TYPES.ACCOUNT_DISABLED:
    case RISC_EVENT_TYPES.ACCOUNT_PURGED:
      await revokeAllSessions(userId);
      await clearGoogleTokens(userId);
      console.log(
        `[risc] disabled user=${userId} event=${eventType} reason=${payload.reason ?? ""}`
      );
      break;

    case RISC_EVENT_TYPES.ACCOUNT_ENABLED:
      console.log(`[risc] account re-enabled user=${userId}`);
      break;

    default:
      console.warn(`[risc] unhandled event ${eventType} user=${userId}`);
  }
}

async function findUserIdForGoogleSub(
  googleSub: string
): Promise<string | null> {
  const [row] = await db
    .select({ userId: account.userId })
    .from(account)
    .where(
      and(eq(account.providerId, "google"), eq(account.accountId, googleSub))
    )
    .limit(1);
  return row?.userId ?? null;
}

async function revokeAllSessions(userId: string): Promise<void> {
  await db.delete(session).where(eq(session.userId, userId));
}

async function clearGoogleTokens(userId: string): Promise<void> {
  await db
    .update(account)
    .set({
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(account.userId, userId), eq(account.providerId, "google")));
}
