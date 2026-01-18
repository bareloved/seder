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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Loader2, Settings2 } from "lucide-react";
import { MONTH_NAMES } from "../utils";
import { CalendarPickerDialog, getSavedCalendarSelection } from "./CalendarPickerDialog";
import { ImportPreviewDialog } from "./ImportPreviewDialog";
import type { GoogleCalendar, CalendarEvent } from "@/lib/googleCalendar";
import {
  fetchCalendarEventsAction,
  importSelectedEventsAction,
} from "../actions";
import { classifyByRules, getUserRules } from "@/lib/classificationRules";
import { toast } from "sonner";

interface CalendarImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultYear: number;
  defaultMonth: number;
  onImportStart?: () => void;
  onImportEnd?: (success: boolean, error?: string) => void;
}

export function CalendarImportDialog({
  isOpen,
  onClose,
  defaultYear,
  defaultMonth,
  onImportStart,
  onImportEnd,
}: CalendarImportDialogProps) {
  const [selectedYear, setSelectedYear] = React.useState(defaultYear);
  const [selectedMonth, setSelectedMonth] = React.useState(defaultMonth);
  const [isFetching, setIsFetching] = React.useState(false);
  const [isCalendarPickerOpen, setIsCalendarPickerOpen] = React.useState(false);
  const [selectedCalendarIds, setSelectedCalendarIds] = React.useState<string[]>([]);
  const [calendars, setCalendars] = React.useState<GoogleCalendar[]>([]);

  // Preview state
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [fetchedEvents, setFetchedEvents] = React.useState<CalendarEvent[]>([]);
  const [classifications, setClassifications] = React.useState<Array<{
    eventId: string;
    isWork: boolean;
    confidence: number;
    suggestedClient?: string;
  }>>([]);

  // Load saved calendar selection and fetch calendar list when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedYear(defaultYear);
      setSelectedMonth(defaultMonth);

      // Load saved selection
      const saved = getSavedCalendarSelection();
      if (saved.length > 0) {
        setSelectedCalendarIds(saved);
      }

      // Fetch calendars to show names
      fetch("/api/google/calendars")
        .then((res) => res.json())
        .then((data) => {
          if (data.calendars) {
            setCalendars(data.calendars);
            // If no saved selection, default to primary calendar
            if (saved.length === 0) {
              const primary = data.calendars.find((c: GoogleCalendar) => c.primary);
              if (primary) {
                setSelectedCalendarIds([primary.id]);
              }
            }
          }
        })
        .catch((err) => {
          console.error("Failed to fetch calendars:", err);
        });
    }
  }, [isOpen, defaultYear, defaultMonth]);

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  // Step 1: Fetch events and open preview
  const handleFetchAndPreview = async () => {
    setIsFetching(true);
    try {
      const calendarIds = selectedCalendarIds.length > 0 ? selectedCalendarIds : ["primary"];
      const result = await fetchCalendarEventsAction(selectedYear, selectedMonth, calendarIds);

      if (!result.success) {
        toast.error(result.error || "Failed to fetch events");
        return;
      }

      if (result.events.length === 0) {
        toast.info("לא נמצאו אירועים בחודש זה");
        return;
      }

      // Convert serialized events back to CalendarEvent format
      const events: CalendarEvent[] = result.events.map((e) => ({
        id: e.id,
        summary: e.summary,
        start: new Date(e.start),
        end: new Date(e.end),
        calendarId: e.calendarId,
      }));

      setFetchedEvents(events);

      // Classify with rules engine
      classifyWithRules(events);

      setIsPreviewOpen(true);
      onClose(); // Close the calendar selection dialog
    } catch (error) {
      console.error("Failed to fetch events:", error);
      toast.error("שגיאה בטעינת אירועים");
    } finally {
      setIsFetching(false);
    }
  };

  // Classify with rules engine
  const classifyWithRules = (events: CalendarEvent[]) => {
    const rules = getUserRules();
    const results = classifyByRules(
      events.map((e) => ({ id: e.id, summary: e.summary, calendarId: e.calendarId })),
      rules
    );
    setClassifications(results);
  };

  // Import selected events
  const handleImport = async (
    selectedEvents: Array<{ id: string; summary: string; date: string; clientName: string }>
  ) => {
    onImportStart?.();

    const eventsToImport = selectedEvents.map((e) => ({
      calendarEventId: e.id,
      summary: e.summary,
      date: e.date,
      clientName: e.clientName,
    }));

    const result = await importSelectedEventsAction(eventsToImport);

    if (result.success) {
      toast.success(`יובאו ${result.count} אירועים`);
      setIsPreviewOpen(false);
      setFetchedEvents([]);
      setClassifications([]);
      onImportEnd?.(true);
    } else {
      // Don't show toast here - parent shows enhanced error
      onImportEnd?.(false, result.error || "שגיאה לא ידועה");
    }
  };

  // Get display text for selected calendars
  const getSelectedCalendarsText = () => {
    if (selectedCalendarIds.length === 0) {
      return "יומן ראשי";
    }
    if (selectedCalendarIds.length === 1) {
      const cal = calendars.find((c) => c.id === selectedCalendarIds[0]);
      return cal?.summary || "יומן אחד";
    }
    return `${selectedCalendarIds.length} יומנים`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[420px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-500" />
              ייבוא מהיומן
            </DialogTitle>
            <DialogDescription>
              בחר חודש ויומנים לייבוא אירועים
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Calendar Selection */}
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                יומנים
              </label>
              <Button
                variant="outline"
                onClick={() => setIsCalendarPickerOpen(true)}
                className="w-full justify-between text-right"
              >
                <span className="truncate">{getSelectedCalendarsText()}</span>
                <Settings2 className="h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </div>

            {/* Month/Year Row */}
            <div className="flex items-end gap-3">
              {/* Month Selector */}
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  חודש
                </label>
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(v) => setSelectedMonth(parseInt(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(MONTH_NAMES).map(([value, name]) => (
                      <SelectItem key={value} value={value}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year Selector */}
              <div className="w-[100px]">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  שנה
                </label>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={onClose} disabled={isFetching}>
              ביטול
            </Button>
            <Button onClick={handleFetchAndPreview} disabled={isFetching}>
              {isFetching ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  טוען...
                </>
              ) : (
                <>
                  <CalendarDays className="h-4 w-4 ml-2" />
                  המשך
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CalendarPickerDialog
        isOpen={isCalendarPickerOpen}
        onClose={() => setIsCalendarPickerOpen(false)}
        onConfirm={setSelectedCalendarIds}
        selectedCalendarIds={selectedCalendarIds}
      />

      <ImportPreviewDialog
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setFetchedEvents([]);
          setClassifications([]);
        }}
        onImport={handleImport}
        events={fetchedEvents}
        classifications={classifications}
        onRulesChanged={() => classifyWithRules(fetchedEvents)}
      />
    </>
  );
}
