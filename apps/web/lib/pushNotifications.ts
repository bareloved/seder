import { db } from "@/db/client";
import { deviceTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SignJWT, importPKCS8 } from "jose";
import type http2Type from "node:http2";

const APNS_KEY_ID = process.env.APNS_KEY_ID!;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID!;
const APNS_PRIVATE_KEY = process.env.APNS_PRIVATE_KEY!;
const APNS_BUNDLE_ID = "com.bareloved.seder";
const APNS_HOST =
  process.env.APNS_ENVIRONMENT === "development"
    ? "https://api.sandbox.push.apple.com"
    : "https://api.push.apple.com";

// Lazy-loaded at runtime to avoid bundler issues
let _http2: typeof http2Type | null = null;
function getHttp2(): typeof http2Type {
  if (!_http2) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _http2 = require("node:http2") as typeof http2Type;
  }
  return _http2;
}

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

function sendViaHttp2(
  deviceToken: string,
  jwt: string,
  payload: object
): Promise<{ success: boolean; status: number }> {
  const http2 = getHttp2();

  return new Promise((resolve) => {
    const client = http2.connect(APNS_HOST);
    const timeout = setTimeout(() => {
      console.error(`[PUSH] timeout for token=${deviceToken.slice(0, 10)}...`);
      client.close();
      resolve({ success: false, status: 0 });
    }, 10000);

    client.on("error", (err) => {
      clearTimeout(timeout);
      console.error(`[PUSH] connection error:`, err.message);
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

    req.on("end", () => {
      clearTimeout(timeout);
      client.close();
      console.log(
        `[PUSH] token=${deviceToken.slice(0, 10)}... status=${status} body=${responseBody || "(empty)"}`
      );
      resolve({ success: status === 200, status });
    });

    req.on("error", (err) => {
      clearTimeout(timeout);
      console.error(`[PUSH] request error:`, err.message);
      client.close();
      resolve({ success: false, status: 0 });
    });

    req.end(body);
  });
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

  const results = await Promise.allSettled(
    tokens.map(async (t) => {
      const result = await sendViaHttp2(t.token, jwt, apnsPayload);

      if (result.status === 410) {
        await db.delete(deviceTokens).where(eq(deviceTokens.token, t.token));
        console.log(`[PUSH] Removed stale token=${t.token.slice(0, 10)}...`);
      }

      return result;
    })
  );

  for (const r of results) {
    if (r.status === "rejected") {
      console.error(`[PUSH] Promise rejected:`, r.reason);
    }
  }
}
