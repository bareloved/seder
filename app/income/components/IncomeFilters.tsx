"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search, X, LayoutGrid, FileText, Clock, CheckCircle } from "lucide-react";
import { FilterType } from "../types";

interface IncomeFiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  clients: string[];
  selectedClient: string;
  onClientChange: (client: string) => void;
  readyToInvoiceCount: number;
  overdueCount: number;
}

// Reusable filter buttons component
function FilterButtons({
  activeFilter,
  onFilterChange,
  readyToInvoiceCount,
  overdueCount,
}: {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  readyToInvoiceCount: number;
  overdueCount: number;
}) {
  return (
    <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
      {/* All */}
      <button
        onClick={() => onFilterChange("all")}
        title="הכל"
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center transition-all",
          activeFilter === "all"
            ? "bg-slate-800 dark:bg-slate-200"
            : "hover:bg-slate-100 dark:hover:bg-slate-700"
        )}
      >
        <LayoutGrid
          className={cn(
            "h-4 w-4",
            activeFilter === "all"
              ? "text-white dark:text-slate-800"
              : "text-slate-600 dark:text-slate-400"
          )}
        />
      </button>

      {/* Ready to Invoice */}
      <button
        onClick={() => onFilterChange("ready-to-invoice")}
        title="לחשבונית"
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center transition-all relative",
          activeFilter === "ready-to-invoice"
            ? "bg-sky-100 dark:bg-sky-900/50"
            : "hover:bg-slate-100 dark:hover:bg-slate-700"
        )}
      >
        <FileText
          className={cn(
            "h-4 w-4",
            activeFilter === "ready-to-invoice"
              ? "text-sky-600 dark:text-sky-400"
              : "text-sky-400 dark:text-sky-500"
          )}
        />
        {readyToInvoiceCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-sky-500 text-white">
            {readyToInvoiceCount}
          </span>
        )}
      </button>

      {/* Invoiced / Waiting */}
      <button
        onClick={() => onFilterChange("invoiced")}
        title="ממתין לתשלום"
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center transition-all relative",
          activeFilter === "invoiced"
            ? "bg-orange-100 dark:bg-orange-900/50"
            : "hover:bg-slate-100 dark:hover:bg-slate-700"
        )}
      >
        <Clock
          className={cn(
            "h-4 w-4",
            activeFilter === "invoiced"
              ? "text-orange-500 dark:text-orange-400"
              : "text-orange-400 dark:text-orange-500"
          )}
        />
        {overdueCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-red-500 text-white">
            {overdueCount}
          </span>
        )}
      </button>

      {/* Paid */}
      <button
        onClick={() => onFilterChange("paid")}
        title="שולם"
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center transition-all",
          activeFilter === "paid"
            ? "bg-green-100 dark:bg-green-900/50"
            : "hover:bg-slate-100 dark:hover:bg-slate-700"
        )}
      >
        <CheckCircle
          className={cn(
            "h-4 w-4",
            activeFilter === "paid"
              ? "text-green-500 dark:text-green-400"
              : "text-green-400 dark:text-green-500"
          )}
        />
      </button>
    </div>
  );
}

export function IncomeFilters({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  clients,
  selectedClient,
  onClientChange,
  readyToInvoiceCount,
  overdueCount,
}: IncomeFiltersProps) {
  return (
    <div className="print:hidden">
      {/* Mobile: Compact search + filters button */}
      <div className="flex md:hidden items-center gap-2">
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

        {/* Filter buttons - always visible on mobile for quick access */}
        <FilterButtons
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          readyToInvoiceCount={readyToInvoiceCount}
          overdueCount={overdueCount}
        />
      </div>

      {/* Desktop: Full inline filters */}
      <div className="hidden md:flex items-center justify-between gap-4">
        {/* Left side: Search + Client Filter */}
        <div className="flex items-center gap-2 flex-1">
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
            <Select value={selectedClient} onValueChange={onClientChange}>
              <SelectTrigger className="w-[160px] h-9 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="כל הלקוחות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הלקוחות</SelectItem>
                {clients
                  .filter((client) => client && client.trim() !== "")
                  .map((client) => (
                    <SelectItem key={client} value={client}>
                      {client}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Right side: Filter Buttons */}
        <FilterButtons
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          readyToInvoiceCount={readyToInvoiceCount}
          overdueCount={overdueCount}
        />
      </div>
    </div>
  );
}

