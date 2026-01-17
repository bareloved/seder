"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar, Check, Loader2, Unlink } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export function CalendarSection() {
    const [isConnected, setIsConnected] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isActionLoading, setIsActionLoading] = React.useState(false);

    // Check connection status on mount
    React.useEffect(() => {
        checkConnectionStatus();
    }, []);

    const checkConnectionStatus = async () => {
        try {
            const response = await fetch("/api/google/calendars");
            setIsConnected(response.ok);
        } catch {
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConnect = async () => {
        setIsActionLoading(true);
        try {
            await authClient.linkSocial({
                provider: "google",
                callbackURL: window.location.href,
            });
        } catch (error) {
            console.error("Failed to connect Google Calendar:", error);
            toast.error("שגיאה בחיבור ליומן Google");
            setIsActionLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setIsActionLoading(true);
        try {
            const response = await fetch("/api/google/disconnect", {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to disconnect");
            }

            setIsConnected(false);
            toast.success("היומן נותק בהצלחה");
        } catch (error) {
            console.error("Failed to disconnect Google Calendar:", error);
            toast.error("שגיאה בניתוק היומן");
        } finally {
            setIsActionLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="space-y-1">
                <h2 className="text-lg font-medium">לוח שנה</h2>
                <p className="text-sm text-muted-foreground">ניהול חיבור ל-Google Calendar וכללי ייבוא</p>
            </div>

            <div className="border rounded-lg p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        isConnected
                            ? "bg-green-50 text-green-600"
                            : "bg-blue-50 text-blue-600"
                    }`}>
                        {isConnected ? <Check className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-medium">Google Calendar</h3>
                        <p className="text-sm text-muted-foreground">
                            {isConnected
                                ? "היומן שלך מחובר ומוכן לייבוא אירועים"
                                : "חבר את לוח השנה שלך לייבוא אוטומטי של אירועים"
                            }
                        </p>
                    </div>
                </div>
                {isLoading ? (
                    <Button variant="outline" disabled>
                        <Loader2 className="h-4 w-4 animate-spin" />
                    </Button>
                ) : isConnected ? (
                    <Button
                        variant="outline"
                        onClick={handleDisconnect}
                        disabled={isActionLoading}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                    >
                        {isActionLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        ) : (
                            <Unlink className="h-4 w-4 ml-2" />
                        )}
                        נתק
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        onClick={handleConnect}
                        disabled={isActionLoading}
                    >
                        {isActionLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        ) : null}
                        התחבר
                    </Button>
                )}
            </div>

            <div className={`space-y-6 ${!isConnected ? "opacity-50 pointer-events-none" : ""}`}>
                <div className="space-y-4">
                    <h3 className="text-sm font-medium">הגדרות ייבוא</h3>
                    <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                            <Label>ייבוא אוטומטי</Label>
                            <p className="text-xs text-muted-foreground">ייבא אירועים חדשים באופן אוטומטי ברקע</p>
                        </div>
                        <Switch disabled={!isConnected} />
                    </div>
                </div>
            </div>
        </div>
    );
}
