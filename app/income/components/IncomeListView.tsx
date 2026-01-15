"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ListX, Plus, X } from "lucide-react";
import { IncomeEntry, DisplayStatus, VatType } from "../types";
import type { Category } from "@/db/schema";
import type { ViewMode } from "./ViewModeToggle";
import { IncomeFilters } from "./IncomeFilters";
import { IncomeEntryRow } from "./income-table/IncomeEntryRow";
import { QuickAddCard } from "./income-table/QuickAddCard";
import { MobileQuickAdd } from "./income-table/MobileQuickAdd";
import { formatCurrency } from "../utils";
import { TooltipProvider } from "@/components/ui/tooltip";

// ─────────────────────────────────────────────────────────────────────────────
// Income List View Component
// ─────────────────────────────────────────────────────────────────────────────
// Desktop: Row-cards with header, quick-add, inline editing, and totals
// Mobile: Stacked row-cards (no inline editing)
//
// Column structure (RTL, reorderable on desktop):
// תאריך | תיאור | לקוח | קטגוריה | סכום | סטטוס | פעולות
// ─────────────────────────────────────────────────────────────────────────────

type ColumnKey = "date" | "client" | "category" | "description" | "amount" | "status" | "actions";
const DEFAULT_COLUMN_ORDER: ColumnKey[] = ["date", "client", "category", "description", "amount", "status", "actions"];
const LOCAL_STORAGE_KEY = "income-list-column-order";
const HEADER_WIDTH_MAP: Record<ColumnKey, string> = {
  date: "w-[70px] shrink-0 px-2",
  description: "flex-1 min-w-0 max-w-[420px] px-3",
  client: "w-[110px] shrink-0 px-3",
  category: "w-[100px] shrink-0 px-2",
  amount: "w-[105px] shrink-0 px-3",
  status: "w-[100px] shrink-0 px-2",
  actions: "w-[110px] shrink-0 px-1.5",
};

