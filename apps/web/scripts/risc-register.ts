/**
 * One-time script to register a Cross-Account Protection (RISC) stream with
 * Google. After running, Google will start delivering security events to our
 * webhook at /api/google/risc.
 *
 * Prerequisites (one-time, in Google Cloud Console for project income-tracker):
 *   1. Enable the RISC API
 *      gcloud services enable risc.googleapis.com --project=income-tracker
 *   2. Create a service account with the RISC Configuration Admin role
 *      gcloud iam service-accounts create risc-admin --project=income-tracker
 *      gcloud projects add-iam-policy-binding income-tracker \
 *        --member="serviceAccount:risc-admin@income-tracker.iam.gserviceaccount.com" \
 *        --role="roles/riscconfigs.admin"
 *   3. Download a JSON key for that service account and save it locally
 *      gcloud iam service-accounts keys create ~/risc-admin-key.json \
 *        --iam-account=risc-admin@income-tracker.iam.gserviceaccount.com
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=~/risc-admin-key.json \
 *     pnpm tsx apps/web/scripts/risc-register.ts https://sedder.app/api/google/risc
 *
 * The script is idempotent — re-running replaces the existing stream config.
 * After registration it sends a verification ping; check the Vercel function
 * logs for "[risc] verification ping" to confirm the webhook received it.
 */
import fs from "fs";
import { SignJWT, importPKCS8 } from "jose";

const RISC_AUDIENCE =
  "https://risc.googleapis.com/google.identity.risc.v1beta.RiscManagementService";

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  private_key_id: string;
}

async function mintSelfSignedJwt(): Promise<string> {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    throw new Error(
      "GOOGLE_APPLICATION_CREDENTIALS must point to a service account JSON key"
    );
  }
  const raw = fs.readFileSync(keyPath, "utf8");
  const key = JSON.parse(raw) as ServiceAccountKey;
  const privateKey = await importPKCS8(key.private_key, "RS256");
  return new SignJWT({})
    .setProtectedHeader({
      alg: "RS256",
      typ: "JWT",
      kid: key.private_key_id,
    })
    .setIssuer(key.client_email)
    .setSubject(key.client_email)
    .setAudience(RISC_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}

// Must match Google's events_supported exactly — unsupported URIs are silently
// dropped by Google at stream:update time.
const EVENTS_REQUESTED = [
  "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
  "https://schemas.openid.net/secevent/oauth/event-type/tokens-revoked",
  "https://schemas.openid.net/secevent/oauth/event-type/token-revoked",
  "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
  "https://schemas.openid.net/secevent/risc/event-type/account-enabled",
  "https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required",
  "https://schemas.openid.net/secevent/risc/event-type/verification",
];

async function runStatus(accessToken: string) {
  console.log("Fetching current RISC stream config from Google…\n");
  const res = await fetch("https://risc.googleapis.com/v1beta/stream", {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  console.log(`stream:get -> HTTP ${res.status}`);
  const body = await res.text();
  console.log(body);
  if (res.status === 404) {
    console.log(
      "\nNo stream registered. Run without --status to create one:"
    );
    console.log(
      "  GOOGLE_APPLICATION_CREDENTIALS=~/risc-admin-key.json \\"
    );
    console.log(
      "    pnpm tsx apps/web/scripts/risc-register.ts https://sedder.app/api/google/risc"
    );
  }
}

async function main() {
  const arg = process.argv[2];

  // RISC uses self-signed JWT auth (RFC 7523), not OAuth2 access tokens.
  // We sign a JWT with aud = RISC service URL and use it directly as the
  // bearer credential.
  const accessToken = await mintSelfSignedJwt();

  if (arg === "--status") {
    await runStatus(accessToken);
    return;
  }

  const webhookUrl = arg;
  if (!webhookUrl) {
    console.error(
      "Usage: tsx apps/web/scripts/risc-register.ts <https-webhook-url>"
    );
    console.error(
      "       tsx apps/web/scripts/risc-register.ts --status"
    );
    console.error(
      "Example: tsx apps/web/scripts/risc-register.ts https://sedder.app/api/google/risc"
    );
    process.exit(1);
  }
  if (!webhookUrl.startsWith("https://")) {
    console.error("Webhook URL must be HTTPS");
    process.exit(1);
  }

  console.log(`Registering RISC stream → ${webhookUrl}`);
  const updateRes = await fetch(
    "https://risc.googleapis.com/v1beta/stream:update",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        delivery: {
          delivery_method:
            "https://schemas.openid.net/secevent/risc/delivery-method/push",
          url: webhookUrl,
        },
        events_requested: EVENTS_REQUESTED,
      }),
    }
  );

  console.log(`stream:update -> HTTP ${updateRes.status}`);
  console.log(await updateRes.text());

  if (!updateRes.ok) {
    process.exit(1);
  }

  // Send a test ping. Google will deliver a SET with the verification event
  // type carrying our state value back to the webhook.
  const state = `seder-init-${Date.now()}`;
  console.log(`\nSending verification ping with state=${state}`);
  const verifyRes = await fetch(
    "https://risc.googleapis.com/v1beta/stream:verify",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ state }),
    }
  );

  console.log(`stream:verify -> HTTP ${verifyRes.status}`);
  console.log(await verifyRes.text());

  console.log(
    "\nDone. Check Vercel function logs for [risc] verification ping."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
