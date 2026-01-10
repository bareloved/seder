"use client";

import { Button } from "@/components/ui/button";

import { ArrowRight, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import type { DateRangePreset, MetricType } from "../types";
import { formatDateRangeLabel, MONTH_NAMES } from "../utils";
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
  onMonthChange = () => { },
  onYearChange = () => { },
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
    <header className="rounded-2xl bg-white/80 dark:bg-slate-900/80 px-3 sm:px-4 py-3 shadow-sm backdrop-blur border border-slate-100 dark:border-slate-800 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title Row with Back Button */}
        <div className="flex items-center gap-3">
          <Link href="/income">
            <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2">
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">אנליטיקה</h1>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center w-full md:w-auto">
          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">תקופה:</span>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-[160px] h-9 bg-white dark:bg-slate-950 justify-between font-normal">
                    <span className="truncate">
                      {dateRangePreset === "this-month" && "החודש"}
                      {dateRangePreset === "last-3-months" && "3 חודשים אחרונים"}
                      {dateRangePreset === "specific-year" && "שנה"}
                      {dateRangePreset === "specific-month" && "חודש ספציפי"}
                      {dateRangePreset === "custom" && "תקופה מותאמת"}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[180px]">
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
                <div className="flex items-center gap-1.5 sm:gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* Month navigation with arrows */}
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePreviousMonth}
                      className="h-9 w-9 bg-white dark:bg-slate-950"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-[110px] h-9 text-sm bg-white dark:bg-slate-950 justify-between px-3 font-semibold"
                        >
                          <span className="flex items-center gap-2">
                            {MONTH_NAMES[selectedMonth]}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
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
                      className="h-9 w-9 bg-white dark:bg-slate-950"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-[90px] h-9 text-sm bg-white dark:bg-slate-950 justify-between px-3 font-semibold font-numbers"
                      >
                        {selectedYear}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[90px] min-w-0 max-h-[300px] overflow-y-auto">
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
                <div className="flex items-center gap-1.5 sm:gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onYearChange(selectedYear - 1)}
                      className="h-9 w-9 bg-white dark:bg-slate-950"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-[90px] h-9 text-sm bg-white dark:bg-slate-950 justify-between px-3 font-semibold font-numbers"
                        >
                          {selectedYear}
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[90px] min-w-0 max-h-[300px] overflow-y-auto">
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
                      className="h-9 w-9 bg-white dark:bg-slate-950"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Metric Toggle */}
            <div className="flex items-center gap-2 mr-auto md:mr-0">
              <span className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline-block">מדד:</span>
              <div className="inline-flex rounded-md shadow-sm h-9" role="group">
                <Button
                  variant={metricType === "amount" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onMetricTypeChange("amount")}
                  className="rounded-l-md rounded-r-none h-full"
                >
                  סכום
                </Button>
                <Button
                  variant={metricType === "count" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onMetricTypeChange("count")}
                  className="rounded-r-md rounded-l-none h-full"
                >
                  כמות
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
