"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ListX, Plus, X } from "lucide-react";
import { IncomeEntry, DisplayStatus, VatType, MoneyStatus } from "../types";
import type { Category, Client } from "@/db/schema";
import type { ViewMode } from "./ViewModeToggle";
import { IncomeEntryRow } from "./income-table/IncomeEntryRow";
import { TooltipProvider } from "@/components/ui/tooltip";

// ─────────────────────────────────────────────────────────────────────────────
// Income List View Component
// ─────────────────────────────────────────────────────────────────────────────
// Desktop: Row-cards with quick-add, inline editing
// Mobile: Stacked row-cards (no inline editing)
//
// Fixed column structure (RTL):
// תאריך | תיאור + לקוח | סכום (centered) | קטגוריה | סטטוס | פעולות
// ─────────────────────────────────────────────────────────────────────────────

interface IncomeListViewProps {
  entries: IncomeEntry[];
  clients: string[];
  clientRecords?: Client[];
  categories: Category[];
  defaultDate?: string;
  onRowClick: (entry: IncomeEntry) => void;
  onStatusChange: (id: string, status: DisplayStatus) => void;
  onMoneyStatusChange?: (id: string, status: MoneyStatus) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkInvoiceSent: (id: string) => void;
  onDuplicate: (entry: IncomeEntry) => void;
  onDelete: (id: string) => void;
  onAddEntry: (entry: Omit<IncomeEntry, "id" | "invoiceStatus" | "paymentStatus" | "vatRate" | "includesVat"> & { status?: DisplayStatus, vatType?: VatType, invoiceStatus?: "draft" | "sent" | "paid" | "cancelled", paymentStatus?: "unpaid" | "partial" | "paid", vatRate?: number, includesVat?: boolean }) => void;
  onInlineEdit?: (id: string, field: string, value: string | number) => void;
  onClearFilter?: () => void;
  hasActiveFilter: boolean;
  onEditCategories?: () => void;
  // Selection props
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
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
        <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-slate-100 dark:bg-card flex items-center justify-center mb-4">
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
      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-slate-100 dark:bg-card flex items-center justify-center mb-4">
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

export const IncomeListView = React.memo(function IncomeListView({
  entries,
  clients,
  clientRecords,
  categories,
  onRowClick,
  onStatusChange,
  onMoneyStatusChange,
  onMarkAsPaid,
  onMarkInvoiceSent,
  onDuplicate,
  onDelete,
  onInlineEdit,
  onClearFilter,
  hasActiveFilter,
  onEditCategories,
  // Selection props
  isSelectionMode = false,
  selectedIds = new Set(),
  onToggleSelection,
  onToggleSelectionMode,
}: IncomeListViewProps) {
  const hasNoData = entries.length === 0 && !hasActiveFilter;
  const hasFilteredAway = entries.length === 0 && hasActiveFilter;

  const handleAddClick = () => {
    const input = document.querySelector(
      'input[placeholder="הוסף עבודה חדשה"]'
    ) as HTMLInputElement;
    input?.focus();
  };

  return (
    <TooltipProvider delayDuration={300}>
      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP LIST VIEW (hidden on mobile)
          - Row-cards with inline editing
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:block subtle-cards">
        {/* Empty States */}
        {hasNoData && (
          <Card className="bg-white dark:bg-card border-slate-100 dark:border-border shadow-sm">
            <EmptyState type="no-data" onAddClick={handleAddClick} />
          </Card>
        )}

        {hasFilteredAway && (
          <Card className="bg-white dark:bg-card border-slate-100 dark:border-border shadow-sm">
            <EmptyState type="filtered" onClearFilter={onClearFilter} />
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ROW-CARDS (Desktop)
            Card-based rows with inline editing
            ═══════════════════════════════════════════════════════════════════ */}
        {entries.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {entries.map((entry) => (
              <IncomeEntryRow
                key={entry.id}
                entry={entry}
                onClick={onRowClick}
                onStatusChange={onStatusChange}
                onMoneyStatusChange={onMoneyStatusChange}
                onMarkAsPaid={onMarkAsPaid}
                onMarkInvoiceSent={onMarkInvoiceSent}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onInlineEdit={onInlineEdit}
                clients={clients}
                clientRecords={clientRecords}
                categories={categories}
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
      <div className="md:hidden print:hidden subtle-cards">
        {/* Empty States for Mobile */}
        {hasNoData && (
          <Card className="bg-white dark:bg-card border-slate-100 dark:border-border shadow-sm">
            <EmptyState type="no-data" onAddClick={() => { }} />
          </Card>
        )}

        {hasFilteredAway && (
          <Card className="bg-white dark:bg-card border-slate-100 dark:border-border shadow-sm">
            <EmptyState type="filtered" onClearFilter={onClearFilter} />
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ROW-CARDS (Mobile)
            No inline editing on mobile - uses same component but without handlers
            ═══════════════════════════════════════════════════════════════════ */}
        {entries.length > 0 && (
          <div className="flex flex-col gap-1.5">
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
    </TooltipProvider>
  );
});
