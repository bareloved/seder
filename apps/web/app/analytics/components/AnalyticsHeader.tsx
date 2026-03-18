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
      {/* Month/Year Navigation */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-0.5">
          <Button
            variant="outline"
            size="icon"
            onClick={period === "yearly" ? () => onYearChange(selectedYear - 1) : handlePreviousMonth}
            className="h-8 w-8 sm:h-9 sm:w-9 bg-white dark:bg-card border-slate-200 dark:border-border"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Month Selector (hidden in yearly mode) */}
          {period === "monthly" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[80px] sm:w-[110px] h-8 sm:h-9 text-xs sm:text-sm bg-white dark:bg-card border-slate-200 dark:border-border justify-between px-3 font-semibold"
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
                      className="flex-row-reverse"
                    >
                      {name}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="outline"
            size="icon"
            onClick={period === "yearly" ? () => onYearChange(selectedYear + 1) : handleNextMonth}
            className="h-8 w-8 sm:h-9 sm:w-9 bg-white dark:bg-card border-slate-200 dark:border-border"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Year Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="w-[70px] sm:w-[90px] h-8 sm:h-9 text-xs sm:text-sm bg-white dark:bg-card border-slate-200 dark:border-border justify-between px-3 font-semibold font-numbers"
            >
              {selectedYear}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-16 px-0 min-w-0">
            {years.map((year) => (
              <DropdownMenuItem
                key={year}
                onClick={() => onYearChange(year)}
                className="justify-center font-numbers font-medium px-2"
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
