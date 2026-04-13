"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { authClient } from "@/lib/auth-client";
import { CalendarDays, Loader2, ShieldAlert } from "lucide-react";

interface ConnectCalendarDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConnectCalendarDialog({
  isOpen,
  onClose,
}: ConnectCalendarDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await authClient.linkSocial({
        provider: "google",
        scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
        callbackURL: window.location.href,
      });
    } catch (error) {
      console.error("Failed to connect Google Calendar:", error);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
            <CalendarDays className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <DialogTitle className="text-center text-lg">
            חבר את היומן כדי לייבא
          </DialogTitle>
          <DialogDescription className="text-center pt-1">
            כדי לייבא אירועים מ-Google Calendar כהכנסות, צריך להתחבר ולתת ל&quot;סדר&quot; הרשאת קריאה ליומן שלך.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 p-3 flex gap-3 text-start">
          <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-100 leading-relaxed">
            <p className="font-semibold mb-1">שים לב:</p>
            <p>
              ייתכן שגוגל יציג אזהרה (&quot;Google hasn&apos;t verified this app&quot;) כי האפליקציה נמצאת בתהליך אישור.
              לחץ על <span className="font-semibold">Advanced</span> ואז על <span className="font-semibold">Go to sedder.app</span> כדי להמשיך.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="sm:w-auto"
          >
            לא עכשיו
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isLoading}
            className="gap-2 sm:w-auto"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarDays className="h-4 w-4" />
            )}
            חבר את היומן
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
