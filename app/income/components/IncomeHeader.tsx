"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, User, Download, Printer, Upload, CalendarDays, MoreVertical } from "lucide-react";
import Link from "next/link";
import { MONTH_NAMES } from "../utils";
import type { MonthPaymentStatus } from "../data";
import { cn } from "@/lib/utils";

interface IncomeHeaderProps {
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onExportCSV: () => void;
  onPrint: () => void;
  onImportFromCalendar?: () => void;
  monthPaymentStatuses?: Record<number, MonthPaymentStatus>;
}

export function IncomeHeader({
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  isDarkMode,
  onToggleDarkMode,
  onExportCSV,
  onPrint,
  onImportFromCalendar,
  monthPaymentStatuses,
}: IncomeHeaderProps) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <header className="rounded-2xl bg-white/80 dark:bg-slate-900/80 px-3 sm:px-4 py-3 shadow-sm backdrop-blur border border-slate-100 dark:border-slate-800 print:shadow-none print:border-slate-200">
      {/* Mobile: Stack layout, Desktop: Row layout */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Row 1: Logo + Title + Mobile Actions */}
        <div className="flex items-center justify-between md:justify-start gap-3">
          {/* Logo + Title */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-sm shrink-0">
              🎹
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

          {/* Mobile-only: Compact actions dropdown */}
          <div className="flex items-center gap-1 md:hidden print:hidden">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={onToggleDarkMode}
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onImportFromCalendar && (
                  <DropdownMenuItem onClick={onImportFromCalendar}>
                    <CalendarDays className="h-4 w-4 ml-2" />
                    ייבא מהיומן
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/income/import" className="flex items-center">
                    <Upload className="h-4 w-4 ml-2" />
                    ייבוא
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportCSV}>
                  <Download className="h-4 w-4 ml-2" />
                  ייצוא
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onPrint}>
                  <Printer className="h-4 w-4 ml-2" />
                  הדפס
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Row 2 on mobile / Right side on desktop: Controls */}
        <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-3 print:hidden">
          {/* Month/Year Selectors - Always visible */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Select
              value={selectedMonth.toString()}
              onValueChange={(v) => onMonthChange(parseInt(v))}
            >
              <SelectTrigger className="w-[100px] sm:w-[130px] h-8 sm:h-9 text-xs sm:text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <span className="flex items-center gap-1.5 sm:gap-2">
                  <SelectValue />
                  {monthPaymentStatuses?.[selectedMonth] && monthPaymentStatuses[selectedMonth] !== "empty" && (
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
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MONTH_NAMES).map(([value, name]) => {
                  const monthNum = parseInt(value);
                  const status = monthPaymentStatuses?.[monthNum];
                  return (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        {name}
                        {status && status !== "empty" && (
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              status === "all-paid"
                                ? "bg-emerald-500"
                                : "bg-red-500"
                            )}
                            title={status === "all-paid" ? "הכל שולם" : "יש עבודות שלא שולמו"}
                          />
                        )}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => onYearChange(parseInt(v))}
            >
              <SelectTrigger className="w-[70px] sm:w-[90px] h-8 sm:h-9 text-xs sm:text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
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

          {/* Desktop-only: Import/Export/Print Buttons */}
          <div className="hidden md:flex items-center gap-1">
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
            {/* Calendar Import Button */}
            {onImportFromCalendar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onImportFromCalendar}
                className="h-9 px-3 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/30"
              >
                <CalendarDays className="h-4 w-4 ml-1" />
                ייבא מהיומן
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-9 px-3 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-900/30"
            >
              <Link href="/income/import">
                <Upload className="h-4 w-4 ml-1" />
                ייבוא
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportCSV}
              className="h-9 px-3 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4 ml-1" />
              ייצוא
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrint}
              className="h-9 px-3 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
            >
              <Printer className="h-4 w-4 ml-1" />
              הדפס
            </Button>
          </div>

          {/* Desktop-only: Dark mode + User */}
          <div className="hidden md:flex items-center gap-1">
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
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <User className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

