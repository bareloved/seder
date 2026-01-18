"use client";

import * as React from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, ListX, Plus, X, GripVertical, ArrowUp, ArrowDown, ArrowUpDown, MoreVertical, CheckSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IncomeEntry, DisplayStatus, VatType } from "../types";
import type { Category } from "@/db/schema";
import type { ViewMode } from "./ViewModeToggle";
import type { SortColumn } from "./income-table/IncomeTableHeader";
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
const COLUMN_WIDTHS_STORAGE_KEY = "income-list-column-widths";

// Default and minimum widths for resizable columns
const DEFAULT_COLUMN_WIDTHS: Partial<Record<ColumnKey, number>> = {
  client: 110,
  description: 300,
};
const MIN_COLUMN_WIDTHS: Partial<Record<ColumnKey, number>> = {
  client: 80,
  description: 150,
};
const RESIZABLE_COLUMNS: ColumnKey[] = ["client", "description"];

// Static widths for non-resizable columns
// Note: resizable columns (client, description) use shrink-0 + inline style for width
const HEADER_WIDTH_MAP: Record<ColumnKey, string> = {
  date: "w-[70px] shrink-0 px-2",
  description: "shrink-0 min-w-0 px-3", // Width set via inline style
  client: "shrink-0 px-3", // Width set via inline style
  category: "w-[100px] shrink-0 px-2",
  amount: "w-[120px] shrink-0 px-3",
  status: "w-[100px] shrink-0 px-2",
  actions: "w-[110px] shrink-0 px-1.5",
};

