"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { setSentryUser, clearSentryUser } from "@/lib/sentry";

export function SentryUserTag() {
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (session?.user?.id) {
      setSentryUser(session.user.id);
    } else {
      clearSentryUser();
    }
  }, [session?.user?.id]);

  return null;
}