interface IncomeListViewProps {
  entries: IncomeEntry[];
  clients: string[];
  categories: Category[];
  defaultDate?: string;
  onRowClick: (entry: IncomeEntry) => void;
  onStatusChange: (id: string, status: DisplayStatus) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkInvoiceSent: (id: string) => void;
  onDuplicate: (entry: IncomeEntry) => void;
  onDelete: (id: string) => void;
  onAddEntry: (entry: Omit<IncomeEntry, "id" | "invoiceStatus" | "paymentStatus" | "vatRate" | "includesVat"> & { status?: DisplayStatus, vatType?: VatType, invoiceStatus?: "draft" | "sent" | "paid" | "cancelled", paymentStatus?: "unpaid" | "partial" | "paid", vatRate?: number, includesVat?: boolean }) => void;
  onInlineEdit?: (id: string, field: string, value: string | number) => void;
  onClearFilter?: () => void;
  hasActiveFilter: boolean;
  sortDirection: "asc" | "desc";
  onSortToggle: () => void;
  // Filter/search props
  searchQuery: string;
  onSearchChange: (query: string) => void;
  monthClients: string[];
  selectedClient: string;
  onClientChange: (client: string) => void;
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
  onNewEntry: () => void;
  onEditCategories?: () => void;
  // View mode props
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

// Empty state component (shared between mobile and desktop)
function EmptyState({
  type,
  onClearFilter,
  onAddClick,
}: {
  type: "no-data" | "filtered";
  onClearFilter?: () => void;
  onAddClick?: () => void;
}) {
  if (type === "no-data") {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 sm:py-16 px-4">
        <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <CalendarDays className="h-7 w-7 sm:h-8 sm:w-8 text-slate-400" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
          אין עבודות לחודש הזה
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          התחל על ידי הוספת עבודה חדשה
        </p>
        <Button
          onClick={onAddClick}
          className="bg-emerald-500 hover:bg-emerald-600 text-white h-10 px-4"
        >
          <Plus className="h-4 w-4 ml-2" />
          הוסף עבודה ראשונה
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center py-12 sm:py-16 px-4">
      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <ListX className="h-7 w-7 sm:h-8 sm:w-8 text-slate-400" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
        אין עבודות שמתאימות לסינון הזה
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        נסה לשנות את הסינון או לנקות אותו
      </p>
      <Button
        variant="outline"
        onClick={onClearFilter}
        className="border-slate-300 text-slate-600 hover:bg-slate-100 h-10 px-4"
      >
        <X className="h-4 w-4 ml-2" />
        נקה סינון
      </Button>
    </div>
  );
}

type Totals = {
  totalGross: number;
  totalPaid: number;
  unpaid: number;
  count: number;
};

// Mobile totals summary component for list view
function MobileListTotals({ totals }: { totals: Totals }) {
  if (totals.count === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 mt-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-400 font-medium">
          סה״כ ({totals.count} עבודות)
        </span>
        <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums" dir="ltr">
          {formatCurrency(totals.totalGross)}
        </span>
      </div>
      {totals.unpaid > 0 && (
        <div className="flex items-center justify-between text-xs mt-1.5">
          <span className="text-orange-600 dark:text-orange-400">
            ממתין לתשלום
          </span>
          <span className="font-semibold text-orange-600 dark:text-orange-400 tabular-nums" dir="ltr">
            {formatCurrency(totals.unpaid)}
          </span>
        </div>
      )}
    </div>
  );
}

// Desktop totals bar (shown below row-cards)
function DesktopListTotals({ totals }: { totals: Totals }) {
  if (totals.count === 0) return null;

  return (
    <div className="sticky bottom-0 z-10 mt-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="grid grid-cols-3 items-center text-center gap-6">
        <div className="flex flex-col items-center">
          <span className="text-sm text-slate-500 dark:text-slate-400 block">סה״כ ({totals.count} עבודות)</span>
          <span className="text-xl font-bold text-slate-800 dark:text-slate-200 font-numbers tabular-nums" dir="ltr">
            {formatCurrency(totals.totalGross)}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm text-emerald-600 dark:text-emerald-400 block">שולם</span>
          <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-numbers tabular-nums" dir="ltr">
            {formatCurrency(totals.totalPaid)}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm text-orange-600 dark:text-orange-400 block">ממתין</span>
          <span className="text-xl font-bold text-orange-600 dark:text-orange-400 font-numbers tabular-nums" dir="ltr">
            {formatCurrency(Math.max(totals.unpaid, 0))}
          </span>
        </div>
      </div>
    </div>
  );
}

export const IncomeListView = React.memo(function IncomeListView({
  entries,
  clients,
  categories,
  defaultDate,
  onRowClick,
  onStatusChange,
  onMarkAsPaid,
  onMarkInvoiceSent,
  onDuplicate,
  onDelete,
  onAddEntry,
  onInlineEdit,
  onClearFilter,
  hasActiveFilter,
  sortDirection,
  onSortToggle,
  // Filter/search props
  searchQuery,
  onSearchChange,
  monthClients,
  selectedClient,
  onClientChange,
  selectedCategories,
  onCategoryChange,
  onNewEntry,
  onEditCategories,
  // View mode props
  viewMode,
  onViewModeChange,
}: IncomeListViewProps) {
  const hasNoData = entries.length === 0 && !hasActiveFilter;
  const hasFilteredAway = entries.length === 0 && hasActiveFilter;
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);

  const handleAddClick = () => {
    const input = document.querySelector(
      'input[placeholder="הוסף עבודה חדשה"]'
    ) as HTMLInputElement;
    input?.focus();
  };

  // Compute totals once per entries change for both mobile and desktop summaries
  const totals = useMemo<Totals>(() => {
    if (entries.length === 0) {
      return { totalGross: 0, totalPaid: 0, unpaid: 0, count: 0 };
    }
    const totalGross = entries.reduce((sum, e) => sum + e.amountGross, 0);
    const totalPaid = entries.reduce((sum, e) => sum + e.amountPaid, 0);
    const unpaid = totalGross - totalPaid;
    return { totalGross, totalPaid, unpaid, count: entries.length };
  }, [entries]);

  // Load saved column order (desktop only)
  useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(LOCAL_STORAGE_KEY) : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((k) => DEFAULT_COLUMN_ORDER.includes(k))) {
          setColumnOrder(parsed as ColumnKey[]);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const persistOrder = (order: ColumnKey[]) => {
    setColumnOrder(order);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(order));
      }
    } catch {
      // ignore
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, key: ColumnKey) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetKey: ColumnKey) => {
    e.preventDefault();
    const sourceKey = e.dataTransfer.getData("text/plain") as ColumnKey;
    if (!sourceKey || sourceKey === targetKey) return;
    const current = columnOrder.slice();
    const from = current.indexOf(sourceKey);
    const to = current.indexOf(targetKey);
    if (from === -1 || to === -1) return;
    current.splice(from, 1);
    current.splice(to, 0, sourceKey);
    persistOrder(current);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const headerContent: Record<ColumnKey, React.ReactNode> = {
    date: (
      <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-slate-600 dark:hover:text-slate-400 transition-colors" onClick={onSortToggle}>
        תאריך
        <span className="text-[10px]">{sortDirection === "asc" ? "↑" : "↓"}</span>
      </div>
    ),
    description: <div className="truncate">תיאור</div>,
    client: <div>לקוח</div>,
    category: <div>קטגוריה</div>,
    amount: <div className="w-full flex"><span className="ml-auto">סכום</span></div>,
    status: <div className="text-center">סטטוס</div>,
    actions: <div className="text-center">פעולות</div>,
  };

  return (
    <TooltipProvider delayDuration={300}>
      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP LIST VIEW (hidden on mobile)
          - Filters toolbar at top
          - Column headers: תאריך | תיאור | לקוח | קטגוריה | סכום | סטטוס | פעולות
          - Quick-add row
          - Row-cards with Excel-like inline editing
          - Sticky totals bar at bottom
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:block">
        {/* FILTERS moved to parent component */}

        {/* QUICK ADD CARD */}
        <div className="mb-3">
          <QuickAddCard onAddEntry={onAddEntry} clients={clients} categories={categories} onEditCategories={onEditCategories} />
        </div>

        {/* Column Headers - draggable (desktop only) */}
        <div className="flex items-center text-[11px] text-slate-400 dark:text-slate-500 font-medium mb-1 px-1 select-none">
          {columnOrder.map((key) => (
            <div
              key={key}
              draggable
              onDragStart={(e) => handleDragStart(e, key)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, key)}
              className={`cursor-move ${HEADER_WIDTH_MAP[key]} flex items-center`}
            >
              {headerContent[key]}
            </div>
          ))}
        </div>

        {/* Empty States */}
        {hasNoData && (
          <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
            <EmptyState type="no-data" onAddClick={handleAddClick} />
          </Card>
        )}

        {hasFilteredAway && (
          <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
            <EmptyState type="filtered" onClearFilter={onClearFilter} />
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ROW-CARDS (Desktop)
            Compact table-like rows with Excel-like inline editing
            ═══════════════════════════════════════════════════════════════════ */}
        {entries.length > 0 && (
          <div className="flex flex-col gap-0.5">
            {entries.map((entry) => (
              <IncomeEntryRow
                key={entry.id}
                entry={entry}
                onClick={onRowClick}
                onStatusChange={onStatusChange}
                onMarkAsPaid={onMarkAsPaid}
                onMarkInvoiceSent={onMarkInvoiceSent}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onInlineEdit={onInlineEdit}
                clients={clients}
                categories={categories}
                columnOrder={columnOrder}
                onEditCategories={onEditCategories}
              />
            ))}

            {/* Desktop Totals Bar */}
            <DesktopListTotals totals={totals} />
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE LIST VIEW (hidden on desktop)
          Same IncomeEntryRow component, stacked vertically (no inline editing)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden print:hidden">
        {/* Mobile Quick Add */}
        <div className="mb-3">
          <MobileQuickAdd onAddEntry={onAddEntry} clients={clients} categories={categories} defaultDate={defaultDate} />
        </div>

        {/* Empty States for Mobile */}
        {hasNoData && (
          <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
            <EmptyState type="no-data" onAddClick={() => { }} />
          </Card>
        )}

        {hasFilteredAway && (
          <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
            <EmptyState type="filtered" onClearFilter={onClearFilter} />
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ROW-CARDS (Mobile)
            No inline editing on mobile - uses same component but without handlers
            ═══════════════════════════════════════════════════════════════════ */}
        {entries.length > 0 && (
          <div className="flex flex-col gap-1">
            {entries.map((entry) => (
              <IncomeEntryRow
                key={entry.id}
                entry={entry}
                onClick={onRowClick}
                onStatusChange={onStatusChange}
                onMarkAsPaid={onMarkAsPaid}
                onMarkInvoiceSent={onMarkInvoiceSent}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                categories={categories}
              // No onInlineEdit or clients for mobile - disables inline editing
              />
            ))}

            {/* Mobile Totals Summary */}
            <MobileListTotals totals={totals} />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
});
