"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Moon, Sun, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, BarChart3 } from "lucide-react";
import Link from "next/link";
import { MONTH_NAMES } from "../utils";
import type { MonthPaymentStatus } from "../data";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import UserButton from "@/components/auth/user-button";
import { GoogleConnectionButton } from "./GoogleConnectionButton";

interface IncomeHeaderProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onMonthYearChange?: (month: number, year: number) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onExportCSV: () => void;
  onImportFromCalendar?: () => void;
  monthPaymentStatuses?: Record<number, MonthPaymentStatus>;
  isGoogleConnected?: boolean;
  onGoogleConnectionChange?: () => void;
  user: { name: string | null; email: string; image: string | null };
}

export function IncomeHeader({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  onMonthYearChange,
  isDarkMode,
  onToggleDarkMode,
  onExportCSV,
  onImportFromCalendar,
  monthPaymentStatuses,
  isGoogleConnected,
  onGoogleConnectionChange,
  user,
}: IncomeHeaderProps) {
  const currentYear = new Date().getFullYear();
  // Show 5 years: 2 years before and 2 years after current year
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Month navigation handlers
  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      if (onMonthYearChange) {
        onMonthYearChange(12, selectedYear - 1);
      } else {
        onYearChange(selectedYear - 1);
        onMonthChange(12);
      }
    } else {
      onMonthChange(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      if (onMonthYearChange) {
        onMonthYearChange(1, selectedYear + 1);
      } else {
        onYearChange(selectedYear + 1);
        onMonthChange(1);
      }
    } else {
      onMonthChange(selectedMonth + 1);
    }
  };

  return (
    <header className="rounded-2xl bg-white/80 dark:bg-card/80 px-3 sm:px-4 py-3 shadow-sm backdrop-blur border border-slate-100 dark:border-border print:shadow-none print:border-slate-200">
      {/* Mobile: Stack layout, Desktop: Row layout */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Row 1: Logo + Title + Mobile Actions */}
        <div className="flex items-center justify-between md:justify-start gap-3">
          {/* Logo + Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 text-slate-900 dark:text-slate-100">
              <Logo className="w-full h-full" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                מעקב הכנסות
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                ניהול עבודות וחשבוניות
              </p>
            </div>
          </div>
        </div>

        {/* Row 2 on mobile / Right side on desktop: Controls */}
        <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 print:hidden">
          {/* Month/Year Selectors - Always visible */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Month navigation with arrows */}
            <div className="flex items-center gap-0.5">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousMonth}
                className="h-8 w-8 sm:h-9 sm:w-9 bg-white dark:bg-card border-slate-200 dark:border-border"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[80px] sm:w-[110px] h-8 sm:h-9 text-xs sm:text-sm bg-white dark:bg-card border-slate-200 dark:border-border justify-between px-3 font-semibold"
                  >
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      {MONTH_NAMES[selectedMonth]}
                      {monthPaymentStatuses?.[selectedMonth] &&
                        monthPaymentStatuses[selectedMonth] !== "empty" && (
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              monthPaymentStatuses[selectedMonth] === "all-paid"
                                ? "bg-emerald-500"
                                : "bg-red-500"
                            )}
                          />
                        )}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(MONTH_NAMES).map(([value, name]) => {
                    const monthNum = parseInt(value);
                    const status = monthPaymentStatuses?.[monthNum];
                    return (
                      <DropdownMenuItem
                        key={value}
                        onClick={() => onMonthChange(monthNum)}
                        className="flex-row-reverse"
                      >
                        <span className="flex items-center justify-between gap-2 w-full flex-row-reverse">
                          {name}
                          {status && status !== "empty" && (
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full shrink-0",
                                status === "all-paid"
                                  ? "bg-emerald-500"
                                  : "bg-red-500"
                              )}
                              title={
                                status === "all-paid"
                                  ? "הכל שולם"
                                  : "יש עבודות שלא שולמו"
                              }
                            />
                          )}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8 sm:h-9 sm:w-9 bg-white dark:bg-card border-slate-200 dark:border-border"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

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
                  <DropdownMenuItem key={year} onClick={() => onYearChange(year)} className="justify-center font-numbers font-medium px-2">
                    {year}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Controls: Analytics, Google Connection, Calendar, Dark mode, User */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/analytics">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>אנליטיקה</p>
              </TooltipContent>
            </Tooltip>
            <GoogleConnectionButton
              isConnected={isGoogleConnected ?? false}
              onConnectionChange={onGoogleConnectionChange}
            />
            {onImportFromCalendar && isGoogleConnected && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onImportFromCalendar}
                    className="h-9 w-9 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30"
                  >
                    <CalendarDays className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>ייבא מהיומן</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-9 w-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  onClick={onToggleDarkMode}
                >
                  {isDarkMode ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isDarkMode ? "מצב יום" : "מצב לילה"}</p>
              </TooltipContent>
            </Tooltip>
            <UserButton
              onExportCSV={onExportCSV}
              user={user}
            />
          </div>
        </div>
      </div>
    </header>
  );
}

