import { NextRequest } from "next/server";
import { SignJWT, importPKCS8 } from "jose";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // 1. Check env vars
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const privateKey = process.env.APNS_PRIVATE_KEY;
  const env = process.env.APNS_ENVIRONMENT;

  results.envVars = {
    APNS_KEY_ID: keyId ? `set (${keyId.length} chars)` : "MISSING",
    APNS_TEAM_ID: teamId ? `set (${teamId.length} chars)` : "MISSING",
    APNS_PRIVATE_KEY: privateKey ? `set (${privateKey.length} chars, starts: ${privateKey.slice(0, 30)}...)` : "MISSING",
    APNS_ENVIRONMENT: env || "NOT SET (defaults to production)",
  };

  // 2. Try JWT generation
  if (keyId && teamId && privateKey) {
    try {
      const key = await importPKCS8(
        privateKey.replace(/\\n/g, "\n"),
        "ES256"
      );
      const now = Math.floor(Date.now() / 1000);
      const jwt = await new SignJWT({})
        .setProtectedHeader({ alg: "ES256", kid: keyId })
        .setIssuer(teamId)
        .setIssuedAt(now)
        .sign(key);
      results.jwt = { success: true, length: jwt.length };
    } catch (err) {
      results.jwt = { success: false, error: String(err) };
    }
  }

  // 3. Try http2
  try {
    const http2 = require("node:http2");
    results.http2 = { available: true, connectType: typeof http2.connect };
  } catch (err) {
    results.http2 = { available: false, error: String(err) };
  }

  // 4. Try connecting to APNs (just connect, don't send)
  if (results.http2 && (results.http2 as Record<string, unknown>).available) {
    try {
      const http2 = require("node:http2");
      const host = env === "development"
        ? "https://api.sandbox.push.apple.com"
        : "https://api.push.apple.com";

      await new Promise<void>((resolve, reject) => {
        const client = http2.connect(host);
        const timeout = setTimeout(() => {
          client.close();
          reject(new Error("Connection timeout (5s)"));
        }, 5000);

        client.on("connect", () => {
          clearTimeout(timeout);
          results.apnsConnection = { success: true, host };
          client.close();
          resolve();
        });

        client.on("error", (err: Error) => {
          clearTimeout(timeout);
          client.close();
          reject(err);
        });
      });
    } catch (err) {
      results.apnsConnection = { success: false, error: String(err) };
    }
  }

  return Response.json(results, { status: 200 });
}
