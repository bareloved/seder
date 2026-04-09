import { db } from "@/db/client";
import { deviceTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SignJWT, importPKCS8 } from "jose";
import { Client } from "undici";

const APNS_KEY_ID = process.env.APNS_KEY_ID!;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID!;
const APNS_PRIVATE_KEY = process.env.APNS_PRIVATE_KEY!;
const APNS_BUNDLE_ID = "com.bareloved.seder";
const APNS_HOST =
  process.env.APNS_ENVIRONMENT === "development"
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

  cachedToken = { jwt, expiresAt: now + 3000 };
  return jwt;
}

async function sendApnsPush(
  client: Client,
  deviceToken: string,
  jwt: string,
  payload: object
): Promise<{ success: boolean; status: number }> {
  try {
    const { statusCode, body } = await client.request({
      method: "POST",
      path: `/3/device/${deviceToken}`,
      headers: {
        authorization: `bearer ${jwt}`,
        "apns-topic": APNS_BUNDLE_ID,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await body.text();
    console.log(
      `[PUSH] token=${deviceToken.slice(0, 10)}... status=${statusCode} body=${responseBody || "(empty)"}`
    );

    if (statusCode === 410) {
      await db.delete(deviceTokens).where(eq(deviceTokens.token, deviceToken));
      console.log(`[PUSH] Removed stale token=${deviceToken.slice(0, 10)}...`);
    }

    return { success: statusCode === 200, status: statusCode };
  } catch (err) {
    console.error(
      `[PUSH] request error for token=${deviceToken.slice(0, 10)}...:`,
      err
    );
    return { success: false, status: 0 };
  }
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

  console.log(
    `[PUSH] Sending to user=${userId.slice(0, 8)}... tokens=${tokens.length}`
  );

  if (tokens.length === 0) return;

  const jwt = await getApnsJwt();

  const apnsPayload = {
    aps: {
      alert: { title, body },
      sound: "default",
      "content-available": 1,
    },
    ...data,
  };

  const client = new Client(APNS_HOST, { allowH2: true });

  try {
    const results = await Promise.allSettled(
      tokens.map((t) => sendApnsPush(client, t.token, jwt, apnsPayload))
    );

    for (const r of results) {
      if (r.status === "rejected") {
        console.error(`[PUSH] Promise rejected:`, r.reason);
      }
    }
  } finally {
    await client.close();
  }
}
