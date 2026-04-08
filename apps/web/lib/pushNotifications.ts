import { db } from "@/db/client";
import { deviceTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SignJWT, importPKCS8 } from "jose";
import http2 from "node:http2";

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

  cachedToken = { jwt, expiresAt: now + 3000 };
  return jwt;
}

function sendApnsHttp2(
  deviceToken: string,
  jwt: string,
  payload: object
): Promise<{ success: boolean; status: number }> {
  return new Promise((resolve) => {
    const client = http2.connect(APNS_HOST);

    client.on("error", () => {
      client.close();
      resolve({ success: false, status: 0 });
    });

    const body = JSON.stringify(payload);
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": APNS_BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
      "content-length": Buffer.byteLength(body),
    });

    let status = 0;
    let responseBody = "";

    req.on("response", (headers) => {
      status = headers[":status"] as number;
    });

    req.on("data", (chunk: Buffer) => {
      responseBody += chunk.toString();
    });

    req.on("end", async () => {
      client.close();

      if (status === 410) {
        await db.delete(deviceTokens).where(eq(deviceTokens.token, deviceToken));
      }

      if (status !== 200) {
        console.error(`APNs error for token ${deviceToken.slice(0, 10)}...: status=${status} body=${responseBody}`);
      }

      resolve({ success: status === 200, status });
    });

    req.on("error", () => {
      client.close();
      resolve({ success: false, status: 0 });
    });

    req.end(body);
  });
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

  return sendApnsHttp2(deviceToken, jwt, apnsPayload);
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
