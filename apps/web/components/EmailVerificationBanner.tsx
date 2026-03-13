"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function EmailVerificationBanner() {
  const { data: session } = authClient.useSession();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!session?.user || session.user.emailVerified) {
    return null;
  }

  const handleResend = async () => {
    setSending(true);
    try {
      await authClient.sendVerificationEmail({
        email: session.user.email,
        callbackURL: "/",
      });
      setSent(true);
    } catch {
      // Silently fail — user can retry
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-4 py-3"
    >
      <div className="flex items-center justify-center gap-2 text-sm text-amber-800 dark:text-amber-200">
        <span>כתובת האימייל שלכם עדיין לא אומתה.</span>
        {sent ? (
          <span className="font-medium text-amber-600 dark:text-amber-400">
            אימייל אימות נשלח!
          </span>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="font-medium underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "שולח..." : "שלח שוב"}
          </button>
        )}
      </div>
    </div>
  );
}
