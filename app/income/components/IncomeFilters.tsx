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
import { Search, X, ChevronDown, Plus, Filter, Settings2 } from "lucide-react";
import type { Category } from "@/db/schema";
import { CategoryChip } from "./CategoryChip";
import { ViewModeToggle, type ViewMode } from "./ViewModeToggle";
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
  // View mode toggle
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
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
  onEditCategories,
  viewMode,
  onViewModeChange,
}: IncomeFiltersProps) {
  const [isFilterSheetOpen, setIsFilterSheetOpen] = React.useState(false);

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter((c) => c !== category));
    } else {
      onCategoryChange([...selectedCategories, category]);
    }
  };

  const hasCategoryFilter = selectedCategories.length > 0;

  const renderCategoryRow = () => (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
        קטגוריות:
      </span>
      {categories.filter(c => !c.isArchived).map((category) => {
        const isActive = selectedCategories.includes(category.id);
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => toggleCategory(category.id)}
            className={cn(
              "transition-all px-1.5 py-0.5 rounded-full focus:outline-none focus-visible:ring-0",
              isActive ? "bg-slate-100 dark:bg-slate-800/70" : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
            )}
          >
            <CategoryChip
              category={category}
              size="sm"
              className={cn(
                "cursor-pointer",
                !isActive && "opacity-80 hover:opacity-100"
              )}
            />
          </button>
        );
      })}
      {hasCategoryFilter && (
        <button
          onClick={() => onCategoryChange([])}
          className="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline decoration-dotted"
        >
          נקה קטגוריות
        </button>
      )}
      {onEditCategories && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onEditCategories}
              className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>ערוך קטגוריות</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  const renderActiveBadges = () => {
    const hasFilters =
      selectedClient !== "all" ||
      selectedCategories.length > 0 ||
      searchQuery.trim() !== "";

    if (!hasFilters) return null;

    return (
      <div className="flex flex-wrap items-center gap-1 text-[11px] mt-1">
        {searchQuery && (
          <BadgeButton
            label={`חיפוש: ${searchQuery}`}
            onClear={() => onSearchChange("")}
          />
        )}
        {selectedClient !== "all" && (
          <BadgeButton label={`לקוח: ${selectedClient}`} onClear={() => onClientChange("all")} />
        )}
        {selectedCategories.map((categoryId) => {
          const category = categories.find(c => c.id === categoryId);
          return (
            <BadgeButton
              key={categoryId}
              label={category?.name || categoryId}
              onClear={() => toggleCategory(categoryId)}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="print:hidden">
      {/* Mobile: Compact search + filters button */}
      <div className="md:hidden flex flex-col gap-2">
        <div className="flex items-center gap-2">
        {/* Add Button (Mobile) */}
        {onNewEntry && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                size="icon"
                onClick={onNewEntry}
                className="h-9 w-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>עבודה חדשה</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Search - takes up available space */}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="חיפוש..."
            className="h-9 pr-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
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

          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFilterSheetOpen(true)}
            className="h-9 w-9 border-slate-200 dark:border-slate-700"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>


        {renderActiveBadges()}
      </div>

      {/* Category filter - shared for mobile + desktop */}

      {/* Desktop: Full inline filters */}
      <div className="hidden md:flex items-center justify-between gap-4">
        {/* Left side: Search + Add Button + Client Filter */}
        <div className="flex items-center gap-2 flex-1">
          {/* Add Button (Desktop) */}
          {onNewEntry && (
             <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="icon"
                  onClick={onNewEntry}
                  className="h-9 w-9 rounded-full bg-slate-900 hover:bg-slate-800 text-white shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>עבודה חדשה</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="חיפוש..."
              className="h-9 pr-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
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

          {/* Client Filter - Only shows clients from current month */}
          {clients.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[160px] h-9 text-sm justify-between bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-normal px-3"
                >
                  <span className="truncate">
                    {selectedClient === "all" || !selectedClient
                      ? "כל הלקוחות"
                      : selectedClient}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[160px] max-h-[300px] overflow-y-auto">
                <DropdownMenuItem onClick={() => onClientChange("all")} className="justify-end">
                  כל הלקוחות
                </DropdownMenuItem>
                {clients
                  .filter((client) => client && client.trim() !== "")
                  .map((client) => (
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
          )}
        </div>

        {/* Right side: View Mode Toggle */}
        <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      </div>
      {/* Desktop category row under search section */}
      <div className="hidden md:block">
        {renderCategoryRow()}
      </div>

      {/* Mobile filter sheet */}
      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="bottom" className="p-4 space-y-4">
          <SheetHeader>
            <SheetTitle>סינון</SheetTitle>
          </SheetHeader>

          {/* Client Filter */}
          {clients.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">לקוח</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedClient === "all" ? "default" : "outline"}
                  onClick={() => onClientChange("all")}
                  className="h-9 px-3"
                >
                  כל הלקוחות
                </Button>
                {clients
                  .filter((client) => client && client.trim() !== "")
                  .slice(0, 12)
                  .map((client) => (
                    <Button
                      key={client}
                      variant={selectedClient === client ? "default" : "outline"}
                      onClick={() => onClientChange(client)}
                      className="h-9 px-3"
                    >
                      {client}
                    </Button>
                  ))}
              </div>
            </div>
          )}

          {/* Categories - mirror web chips style */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-right">קטגוריות</p>
              {onEditCategories && (
                <button
                  onClick={() => {
                    setIsFilterSheetOpen(false);
                    onEditCategories();
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <Settings2 className="h-3 w-3" />
                  ערוך
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-end">
              {categories.filter(c => !c.isArchived).map((category) => {
                const isActive = selectedCategories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className={cn(
                      "transition-all px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus-visible:ring-0",
                      isActive
                        ? "ring-1 ring-slate-300 dark:ring-slate-600"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    )}
                  >
                    <CategoryChip
                      category={category}
                      size="sm"
                      className={cn(
                        "cursor-pointer",
                        !isActive && "opacity-80 hover:opacity-100"
                      )}
                    />
                  </button>
                );
              })}
            </div>
            {selectedCategories.length > 0 && (
              <button
                onClick={() => onCategoryChange([])}
                className="text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline decoration-dotted"
              >
                נקה קטגוריות
              </button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsFilterSheetOpen(false)}>
              סגור
            </Button>
            <Button onClick={() => setIsFilterSheetOpen(false)} className="bg-slate-900 text-white hover:bg-slate-800">
              החל
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function BadgeButton({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
    >
      <span>{label}</span>
      <X className="h-3 w-3" />
    </button>
  );
}

