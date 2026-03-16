"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export default function AuthCallbackPage() {
  useEffect(() => {
    async function handleCallback() {
      const { data: session } = await authClient.getSession();
      if (session) {
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
