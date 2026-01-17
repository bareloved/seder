"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar, Check, Loader2, Unlink, RefreshCw } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { updateCalendarSettings } from "../actions";

interface CalendarSettings {
    autoSyncEnabled?: boolean;
    lastAutoSync?: string;
    selectedCalendarIds?: string[];
}

export function CalendarSection() {
    const [isConnected, setIsConnected] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isActionLoading, setIsActionLoading] = React.useState(false);
    const [autoSyncEnabled, setAutoSyncEnabled] = React.useState(false);
    const [isSyncToggleLoading, setIsSyncToggleLoading] = React.useState(false);
    const [lastAutoSync, setLastAutoSync] = React.useState<string | null>(null);
    const [isSyncNowLoading, setIsSyncNowLoading] = React.useState(false);

    // Check connection status and fetch settings on mount
    React.useEffect(() => {
        checkConnectionStatus();
        fetchCalendarSettings();
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

    const fetchCalendarSettings = async () => {
        try {
            const response = await fetch("/api/settings/calendar");
            if (response.ok) {
                const data: CalendarSettings = await response.json();
                setAutoSyncEnabled(data.autoSyncEnabled ?? false);
                setLastAutoSync(data.lastAutoSync ?? null);
            }
        } catch {
            // Settings not found, use defaults
        }
    };

    const handleAutoSyncToggle = async (enabled: boolean) => {
        setIsSyncToggleLoading(true);
        try {
            const result = await updateCalendarSettings({ autoSyncEnabled: enabled });
            if (result.success) {
                setAutoSyncEnabled(enabled);
                toast.success(enabled ? "סנכרון אוטומטי הופעל" : "סנכרון אוטומטי כובה");
            } else {
                toast.error("שגיאה בעדכון ההגדרות");
            }
        } catch {
            toast.error("שגיאה בעדכון ההגדרות");
        } finally {
            setIsSyncToggleLoading(false);
        }
    };

    const handleSyncNow = async () => {
        setIsSyncNowLoading(true);
        try {
            const response = await fetch("/api/calendar/sync-now", {
                method: "POST",
            });
            if (response.ok) {
                const data = await response.json();
                toast.success(`סונכרנו ${data.imported ?? 0} אירועים מהיומן`);
                setLastAutoSync(new Date().toISOString());
            } else {
                const error = await response.json();
                toast.error(error.error || "שגיאה בסנכרון");
            }
        } catch {
            toast.error("שגיאה בסנכרון");
        } finally {
            setIsSyncNowLoading(false);
        }
    };

    const formatLastSync = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString("he-IL", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
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
                            <p className="text-xs text-muted-foreground">ייבא אירועים חדשים באופן אוטומטי כל יום</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {isSyncToggleLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            <Switch
                                checked={autoSyncEnabled}
                                onCheckedChange={handleAutoSyncToggle}
                                disabled={!isConnected || isSyncToggleLoading}
                            />
                        </div>
                    </div>

                    {isConnected && (
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>סנכרון ידני</Label>
                                {lastAutoSync && (
                                    <p className="text-xs text-muted-foreground">
                                        סנכרון אחרון: {formatLastSync(lastAutoSync)}
                                    </p>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSyncNow}
                                disabled={isSyncNowLoading}
                            >
                                {isSyncNowLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                                ) : (
                                    <RefreshCw className="h-4 w-4 ml-2" />
                                )}
                                סנכרן עכשיו
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
