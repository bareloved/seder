import { db } from "@/db/client";
import { deviceTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SignJWT, importPKCS8 } from "jose";

const APNS_KEY_ID = process.env.APNS_KEY_ID!;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID!;
const APNS_PRIVATE_KEY = process.env.APNS_PRIVATE_KEY!;
const APNS_BUNDLE_ID = "com.bareloved.seder";
const APNS_HOST = process.env.APNS_ENVIRONMENT === "development"
  ? "https://api.sandbox.push.apple.com"
  : "https://api.push.apple.com";

let cachedToken: { jwt: string; expiresAt: number } | null = null;

async function getApnsJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.jwt;
  }

  const key = await importPKCS8(
    APNS_PRIVATE_KEY.replace(/\\n/g, "\n"),
    "ES256"
  );

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: APNS_KEY_ID })
    .setIssuer(APNS_TEAM_ID)
    .setIssuedAt(now)
    .sign(key);

  // APNs tokens are valid for 1 hour, refresh after 50 minutes
  cachedToken = { jwt, expiresAt: now + 3000 };
  return jwt;
}

async function sendApnsPush(
  deviceToken: string,
  payload: { title: string; body: string; data?: Record<string, unknown> }
): Promise<{ success: boolean; status: number }> {
  const jwt = await getApnsJwt();

  const apnsPayload = {
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: "default",
      "content-available": 1,
    },
    ...payload.data,
  };

  const res = await fetch(`${APNS_HOST}/3/device/${deviceToken}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${jwt}`,
      "apns-topic": APNS_BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    },
    body: JSON.stringify(apnsPayload),
  });

  if (!res.ok && res.status === 410) {
    // Token is no longer valid — clean it up
    await db.delete(deviceTokens).where(eq(deviceTokens.token, deviceToken));
  }

  return { success: res.ok, status: res.status };
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  const tokens = await db
    .select()
    .from(deviceTokens)
    .where(eq(deviceTokens.userId, userId));

  if (tokens.length === 0) return;

  await Promise.allSettled(
    tokens.map((t) => sendApnsPush(t.token, { title, body, data }))
  );
}
