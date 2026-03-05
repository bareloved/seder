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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Settings2, Eye, EyeOff } from "lucide-react";
import { RulesManagerDialog } from "./RulesManagerDialog";
import type { CalendarEvent } from "@/lib/googleCalendar";

interface ClassifiedEventWithData extends CalendarEvent {
    isWork: boolean;
    confidence: number;
    suggestedClient?: string;
    selected: boolean;
    clientName: string;
    isImported: boolean;
}

interface ImportPreviewDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (events: Array<{ id: string; summary: string; date: string; clientName: string }>) => Promise<void>;
    events: CalendarEvent[];
    importedEventIds: string[];
    classifications: Array<{
        eventId: string;
        isWork: boolean;
        confidence: number;
        suggestedClient?: string;
    }>;
    onRulesChanged: () => void;
}

export function ImportPreviewDialog({
    isOpen,
    onClose,
    onImport,
    events,
    importedEventIds,
    classifications,
    onRulesChanged,
}: ImportPreviewDialogProps) {
    const [isRulesOpen, setIsRulesOpen] = React.useState(false);
    const [showPersonal, setShowPersonal] = React.useState(true);
    const [isImporting, setIsImporting] = React.useState(false);

    // Merge events with classifications
    const [eventData, setEventData] = React.useState<ClassifiedEventWithData[]>([]);

    React.useEffect(() => {
        const importedSet = new Set(importedEventIds);
        const merged = events.map((event) => {
            const classification = classifications.find((c) => c.eventId === event.id);
            const isWork = classification?.isWork ?? true;
            const confidence = classification?.confidence ?? 0.5;
            const isImported = importedSet.has(event.id);

            return {
                ...event,
                isWork,
                confidence,
                suggestedClient: classification?.suggestedClient,
                // Auto-select work events with ≥70% confidence, but not already imported
                selected: !isImported && isWork && confidence >= 0.7,
                clientName: classification?.suggestedClient || "",
                isImported,
            };
        });
        setEventData(merged);
    }, [events, classifications, importedEventIds]);

    const toggleSelect = (eventId: string) => {
        setEventData((prev) =>
            prev.map((e) => (e.id === eventId ? { ...e, selected: !e.selected } : e))
        );
    };

    const updateClientName = (eventId: string, clientName: string) => {
        setEventData((prev) =>
            prev.map((e) => (e.id === eventId ? { ...e, clientName } : e))
        );
    };

    const selectAllWork = () => {
        setEventData((prev) =>
            prev.map((e) => (e.isWork ? { ...e, selected: true } : e))
        );
    };

    const deselectAll = () => {
        setEventData((prev) => prev.map((e) => ({ ...e, selected: false })));
    };

    const filteredEvents = showPersonal
        ? eventData
        : eventData.filter((e) => e.isWork);

    const selectedCount = eventData.filter((e) => e.selected).length;
    const workCount = eventData.filter((e) => e.isWork).length;

    const handleImport = async () => {
        setIsImporting(true);
        try {
            const selectedEvents = eventData
                .filter((e) => e.selected)
                .map((e) => ({
                    id: e.id,
                    summary: e.summary,
                    date: e.start.toISOString().split("T")[0],
                    clientName: e.clientName,
                }));
            await onImport(selectedEvents);
            onClose();
        } finally {
            setIsImporting(false);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
    };

    const handleRulesClose = () => {
        setIsRulesOpen(false);
        // Re-classify when rules change
        onRulesChanged();
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-[700px] max-h-[85vh] flex flex-col" dir="rtl">
                    <DialogHeader className="pb-2">
                        <DialogTitle className="flex items-center justify-between">
                            <span>תצוגה מקדימה - {events.length} אירועים</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsRulesOpen(true)}
                                className="h-8 w-8"
                                title="הגדרות סיווג"
                            >
                                <Settings2 className="h-4 w-4" />
                            </Button>
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            בחירת אירועים מהיומן לייבוא כרשומות הכנסה
                        </DialogDescription>
                    </DialogHeader>

                    {/* Toolbar */}
                    <div className="flex items-center gap-2 text-sm border-b pb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={selectAllWork}
                            className="h-7 text-xs"
                        >
                            בחר הכל עבודה ({workCount})
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={deselectAll}
                            className="h-7 text-xs"
                        >
                            נקה בחירה
                        </Button>
                        <div className="flex-1" />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowPersonal(!showPersonal)}
                            className="h-7 text-xs gap-1"
                        >
                            {showPersonal ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            {showPersonal ? "הסתר אישי" : "הצג הכל"}
                        </Button>
                    </div>

                    {/* Events List */}
                    <div className="flex-1 overflow-y-auto min-h-[300px] -mx-6 px-6">
                        <div className="space-y-1 py-2">
                            {filteredEvents.map((event) => (
                                <div
                                    key={event.id}
                                    className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${event.selected
                                            ? "bg-blue-50 dark:bg-blue-900/20"
                                            : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        }`}
                                >
                                    <Checkbox
                                        checked={event.selected}
                                        onCheckedChange={() => toggleSelect(event.id)}
                                    />

                                    {/* Event Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium truncate">
                                                {event.summary}
                                            </span>
                                            <Badge
                                                variant="secondary"
                                                className={`shrink-0 text-[10px] px-1.5 py-0 ${
                                                    event.isImported
                                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                                        : event.isWork
                                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                                            : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                                                }`}
                                            >
                                                {event.isImported ? "יובא" : event.isWork ? "עבודה" : "אישי"}
                                            </Badge>
                                        </div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                            {formatDate(event.start)} • {formatTime(event.start)}
                                        </div>
                                    </div>

                                    {/* Client Input */}
                                    {event.selected && (
                                        <Input
                                            placeholder="שם לקוח"
                                            value={event.clientName}
                                            onChange={(e) => updateClientName(event.id, e.target.value)}
                                            className="w-32 h-8 text-sm"
                                        />
                                    )}
                                </div>
                            ))}

                            {filteredEvents.length === 0 && (
                                <div className="text-center py-8 text-slate-500">
                                    אין אירועים להצגה
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 pt-2 border-t">
                        <Button variant="outline" onClick={onClose} disabled={isImporting}>
                            ביטול
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={isImporting || selectedCount === 0}
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                                    מייבא...
                                </>
                            ) : (
                                `ייבא ${selectedCount} אירועים`
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <RulesManagerDialog
                isOpen={isRulesOpen}
                onClose={handleRulesClose}
            />
        </>
    );
}
