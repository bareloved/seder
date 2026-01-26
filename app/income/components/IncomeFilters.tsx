"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { Search, X, ChevronDown, Plus, ChevronRight, ChevronLeft, Filter, CalendarPlus, Loader2, ArrowUpDown } from "lucide-react";
import type { SortColumn } from "./income-table/IncomeTableHeader";
import type { Category } from "@/db/schema";
import { ViewMode } from "./ViewModeToggle";
import { CategoryChip } from "./CategoryChip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { MonthPaymentStatus } from "../data";

interface IncomeFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  clients: string[];
  selectedClient: string;
  onClientChange: (client: string) => void;
  categories: Category[];
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  onNewEntry?: () => void;
  onEditCategories?: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  // Year/Month props
  year: number;
  month: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onMonthYearChange?: (month: number, year: number) => void;
  monthPaymentStatuses: Record<number, MonthPaymentStatus>;
  // Calendar import props
  isGoogleConnected?: boolean;
  onImportFromCalendar?: () => void;
  // Loading states
  isNavigating?: boolean;
  isImporting?: boolean;
  // Sort props
  sortColumn?: SortColumn;
  sortDirection?: "asc" | "desc";
  onSort?: (column: SortColumn) => void;
}

// Sort options with Hebrew labels
const SORT_OPTIONS: { value: SortColumn; label: string }[] = [
  { value: "date", label: "תאריך" },
  { value: "description", label: "תיאור" },
  { value: "amount", label: "סכום" },
  { value: "category", label: "קטגוריה" },
  { value: "status", label: "סטטוס" },
];

