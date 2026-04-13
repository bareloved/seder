"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { CalendarDays, CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react";

type ConnectionStatus = "checking" | "connected" | "notConnected";

export default function MobileConnectCalendarPage() {
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const [connectionStatus, setConnectionStatus] =
    React.useState<ConnectionStatus>("checking");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!session) {
      setConnectionStatus("checking");
      return;
    }
    fetch("/api/google/calendars")
      .then((res) =>
        setConnectionStatus(res.ok ? "connected" : "notConnected")
      )
      .catch(() => setConnectionStatus("notConnected"));
  }, [session]);

  const handleSignInAndConnect = async () => {
    setIsSubmitting(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
        callbackURL: "/m/connect-calendar",
      });
    } catch (error) {
      console.error("Sign-in failed:", error);
      setIsSubmitting(false);
    }
  };

  const handleLinkCalendar = async () => {
    setIsSubmitting(true);
    try {
      await authClient.linkSocial({
        provider: "google",
        scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
        callbackURL: "/m/connect-calendar",
      });
    } catch (error) {
      console.error("Link failed:", error);
      setIsSubmitting(false);
    }
  };

  const isLoading =
    sessionLoading || (!!session && connectionStatus === "checking");

  return (
    <main
      dir="rtl"
      className="min-h-[100dvh] bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-950 flex items-center justify-center p-5 font-sans"
    >
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 p-7 text-center">
        {isLoading ? (
          <LoadingState />
        ) : connectionStatus === "connected" ? (
          <ConnectedState />
        ) : !session ? (
          <PromptState
            isSubmitting={isSubmitting}
            title="חבר את היומן כדי לייבא"
            description="היכנס עם חשבון Google כדי שסדר יוכל לייבא אירועים מהיומן שלך כהכנסות."
            actionLabel="היכנס וחבר את היומן"
            onAction={handleSignInAndConnect}
          />
        ) : (
          <PromptState
            isSubmitting={isSubmitting}
            title="חבר את היומן כדי לייבא"
            description="תן לסדר הרשאת קריאה ל-Google Calendar כדי לייבא אירועים כהכנסות."
            actionLabel="חבר את היומן"
            onAction={handleLinkCalendar}
          />
        )}
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center py-10 gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      <p className="text-sm text-slate-500">טוען…</p>
    </div>
  );
}

function ConnectedState() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
        <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        היומן חובר בהצלחה!
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        חזור לאפליקציית סדר כדי לייבא אירועים מהיומן שלך.
      </p>
      <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        סגור את החלון הזה (X בפינה) כדי לחזור לאפליקציה.
      </div>
    </div>
  );
}

interface PromptStateProps {
  isSubmitting: boolean;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

function PromptState({
  isSubmitting,
  title,
  description,
  actionLabel,
  onAction,
}: PromptStateProps) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
        <CalendarDays className="h-9 w-9 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="w-full rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 p-3 flex gap-3 text-start">
        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
          <p className="font-semibold mb-1">שים לב:</p>
          <p>
            ייתכן שגוגל יציג אזהרה (&quot;Google hasn&apos;t verified this
            app&quot;). לחץ על <span className="font-semibold">Advanced</span>{" "}
            ואז על{" "}
            <span className="font-semibold">Go to sedder.app (unsafe)</span>{" "}
            כדי להמשיך.
          </p>
        </div>
      </div>

      <Button
        onClick={onAction}
        disabled={isSubmitting}
        className="w-full gap-2 h-12 text-base"
      >
        {isSubmitting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <CalendarDays className="h-5 w-5" />
        )}
        {actionLabel}
      </Button>
    </div>
  );
}
