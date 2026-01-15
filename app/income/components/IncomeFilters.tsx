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
import { Search, X, ChevronDown, Plus, ChevronRight, ChevronLeft, Filter } from "lucide-react";
import type { Category } from "@/db/schema";
import { ViewMode } from "./ViewModeToggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
}

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
}: IncomeFiltersProps) {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = React.useState(false);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (month === 1) {
      onMonthChange(12);
      onYearChange(year - 1);
    } else {
      onMonthChange(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      onMonthChange(1);
      onYearChange(year + 1);
    } else {
      onMonthChange(month + 1);
    }
  };

  const monthName = new Date(year, month - 1).toLocaleString('he-IL', { month: 'long' });

  return (
    <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 p-1">

      {/* Left Side: Date Selectors (Desktop) - order matched image: Year Year Month */}
      <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar">

        {/* Year Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-9 min-w-[80px] justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-normal">
              <ChevronDown className="h-3 w-3 opacity-50 ml-2" />
              {year}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {[year - 1, year, year + 1].map((y) => (
              <DropdownMenuItem key={y} onClick={() => onYearChange(y)}>
                {y}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Month Selector */}
        <div className="flex items-center bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-700 p-0.5 h-9">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-sm"
            onClick={handlePrevMonth}
          >
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </Button>
          <span className="min-w-[70px] text-center text-sm text-slate-700 dark:text-slate-300">
            {monthName}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-sm"
            onClick={handleNextMonth}
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Button>
        </div>
      </div>

      {/* Right Side: Filters & Search & Add */}
      <div className="flex items-center gap-3 flex-1 w-full md:w-auto justify-end">

        {/* Mobile Filter Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsFilterSheetOpen(true)}
          className="md:hidden h-9 w-9 bg-white"
        >
          <Filter className="h-4 w-4" />
        </Button>

        {/* Desktop Filter Dropdowns */}
        <div className="hidden md:flex items-center gap-3">
          {/* Categories */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                {selectedCategories.length === 0 ? "כל הקטגוריות" : `${selectedCategories.length} נבחרו`}
                <ChevronDown className="h-3 w-3 opacity-50 mr-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuItem onClick={() => onCategoryChange([])} className="justify-end bg-slate-50">
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
                  {category.name}
                  {selectedCategories.includes(category.id) && <span className="text-emerald-500">✓</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clients */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-9 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-normal">
                {selectedClient === "all" ? "כל הלקוחות" : selectedClient}
                <ChevronDown className="h-3 w-3 opacity-50 mr-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 max-h-[300px] overflow-y-auto" align="end">
              <DropdownMenuItem onClick={() => onClientChange("all")} className="justify-end bg-slate-50">
                כל הלקוחות
              </DropdownMenuItem>
              {clients.map((client) => (
                <DropdownMenuItem
                  key={client}
                  onClick={() => onClientChange(client)}
                  className="justify-end"
                >
                  {client}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-[240px] hidden md:block group">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-600 transition-colors pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="חיפוש..."
            className="h-9 w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-slate-300 pr-9 text-slate-700 text-right placeholder:text-slate-400"
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

        {/* Add Entry Button */}
        {onNewEntry && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onNewEntry}
                size="icon"
                className="h-9 w-9 rounded-full bg-[#2ecc71] hover:bg-[#27ae60] text-white shadow-sm shrink-0 transition-all"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>עבודה חדשה</p>
            </TooltipContent>
          </Tooltip>
        )}

      </div>

      {/* Mobile Filter Sheet */}
      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="bottom" className="p-4 space-y-4">
          <SheetHeader>
            <SheetTitle>סינון</SheetTitle>
          </SheetHeader>
          <div className="space-y-4">
            {/* Mobile Categories */}
            <div className="space-y-2">
              <p className="text-sm font-medium">קטגוריות</p>
              <div className="flex flex-wrap gap-2">
                {categories.filter(c => !c.isArchived).map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategories.includes(category.id) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const newCats = selectedCategories.includes(category.id)
                        ? selectedCategories.filter(c => c !== category.id)
                        : [...selectedCategories, category.id];
                      onCategoryChange(newCats);
                    }}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
            {/* Mobile Clients */}
            {clients.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">לקוחות</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedClient === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => onClientChange("all")}
                  >
                    כל הלקוחות
                  </Button>
                  {clients.slice(0, 10).map((client) => (
                    <Button
                      key={client}
                      variant={selectedClient === client ? "default" : "outline"}
                      size="sm"
                      onClick={() => onClientChange(client)}
                    >
                      {client}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