const COLUMN_LABELS: Record<ColumnKey, string> = {
  date: "תאריך",
  description: "תיאור",
  client: "לקוח",
  category: "קטגוריה",
  amount: "סכום",
  status: "סטטוס",
  actions: "פעולות",
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
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: SortColumn) => void;
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
  // Selection props
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onSelectAll?: () => void;
  onToggleSelectionMode?: () => void;
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
  sortColumn,
  sortDirection,
  onSort,
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
  // Selection props
  isSelectionMode = false,
  selectedIds = new Set(),
  onToggleSelection,
  onSelectAll,
  onToggleSelectionMode,
}: IncomeListViewProps) {
  const hasNoData = entries.length === 0 && !hasActiveFilter;
  const hasFilteredAway = entries.length === 0 && hasActiveFilter;
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMN_ORDER);
  const [dropTarget, setDropTarget] = useState<{ key: ColumnKey; position: "left" | "right" } | null>(null);
  const [draggedKey, setDraggedKey] = useState<ColumnKey | null>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  // Column width state for resizable columns
  const [columnWidths, setColumnWidths] = useState<Partial<Record<ColumnKey, number>>>(DEFAULT_COLUMN_WIDTHS);
  const [resizing, setResizing] = useState<{
    column: ColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

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

  // Load saved column widths (desktop only)
  useEffect(() => {
    try {
      const stored = typeof window !== "undefined" ? window.localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY) : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed === "object" && parsed !== null) {
          setColumnWidths({ ...DEFAULT_COLUMN_WIDTHS, ...parsed });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const persistWidths = (widths: Partial<Record<ColumnKey, number>>) => {
    setColumnWidths(widths);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(widths));
      }
    } catch {
      // ignore
    }
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent, columnKey: ColumnKey) => {
    e.preventDefault();
    e.stopPropagation();
    const currentWidth = columnWidths[columnKey] || DEFAULT_COLUMN_WIDTHS[columnKey] || 100;
    setResizing({
      column: columnKey,
      startX: e.clientX,
      startWidth: currentWidth,
    });
  };

  // Document-level resize handlers
  useEffect(() => {
    if (!resizing) return;

    const handleResizeMove = (e: MouseEvent) => {
      if (!resizing) return;
      // In RTL, moving mouse left (negative delta) should increase width
      // Moving mouse right (positive delta) should decrease width
      const delta = resizing.startX - e.clientX;
      const minWidth = MIN_COLUMN_WIDTHS[resizing.column] || 80;
      const maxWidth = resizing.column === "description" ? 600 : 250;
      const newWidth = Math.max(minWidth, Math.min(maxWidth, resizing.startWidth + delta));
      setColumnWidths((prev) => ({ ...prev, [resizing.column]: newWidth }));
    };

    const handleResizeEnd = () => {
      if (resizing) {
        persistWidths(columnWidths);
      }
      setResizing(null);
    };

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);

    return () => {
      document.removeEventListener("mousemove", handleResizeMove);
      document.removeEventListener("mouseup", handleResizeEnd);
    };
  }, [resizing, columnWidths]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, key: ColumnKey) => {
    setDraggedKey(key);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", key);

    // Set custom compact drag image
    if (dragPreviewRef.current) {
      const previewText = dragPreviewRef.current.querySelector("#drag-preview-text");
      if (previewText) {
        previewText.textContent = COLUMN_LABELS[key];
      }
      e.dataTransfer.setDragImage(dragPreviewRef.current, -10, -10);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetKey: ColumnKey) => {
    e.preventDefault();
    setDropTarget(null);
    const sourceKey = e.dataTransfer.getData("text/plain") as ColumnKey;
    if (!sourceKey || sourceKey === targetKey) return;

    // Calculate precise drop position again to be sure (or trust state if synchronous enough, but recalculating is safer)
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.x + rect.width / 2;
    // In RTL, Right is Start (index), Left is End (index + 1)
    const isRight = e.clientX > midpoint;

    const current = columnOrder.slice();
    const from = current.indexOf(sourceKey);
    let to = current.indexOf(targetKey);

    if (from === -1 || to === -1) return;

    // Remove source first
    current.splice(from, 1);

    // Adjust target index because removal might have shifted indices
    to = current.indexOf(targetKey);

    // If dropping on Left (End in RTL), we insert AFTER the target (index + 1)
    // If dropping on Right (Start in RTL), we insert AT the target (index)
    if (!isRight) {
      to += 1;
    }

    current.splice(to, 0, sourceKey);
    persistOrder(current);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, key: ColumnKey) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.x + rect.width / 2;
    const position = e.clientX > midpoint ? "right" : "left"; // Right side is Start in RTL

    if (dropTarget?.key !== key || dropTarget?.position !== position) {
      setDropTarget({ key, position });
    }
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDragEnd = () => {
    setDraggedKey(null);
    setDropTarget(null);
  };

  // Map ColumnKey to SortColumn (actions is not sortable)
  const columnToSortColumn: Partial<Record<ColumnKey, SortColumn>> = {
    date: "date",
    description: "description",
    client: "client",
    category: "category",
    amount: "amount",
    status: "status",
  };

  const SortableColumnHeader = ({ columnKey, label, className }: { columnKey: ColumnKey; label: string; className?: string }) => {
    const sortKey = columnToSortColumn[columnKey];
    if (!sortKey) return <div className={className}>{label}</div>;

    const isActive = sortColumn === sortKey;
    return (
      <div
        className={`flex items-center gap-0.5 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors ${className || ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onSort(sortKey);
        }}
      >
        {label}
        {isActive ? (
          sortDirection === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </div>
    );
  };

  const headerContent: Record<ColumnKey, React.ReactNode> = {
    date: <SortableColumnHeader columnKey="date" label="תאריך" className="justify-center" />,
    description: <SortableColumnHeader columnKey="description" label="תיאור" />,
    client: <SortableColumnHeader columnKey="client" label="לקוח" />,
    category: <SortableColumnHeader columnKey="category" label="קטגוריה" />,
    amount: <SortableColumnHeader columnKey="amount" label="סכום" className="justify-start" />,
    status: <SortableColumnHeader columnKey="status" label="סטטוס" className="justify-center" />,
    actions: (
      <div className="flex items-center justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <span>פעולות</span>
              <MoreVertical className="h-3 w-3 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onToggleSelectionMode && (
              <DropdownMenuItem onClick={onToggleSelectionMode} className="gap-2 justify-end">
                <span>{isSelectionMode ? "בטל בחירה" : "בחר עבודות"}</span>
                <CheckSquare className="h-4 w-4" />
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
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
        <div className={`flex items-center text-[12px] text-slate-400 dark:text-slate-500 font-medium mb-1 px-1 select-none ${resizing ? "cursor-col-resize" : ""}`}>
          {/* Select All Checkbox */}
          {isSelectionMode && onSelectAll && (
            <div className="shrink-0 w-[40px] px-2 flex items-center justify-center">
              <Checkbox
                checked={selectedIds.size > 0 && selectedIds.size === entries.length ? true : selectedIds.size > 0 ? "indeterminate" : false}
                onCheckedChange={onSelectAll}
                className="h-4 w-4 border-2 border-slate-300 data-[state=checked]:bg-slate-800 data-[state=checked]:border-slate-800 data-[state=indeterminate]:bg-slate-400 data-[state=indeterminate]:border-slate-400"
              />
            </div>
          )}
          {columnOrder.map((key) => {
            const isResizable = RESIZABLE_COLUMNS.includes(key);
            const dynamicWidth = isResizable ? columnWidths[key] || DEFAULT_COLUMN_WIDTHS[key] : undefined;

            return (
              <div
                key={key}
                draggable={!resizing}
                onDragStart={(e) => handleDragStart(e, key)}
                onDragOver={(e) => handleDragOver(e, key)}
                onDragLeave={handleDragLeave}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, key)}
                style={dynamicWidth ? { width: dynamicWidth } : undefined}
                className={`
                  ${HEADER_WIDTH_MAP[key]} flex items-center justify-between group relative rounded-md transition-colors
                  ${dropTarget?.key === key ? "bg-slate-50 dark:bg-slate-800/40" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}
                  ${draggedKey === key ? "opacity-30 bg-slate-100 dark:bg-slate-800/50 dashed border border-site-300" : !resizing ? "cursor-grab active:cursor-grabbing" : ""}
                `}
              >
                {/* Resize handle on left edge (end in RTL) for resizable columns */}
                {isResizable && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-20 group/resize flex items-center justify-center"
                    onMouseDown={(e) => handleResizeStart(e, key)}
                  >
                    <div className="w-0.5 h-3 bg-transparent group-hover/resize:bg-slate-400 dark:group-hover/resize:bg-slate-500 rounded-full transition-colors" />
                  </div>
                )}
                {/* Drop candidate indicator line */}
                {dropTarget?.key === key && (
                  <div
                    className={`absolute inset-y-0 w-0.5 bg-slate-300 dark:bg-slate-600 z-10 ${dropTarget.position === "right" ? "-right-0.5" : "-left-0.5"}`}
                  />
                )}
                {headerContent[key]}
                <div className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-3 w-3" />
                </div>
              </div>
            );
          })}
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
                columnWidths={columnWidths}
                onEditCategories={onEditCategories}
                isSelectionMode={isSelectionMode}
                isSelected={selectedIds.has(entry.id)}
                onToggleSelection={onToggleSelection}
                onToggleSelectionMode={onToggleSelectionMode}
              />
            ))}


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


          </div>
        )}
      </div>


      {/* Custom Drag Preview Element (Hidden off-screen) */}
      <div
        ref={dragPreviewRef}
        className="fixed top-[-1000px] left-[-1000px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-2 py-1.5 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 font-medium text-xs flex items-center gap-1.5 pointer-events-none z-50 whitespace-nowrap"
      >
        <GripVertical className="h-3 w-3 text-slate-400" />
        <span id="drag-preview-text"></span>
      </div>
    </TooltipProvider >
  );
});
