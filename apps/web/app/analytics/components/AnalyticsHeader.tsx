"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import type { AnalyticsPeriod } from "../types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const MONTH_NAMES: Record<number, string> = {
  1: "ינואר",
  2: "פברואר",
  3: "מרץ",
  4: "אפריל",
  5: "מאי",
  6: "יוני",
  7: "יולי",
  8: "אוגוסט",
  9: "ספטמבר",
  10: "אוקטובר",
  11: "נובמבר",
  12: "דצמבר",
};

interface AnalyticsHeaderProps {
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

export function AnalyticsHeader({
  period,
  onPeriodChange,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
}: AnalyticsHeaderProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      onYearChange(selectedYear - 1);
      onMonthChange(12);
    } else {
      onMonthChange(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      onYearChange(selectedYear + 1);
      onMonthChange(1);
    } else {
      onMonthChange(selectedMonth + 1);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      {/* Month/Year Navigation — unified container matching income page */}
      <div className="flex items-center gap-2">
        {/* Month picker in single bordered container */}
        <div className="flex items-center bg-white dark:bg-card rounded-md border border-slate-200 dark:border-border p-0.5 h-9">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-sm"
            onClick={period === "yearly" ? () => onYearChange(selectedYear - 1) : handlePreviousMonth}
          >
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </Button>

          {/* Month Selector (hidden in yearly mode) */}
          {period === "monthly" && (
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 min-w-[80px] md:min-w-[120px] justify-center gap-2 text-slate-700 dark:text-slate-300 font-normal px-1 md:px-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span>{MONTH_NAMES[selectedMonth]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-[150px]" align="start">
                {Object.entries(MONTH_NAMES).map(([value, name]) => {
                  const monthNum = parseInt(value);
                  return (
                    <DropdownMenuItem
                      key={value}
                      onClick={() => onMonthChange(monthNum)}
                      className={cn(
                        "flex items-center justify-between gap-4 cursor-pointer",
                        selectedMonth === monthNum && "bg-slate-50 dark:bg-card font-medium"
                      )}
                    >
                      <span>{name}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-sm"
            onClick={period === "yearly" ? () => onYearChange(selectedYear + 1) : handleNextMonth}
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Button>
        </div>

        {/* Year Selector */}
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 px-2.5 justify-center bg-white dark:bg-card border-slate-200 dark:border-border text-slate-700 dark:text-slate-300 font-normal">
              {selectedYear}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-0" align="center">
            {years.map((year) => (
              <DropdownMenuItem
                key={year}
                onClick={() => onYearChange(year)}
                className={cn(
                  "justify-center text-center px-4 cursor-pointer",
                  selectedYear === year && "bg-slate-50 dark:bg-card font-medium"
                )}
              >
                {year}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Period Toggle */}
      <div className="inline-flex rounded-lg border border-slate-200 dark:border-border overflow-hidden" role="group">
        <Button
          variant={period === "monthly" ? "default" : "ghost"}
          size="sm"
          onClick={() => onPeriodChange("monthly")}
          className={cn(
            "rounded-none h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm",
            period === "monthly"
              ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              : "hover:bg-slate-50 dark:hover:bg-muted/50"
          )}
        >
          חודשי
        </Button>
        <Button
          variant={period === "yearly" ? "default" : "ghost"}
          size="sm"
          onClick={() => onPeriodChange("yearly")}
          className={cn(
            "rounded-none h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm",
            period === "yearly"
              ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
              : "hover:bg-slate-50 dark:hover:bg-muted/50"
          )}
        >
          שנתי
        </Button>
      </div>
    </div>
  );
}
