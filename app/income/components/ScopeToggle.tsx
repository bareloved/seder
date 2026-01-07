"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, X } from "lucide-react";
import type { KPIScope, ScopeMode } from "../types";
import { formatDate } from "../utils";

interface ScopeToggleProps {
  scope: KPIScope;
  onScopeChange: (scope: KPIScope) => void;
  className?: string;
}

const SCOPE_LABELS: Record<ScopeMode, string> = {
  month: "חודש נוכחי",
  all: "כל הזמן",
  range: "טווח מותאם",
};

function getCurrentMonthBounds(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();

  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { start, end };
}

export function ScopeToggle({ scope, onScopeChange, className }: ScopeToggleProps) {
  const [rangePickerOpen, setRangePickerOpen] = React.useState(false);
  const [tempStart, setTempStart] = React.useState<Date | undefined>(
    scope.start ? new Date(scope.start) : undefined
  );
  const [tempEnd, setTempEnd] = React.useState<Date | undefined>(
    scope.end ? new Date(scope.end) : undefined
  );

  // Initialize temp dates when switching to range mode
  React.useEffect(() => {
    if (scope.mode === "range") {
      if (scope.start) setTempStart(new Date(scope.start));
      if (scope.end) setTempEnd(new Date(scope.end));
    }
  }, [scope.mode, scope.start, scope.end]);

  const handleModeChange = (mode: ScopeMode) => {
    if (mode === "month") {
      onScopeChange({ mode: "month" });
    } else if (mode === "all") {
      onScopeChange({ mode: "all" });
    } else if (mode === "range") {
      // If we have saved range, use it; otherwise use current month
      const bounds = getCurrentMonthBounds();
      const start = scope.start || bounds.start;
      const end = scope.end || bounds.end;
      setTempStart(new Date(start));
      setTempEnd(new Date(end));
      setRangePickerOpen(true);
      onScopeChange({ mode: "range", start, end });
    }
  };

  const handleApplyRange = () => {
    if (tempStart && tempEnd) {
      const start = tempStart.toISOString().split("T")[0];
      const end = tempEnd.toISOString().split("T")[0];

      // Auto-swap if end < start
      if (end < start) {
        onScopeChange({ mode: "range", start: end, end: start });
      } else {
        onScopeChange({ mode: "range", start, end });
      }
    }
    setRangePickerOpen(false);
  };

  const handleClearRange = () => {
    const bounds = getCurrentMonthBounds();
    setTempStart(new Date(bounds.start));
    setTempEnd(new Date(bounds.end));
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Segmented Control */}
      <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 gap-1">
        {(["month", "all", "range"] as ScopeMode[]).map((mode) => (
          <Button
            key={mode}
            variant="ghost"
            size="sm"
            onClick={() => handleModeChange(mode)}
            className={cn(
              "relative px-3 py-1.5 text-xs font-medium transition-all",
              "hover:text-slate-900 dark:hover:text-slate-100",
              scope.mode === mode
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            )}
          >
            {SCOPE_LABELS[mode]}
          </Button>
        ))}
      </div>

      {/* Date Range Picker (shown when range mode is active) */}
      {scope.mode === "range" && (
        <Popover open={rangePickerOpen} onOpenChange={setRangePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "gap-2 text-xs font-medium border-slate-300 dark:border-slate-600",
                (!tempStart || !tempEnd) && "text-slate-500"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {tempStart && tempEnd ? (
                <span className="font-numbers">
                  {formatDate(tempStart.toISOString().split("T")[0])} –{" "}
                  {formatDate(tempEnd.toISOString().split("T")[0])}
                </span>
              ) : (
                <span>בחר טווח</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4 space-y-4" align="start">
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                תאריך התחלה
              </div>
              <Calendar
                mode="single"
                selected={tempStart}
                onSelect={(date) => setTempStart(date)}
                initialFocus
                className="border rounded-md"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                תאריך סיום
              </div>
              <Calendar
                mode="single"
                selected={tempEnd}
                onSelect={(date) => setTempEnd(date)}
                className="border rounded-md"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleApplyRange}
                disabled={!tempStart || !tempEnd}
                className="flex-1"
              >
                החל
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearRange}
                className="gap-1"
              >
                <X className="h-3.5 w-3.5" />
                נקה
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
