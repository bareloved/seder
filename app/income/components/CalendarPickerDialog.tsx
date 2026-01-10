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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Calendar } from "lucide-react";
import type { GoogleCalendar } from "@/lib/googleCalendar";

const SELECTED_CALENDARS_KEY = "seder_selected_calendars";

interface CalendarPickerDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (calendarIds: string[]) => void;
    selectedCalendarIds: string[];
}

export function CalendarPickerDialog({
    isOpen,
    onClose,
    onConfirm,
    selectedCalendarIds,
}: CalendarPickerDialogProps) {
    const [calendars, setCalendars] = React.useState<GoogleCalendar[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [selected, setSelected] = React.useState<Set<string>>(
        new Set(selectedCalendarIds)
    );

    // Fetch calendars when dialog opens
    React.useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setSelected(new Set(selectedCalendarIds));

            fetch("/api/google/calendars")
                .then((res) => res.json())
                .then((data) => {
                    if (data.calendars) {
                        setCalendars(data.calendars);
                        // If no calendars were previously selected, select the primary by default
                        if (selectedCalendarIds.length === 0) {
                            const primary = data.calendars.find(
                                (c: GoogleCalendar) => c.primary
                            );
                            if (primary) {
                                setSelected(new Set([primary.id]));
                            }
                        }
                    }
                })
                .catch((err) => {
                    console.error("Failed to fetch calendars:", err);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }
    }, [isOpen, selectedCalendarIds]);

    const toggleCalendar = (id: string) => {
        setSelected((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const selectAll = () => {
        setSelected(new Set(calendars.map((c) => c.id)));
    };

    const selectNone = () => {
        setSelected(new Set());
    };

    const handleConfirm = () => {
        const calendarIds = Array.from(selected);
        // Save selection to localStorage
        localStorage.setItem(SELECTED_CALENDARS_KEY, JSON.stringify(calendarIds));
        onConfirm(calendarIds);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        בחירת יומנים
                    </DialogTitle>
                    <DialogDescription>
                        בחר את היומנים שמהם תרצה לייבא אירועים
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : calendars.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            לא נמצאו יומנים
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Quick actions */}
                            <div className="flex gap-2 text-xs">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={selectAll}
                                    className="h-7 px-2"
                                >
                                    בחר הכל
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={selectNone}
                                    className="h-7 px-2"
                                >
                                    נקה בחירה
                                </Button>
                            </div>

                            {/* Calendar list */}
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {calendars.map((calendar) => (
                                    <label
                                        key={calendar.id}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                    >
                                        <Checkbox
                                            checked={selected.has(calendar.id)}
                                            onCheckedChange={() => toggleCalendar(calendar.id)}
                                        />
                                        <div
                                            className="w-3 h-3 rounded-full shrink-0"
                                            style={{ backgroundColor: calendar.backgroundColor }}
                                        />
                                        <span className="text-sm truncate flex-1">
                                            {calendar.summary}
                                        </span>
                                        {calendar.primary && (
                                            <span className="text-xs text-slate-400">ראשי</span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose}>
                        ביטול
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={selected.size === 0 || isLoading}
                    >
                        אישור ({selected.size})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Helper to get saved calendar selection from localStorage
export function getSavedCalendarSelection(): string[] {
    if (typeof window === "undefined") return [];
    try {
        const saved = localStorage.getItem(SELECTED_CALENDARS_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch {
        // Ignore parse errors
    }
    return [];
}
