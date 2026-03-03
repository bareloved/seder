"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { authClient } from "@/lib/auth-client";
import { Check, Link2, Loader2, Unlink } from "lucide-react";

interface GoogleConnectionButtonProps {
    isConnected: boolean;
    onConnectionChange?: () => void;
}

export function GoogleConnectionButton({
    isConnected,
    onConnectionChange,
}: GoogleConnectionButtonProps) {
    const [isLoading, setIsLoading] = React.useState(false);
    const [isOpen, setIsOpen] = React.useState(false);

    const handleConnect = async () => {
        setIsLoading(true);
        try {
            await authClient.linkSocial({
                provider: "google",
                callbackURL: window.location.href,
            });
        } catch (error) {
            console.error("Failed to connect Google Calendar:", error);
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/google/disconnect", {
                method: "POST",
            });

            if (!response.ok) {
                throw new Error("Failed to disconnect");
            }

            setIsOpen(false);
            onConnectionChange?.();
        } catch (error) {
            console.error("Failed to disconnect Google Calendar:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isConnected) {
        return (
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 text-green-600 border-green-200 hover:border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:border-green-700 dark:hover:bg-green-950"
                    >
                        <Check className="h-4 w-4" />
                        <span className="hidden sm:inline">יומן Google מחובר</span>
                        <span className="sm:hidden">מחובר</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3" align="end" dir="rtl">
                    <div className="space-y-3">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            היומן שלך מחובר ומוכן לייבוא אירועים.
                        </div>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="w-full gap-2"
                            onClick={handleDisconnect}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Unlink className="h-4 w-4" />
                            )}
                            נתק את היומן
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleConnect}
            disabled={isLoading}
        >
            {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Link2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">חבר יומן Google</span>
            <span className="sm:hidden">חבר יומן</span>
        </Button>
    );
}