export function IncomeFilters({
  searchQuery,
  onSearchChange,
  clients,
  selectedClient,
  onClientChange,
  categories,
  selectedCategories,
  onCategoryChange,
  onNewEntry,
  year,
  month,
  onYearChange,
  onMonthChange,
  onMonthYearChange,
  monthPaymentStatuses,
  isGoogleConnected,
  onImportFromCalendar,
  isNavigating,
  isImporting,
  // Sort props
  sortColumn = "date",
  sortDirection = "asc",
  onSort,
}: IncomeFiltersProps) {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = React.useState(false);

  // Dynamic year range state
  const [minYear, setMinYear] = React.useState(year - 1);
  const [maxYear, setMaxYear] = React.useState(year + 1);

  // Update range when prop changes, if outside current range
  React.useEffect(() => {
    if (year < minYear) setMinYear(year - 1);
    if (year > maxYear) setMaxYear(year + 1);
  }, [year, minYear, maxYear]);

  const loadEarlierYears = (e: React.MouseEvent) => {
    e.preventDefault();
    setMinYear(prev => prev - 2);
  };

  const loadLaterYears = (e: React.MouseEvent) => {
    e.preventDefault();
    setMaxYear(prev => prev + 2);
  };

  // Generate array of years
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (month === 1) {
      if (onMonthYearChange) {
        onMonthYearChange(12, year - 1);
      } else {
        onMonthChange(12);
        onYearChange(year - 1);
      }
    } else {
      onMonthChange(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      if (onMonthYearChange) {
        onMonthYearChange(1, year + 1);
      } else {
        onMonthChange(1);
        onYearChange(year + 1);
      }
    } else {
      onMonthChange(month + 1);
    }
  };

  // Helper to determine dot color for a given month status
  const getStatusDot = (status: MonthPaymentStatus) => {
    if (status === "has-unpaid") return <span className="w-1.5 h-1.5 rounded-full bg-red-500/80 shrink-0" />;
    if (status === "all-paid") return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 shrink-0" />;
    return null; // empty or mixed without unpaid (though logic implies empty)
  };

  const monthName = new Date(year, month - 1).toLocaleString('he-IL', { month: 'long' });
  const currentMonthStatus = monthPaymentStatuses[month];

  return (
    <div className="w-full flex flex-col-reverse md:flex-row items-center justify-between gap-2 md:gap-4 p-1">

      {/* Right Side: Filters & Search & Add (Desktop only) */}
      <div className="hidden md:flex items-center gap-3 flex-1 w-full md:w-auto justify-start">

        {/* Add Entry Button */}
        {onNewEntry && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onNewEntry}
                size="icon"
                className="h-9 w-9 rounded-full bg-[#2ecc71] hover:bg-[#27ae60] text-white shadow-sm shrink-0 transition-all"
                data-tour="add-button"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>עבודה חדשה</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Search Bar */}
        <div className="relative flex-1 max-w-[240px] group">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-600 transition-colors pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="חיפוש..."
            className="h-9 w-full bg-white dark:bg-card border-slate-200 dark:border-border focus:border-slate-300 pr-9 text-slate-700 text-right placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Desktop Filter Dropdowns */}
        <div className="flex items-center gap-3">
          {/* Categories */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                {selectedCategories.length === 0 ? "קטגוריות" : `${selectedCategories.length} נבחרו`}
                <ChevronDown className="h-3 w-3 opacity-50 mr-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-36" align="start">
              <DropdownMenuItem onClick={() => onCategoryChange([])} className="justify-start bg-slate-50 dark:bg-transparent">
                כל הקטגוריות
              </DropdownMenuItem>
              {categories.filter(c => !c.isArchived).map((category) => (
                <DropdownMenuItem
                  key={category.id}
                  onClick={() => {
                    const newCats = selectedCategories.includes(category.id)
                      ? selectedCategories.filter(c => c !== category.id)
                      : [...selectedCategories, category.id];
                    onCategoryChange(newCats);
                  }}
                  className="justify-between"
                >
                  <CategoryChip category={category} size="sm" withIcon={true} />
                  {selectedCategories.includes(category.id) && <span className="text-emerald-500">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clients */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                {selectedClient === "all" ? "לקוחות" : selectedClient}
                <ChevronDown className="h-3 w-3 opacity-50 mr-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-36 max-h-[300px] overflow-y-auto" align="start">
              <DropdownMenuItem onClick={() => onClientChange("all")} className="justify-start bg-slate-50 dark:bg-transparent">
                כל הלקוחות
              </DropdownMenuItem>
              {clients.map((client) => (
                <DropdownMenuItem
                  key={client}
                  onClick={() => onClientChange(client)}
                  className="justify-start"
                >
                  {client}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Dropdown */}
          {onSort && (
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal gap-1.5">
                  <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                  {SORT_OPTIONS.find(o => o.value === sortColumn)?.label || "מיון"}
                  <span className="text-[10px] opacity-50">{sortDirection === "asc" ? "↑" : "↓"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-32" align="start">
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onSort(option.value)}
                    className="justify-between"
                  >
                    <span>{option.label}</span>
                    {sortColumn === option.value && (
                      <span className="text-emerald-500 text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

      </div>

      {/* Date Selectors - Order: Filter (mobile) | Month | Year */}
      <div className="flex items-center gap-2 w-full md:w-auto">

        {/* Mobile Filter Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsFilterSheetOpen(true)}
          className="md:hidden h-9 w-9 bg-white dark:bg-card border-slate-200 dark:border-border shrink-0"
        >
          <Filter className="h-4 w-4" />
        </Button>

        {/* Calendar Import Button - Mobile (icon only) */}
        {isGoogleConnected && onImportFromCalendar && (
          <Button
            variant="outline"
            size="icon"
            onClick={onImportFromCalendar}
            disabled={isImporting}
            className="md:hidden h-9 w-9 bg-white dark:bg-card border-slate-200 dark:border-border text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 shrink-0 disabled:opacity-50"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
          </Button>
        )}

        {/* Calendar Import Button - Desktop (with label) */}
        {isGoogleConnected && onImportFromCalendar && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onImportFromCalendar}
                disabled={isImporting}
                className="h-9 gap-2 bg-white dark:bg-card border-slate-200 dark:border-border text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hidden md:flex disabled:opacity-50"
                data-tour="calendar-import"
              >
                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                <span className="text-sm">{isImporting ? "מייבא..." : "ייבוא"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>ייבוא מהיומן</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Month Selector Dropdown with Arrows */}
        <div className="flex items-center bg-white dark:bg-card rounded-md border border-slate-200 dark:border-border p-0.5 h-9">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-sm"
            onClick={handlePrevMonth}
          >
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </Button>

          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 min-w-[80px] md:min-w-[120px] justify-center gap-2 text-slate-700 dark:text-slate-300 font-normal px-1 md:px-2 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {isNavigating ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : (
                  <>
                    <span>{monthName}</span>
                    {getStatusDot(currentMonthStatus)}
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[150px]" align="start">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const mName = new Date(year, m - 1).toLocaleString('he-IL', { month: 'long' });
                const status = monthPaymentStatuses[m];
                return (
                  <DropdownMenuItem
                    key={m}
                    onClick={() => onMonthChange(m)}
                    className={cn(
                      "flex items-center justify-between gap-4 cursor-pointer",
                      month === m && "bg-slate-50 dark:bg-card font-medium"
                    )}
                  >
                    <span>{mName}</span>
                    {getStatusDot(status)}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-sm"
            onClick={handleNextMonth}
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Button>
        </div>

        {/* Year Dropdown */}
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 px-2.5 justify-center bg-white dark:bg-card border-slate-200 dark:border-border text-slate-700 dark:text-slate-300 font-normal">
              {year}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-0" align="center">
            {/* Load Earlier Button */}
            <div className="flex justify-center p-1 border-b border-slate-100 dark:border-border mb-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-slate-400 hover:text-slate-600 w-full"
                onClick={loadEarlierYears}
              >
                <ChevronDown className="h-3 w-3 rotate-180" />
              </Button>
            </div>

            <div className="max-h-[300px] overflow-y-auto no-scrollbar">
              {years.map((y) => (
                <DropdownMenuItem
                  key={y}
                  onClick={() => onYearChange(y)}
                  className={cn(
                    "justify-center text-center px-4 cursor-pointer",
                    year === y && "bg-slate-50 dark:bg-card font-medium"
                  )}
                >
                  {y}
                </DropdownMenuItem>
              ))}
            </div>

            {/* Load Later Button */}
            <div className="flex justify-center p-1 border-t border-slate-100 dark:border-border mt-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-slate-400 hover:text-slate-600 w-full"
                onClick={loadLaterYears}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Filter Sheet */}
      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="bottom" className="p-4 space-y-4" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>סינון</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {/* Mobile Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="חיפוש..."
                className="h-11 pr-9 bg-white dark:bg-card border-slate-200 dark:border-border"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              )}
            </div>
            {/* Mobile Categories Dropdown */}
            <div className="space-y-2">
              <p className="text-sm font-medium">קטגוריות</p>
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full h-11 justify-between text-slate-600 dark:text-slate-300 font-normal">
                    {selectedCategories.length === 0 ? "כל הקטגוריות" : `${selectedCategories.length} נבחרו`}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-[400px]" align="start">
                  <DropdownMenuItem onClick={() => onCategoryChange([])} className="justify-start bg-slate-50 dark:bg-transparent">
                    כל הקטגוריות
                  </DropdownMenuItem>
                  {categories.filter(c => !c.isArchived).map((category) => (
                    <DropdownMenuItem
                      key={category.id}
                      onClick={() => {
                        const newCats = selectedCategories.includes(category.id)
                          ? selectedCategories.filter(c => c !== category.id)
                          : [...selectedCategories, category.id];
                        onCategoryChange(newCats);
                      }}
                      className="justify-between"
                    >
                      <CategoryChip category={category} size="sm" withIcon={true} />
                      {selectedCategories.includes(category.id) && <span className="text-emerald-500">✓</span>}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {/* Mobile Clients Dropdown */}
            {clients.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">לקוחות</p>
                <DropdownMenu dir="rtl">
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full h-11 justify-between text-slate-600 dark:text-slate-300 font-normal">
                      {selectedClient === "all" ? "כל הלקוחות" : selectedClient}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-[400px] max-h-[300px] overflow-y-auto" align="start">
                    <DropdownMenuItem onClick={() => onClientChange("all")} className="justify-start bg-slate-50 dark:bg-transparent">
                      כל הלקוחות
                    </DropdownMenuItem>
                    {clients.map((client) => (
                      <DropdownMenuItem
                        key={client}
                        onClick={() => onClientChange(client)}
                        className="justify-between"
                      >
                        {client}
                        {selectedClient === client && <span className="text-emerald-500">✓</span>}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Mobile Sort Dropdown */}
            {onSort && (
              <div className="space-y-2">
                <p className="text-sm font-medium">מיון</p>
                <DropdownMenu dir="rtl">
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full h-11 justify-between text-slate-600 dark:text-slate-300 font-normal">
                      <span className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4 opacity-60" />
                        {SORT_OPTIONS.find(o => o.value === sortColumn)?.label || "מיון"}
                        <span className="text-xs opacity-50">{sortDirection === "asc" ? "↑" : "↓"}</span>
                      </span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[calc(100vw-2rem)] max-w-[400px]" align="start">
                    {SORT_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => onSort(option.value)}
                        className="justify-between"
                      >
                        <span>{option.label}</span>
                        {sortColumn === option.value && (
                          <span className="text-emerald-500 text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Mobile Calendar Import Button */}
            {isGoogleConnected && onImportFromCalendar && (
              <div className="pt-2 border-t border-slate-100">
                <Button
                  onClick={() => {
                    onImportFromCalendar();
                    setIsFilterSheetOpen(false);
                  }}
                  disabled={isImporting}
                  className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}
                  <span>{isImporting ? "מייבא..." : "ייבוא מהיומן"}</span>
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
