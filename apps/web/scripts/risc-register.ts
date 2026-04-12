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
import { google } from "googleapis";

const EVENTS_REQUESTED = [
  "https://schemas.openid.net/secevent/risc/event-type/sessions-revoked",
  "https://schemas.openid.net/secevent/risc/event-type/tokens-revoked",
  "https://schemas.openid.net/secevent/oauth/event-type/token-revoked",
  "https://schemas.openid.net/secevent/risc/event-type/account-disabled",
  "https://schemas.openid.net/secevent/risc/event-type/account-enabled",
  "https://schemas.openid.net/secevent/risc/event-type/account-purged",
  "https://schemas.openid.net/secevent/risc/event-type/account-credential-change-required",
  "https://schemas.openid.net/secevent/risc/event-type/verification",
];

async function main() {
  const webhookUrl = process.argv[2];
  if (!webhookUrl) {
    console.error(
      "Usage: tsx apps/web/scripts/risc-register.ts <https-webhook-url>"
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

  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/risc.configuration"],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const accessToken = tokenResponse.token;
  if (!accessToken) {
    throw new Error(
      "Failed to obtain access token — is GOOGLE_APPLICATION_CREDENTIALS set?"
    );
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
