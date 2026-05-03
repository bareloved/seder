"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export default function AuthCallbackPage() {
  useEffect(() => {
    async function handleCallback() {
      const { data: session } = await authClient.getSession();
      if (session) {
        // If the user came from the sign-up flow they ticked the consent
        // checkboxes before being redirected to Google. Drain that intent now
        // so consent is recorded at the same moment as for email sign-up.
        try {
          const raw = sessionStorage.getItem("seder.pending_consent");
          if (raw) {
            const parsed = JSON.parse(raw) as {
              marketingOptIn?: boolean;
              source?: string;
            };
            sessionStorage.removeItem("seder.pending_consent");
            await fetch("/api/v1/me/consent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                termsAccepted: true,
                marketingOptIn: !!parsed.marketingOptIn,
                source: parsed.source ?? "signup_google",
              }),
            });
          }
        } catch (err) {
          // Non-fatal — the /auth/consent interstitial will catch the user if
          // their termsAcceptedAt is still null on next page load.
          console.error("Failed to record post-OAuth consent", err);
        }
        window.opener?.postMessage({ type: "auth:success" }, window.location.origin);
        window.close();
      } else {
        window.opener?.postMessage({ type: "auth:error" }, window.location.origin);
        window.close();
      }
    }
    handleCallback();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen" dir="rtl">
      <p className="text-slate-500">מאמת...</p>
    </div>
  );
}
