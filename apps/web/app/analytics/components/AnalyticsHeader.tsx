"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import type { DateRangePreset, MetricType } from "../types";
import { MONTH_NAMES } from "../utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AnalyticsHeaderProps {
  dateRangePreset: DateRangePreset;
  onDateRangeChange: (preset: DateRangePreset) => void;
  metricType: MetricType;
  onMetricTypeChange: (metric: MetricType) => void;
  selectedMonth?: number;
  selectedYear?: number;
  onMonthChange?: (month: number) => void;
  onYearChange?: (year: number) => void;
}

export function AnalyticsHeader({
  dateRangePreset,
  onDateRangeChange,
  metricType,
  onMetricTypeChange,
  selectedMonth = new Date().getMonth() + 1,
  selectedYear = new Date().getFullYear(),
  onMonthChange = () => {},
  onYearChange = () => {},
}: AnalyticsHeaderProps) {
  const currentYear = new Date().getFullYear();
  // Show 7 years: 3 years before and 3 years after current year
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);

  // Month navigation handlers
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
      {/* Date Range Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">תקופה:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-[140px] h-9 justify-between font-normal text-sm border-slate-200 dark:border-border"
            >
              <span className="truncate">
                {dateRangePreset === "this-month" && "החודש"}
                {dateRangePreset === "last-3-months" && "3 חודשים אחרונים"}
                {dateRangePreset === "specific-year" && "שנה"}
                {dateRangePreset === "specific-month" && "חודש ספציפי"}
                {dateRangePreset === "custom" && "תקופה מותאמת"}
              </span>
              <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[160px]">
            <DropdownMenuItem onClick={() => onDateRangeChange("this-month")}>
              החודש
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDateRangeChange("last-3-months")}>
              3 חודשים אחרונים
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDateRangeChange("specific-year")}>
              שנה
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDateRangeChange("specific-month")}>
              חודש ספציפי
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Month/Year Selectors - Visible only when specific-month is selected */}
        {dateRangePreset === "specific-month" && (
          <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
              className="h-9 w-9 border-slate-200 dark:border-border"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[100px] h-9 text-sm justify-between px-3 font-medium border-slate-200 dark:border-border"
                >
                  <span>{MONTH_NAMES[selectedMonth]}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(MONTH_NAMES).map(([value, name]) => {
                  const monthNum = parseInt(value);
                  return (
                    <DropdownMenuItem
                      key={value}
                      onClick={() => onMonthChange(monthNum)}
                      className={cn(
                        "flex-row-reverse justify-between",
                        selectedMonth === monthNum && "bg-accent"
                      )}
                    >
                      {name}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              className="h-9 w-9 border-slate-200 dark:border-border"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[80px] h-9 text-sm justify-between px-3 font-medium font-numbers border-slate-200 dark:border-border"
                >
                  {selectedYear}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[80px] min-w-0">
                {years.map((year) => (
                  <DropdownMenuItem
                    key={year}
                    onClick={() => onYearChange(year)}
                    className={cn(
                      "justify-center font-numbers font-medium",
                      selectedYear === year && "bg-accent"
                    )}
                  >
                    {year}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Year Selector - Visible only when specific-year is selected */}
        {dateRangePreset === "specific-year" && (
          <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onYearChange(selectedYear - 1)}
              className="h-9 w-9 border-slate-200 dark:border-border"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[80px] h-9 text-sm justify-between px-3 font-medium font-numbers border-slate-200 dark:border-border"
                >
                  {selectedYear}
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[80px] min-w-0">
                {years.map((year) => (
                  <DropdownMenuItem
                    key={year}
                    onClick={() => onYearChange(year)}
                    className={cn(
                      "justify-center font-numbers font-medium",
                      selectedYear === year && "bg-accent"
                    )}
                  >
                    {year}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="icon"
              onClick={() => onYearChange(selectedYear + 1)}
              className="h-9 w-9 border-slate-200 dark:border-border"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Metric Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">מדד:</span>
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-border overflow-hidden" role="group">
          <Button
            variant={metricType === "amount" ? "default" : "ghost"}
            size="sm"
            onClick={() => onMetricTypeChange("amount")}
            className={cn(
              "rounded-none h-9 px-4",
              metricType === "amount"
                ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                : "hover:bg-slate-50 dark:hover:bg-muted/50"
            )}
          >
            סכום
          </Button>
          <Button
            variant={metricType === "count" ? "default" : "ghost"}
            size="sm"
            onClick={() => onMetricTypeChange("count")}
            className={cn(
              "rounded-none h-9 px-4",
              metricType === "count"
                ? "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                : "hover:bg-slate-50 dark:hover:bg-muted/50"
            )}
          >
            כמות
          </Button>
        </div>
      </div>
    </div>
  );
}
