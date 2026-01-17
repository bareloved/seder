"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, ListX, Plus, X } from "lucide-react";
import { IncomeEntry, DisplayStatus, VatType } from "../types";
import type { Category } from "@/db/schema";
import type { ViewMode } from "./ViewModeToggle";
import { IncomeFilters } from "./IncomeFilters";
import { MobileIncomeCard } from "./income-table/MobileIncomeCard";
import { MobileQuickAdd } from "./income-table/MobileQuickAdd";
import { formatCurrency } from "../utils";

// ─────────────────────────────────────────────────────────────────────────────
// Income Cards View Component
// Desktop: Can show cards in a responsive grid when viewMode is "cards"
// Mobile: Full card layout with rich details
// ─────────────────────────────────────────────────────────────────────────────

interface IncomeCardsViewProps {
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

// Mobile totals summary component
function MobileTotals({ entries }: { entries: IncomeEntry[] }) {
  const totalGross = entries.reduce((sum, e) => sum + e.amountGross, 0);
  const totalPaid = entries.reduce((sum, e) => sum + e.amountPaid, 0);
  const unpaid = totalGross - totalPaid;

  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 mt-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-400 font-medium">
          סה״כ ({entries.length} עבודות)
        </span>
        <span className="text-lg font-normal font-numbers text-slate-800 dark:text-slate-200" dir="ltr">
          <span className="text-xs">₪</span> {totalGross.toLocaleString("he-IL")}
        </span>
      </div>
      {unpaid > 0 && (
        <div className="flex items-center justify-between text-xs mt-1.5">
          <span className="text-orange-600 dark:text-orange-400">
            ממתין לתשלום
          </span>
          <span className="text-lg font-normal font-numbers text-orange-600 dark:text-orange-400" dir="ltr">
            <span className="text-xs">₪</span> {unpaid.toLocaleString("he-IL")}
          </span>
        </div>
      )}
    </div>
  );
}

// Desktop cards totals bar
function DesktopCardsTotals({ entries }: { entries: IncomeEntry[] }) {
  const totalGross = entries.reduce((sum, e) => sum + e.amountGross, 0);
  const totalPaid = entries.reduce((sum, e) => sum + e.amountPaid, 0);
  const unpaid = totalGross - totalPaid;

  if (entries.length === 0) return null;

  return (
    <div className="mt-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
      <div className="grid grid-cols-3 items-center text-center gap-4">
        <div className="flex flex-col items-center">
          <span className="text-sm text-slate-500 dark:text-slate-400 block">סה״כ ({entries.length} עבודות)</span>
          <span className="text-2xl font-normal font-numbers text-slate-800 dark:text-slate-200" dir="ltr">
            <span className="text-sm">₪</span> {totalGross.toLocaleString("he-IL")}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm text-emerald-600 dark:text-emerald-400 block">שולם</span>
          <span className="text-2xl font-normal font-numbers text-emerald-600 dark:text-emerald-400" dir="ltr">
            <span className="text-sm">₪</span> {totalPaid.toLocaleString("he-IL")}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-sm text-orange-600 dark:text-orange-400 block">ממתין</span>
          <span className="text-2xl font-normal font-numbers text-orange-600 dark:text-orange-400" dir="ltr">
            <span className="text-sm">₪</span> {Math.max(unpaid, 0).toLocaleString("he-IL")}
          </span>
        </div>
      </div>
    </div>
  );
}

export const IncomeCardsView = React.memo(function IncomeCardsView({
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
  onClearFilter,
  hasActiveFilter,
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
}: IncomeCardsViewProps) {
  const hasNoData = entries.length === 0 && !hasActiveFilter;
  const hasFilteredAway = entries.length === 0 && hasActiveFilter;

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP CARDS VIEW (hidden on mobile)
          Shows cards in a responsive grid layout
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:block">
        {/* FILTERS moved to parent component */}

        {/* Empty States */}
        {hasNoData && (
          <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
            <EmptyState type="no-data" onAddClick={onNewEntry} />
          </Card>
        )}

        {hasFilteredAway && (
          <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
            <EmptyState type="filtered" onClearFilter={onClearFilter} />
          </Card>
        )}

        {/* Desktop Cards Grid - Two columns */}
        {entries.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {entries.map((entry) => (
                <MobileIncomeCard
                  key={entry.id}
                  entry={entry}
                  onCardClick={onRowClick}
                  onStatusChange={onStatusChange}
                  onMarkAsPaid={onMarkAsPaid}
                  onMarkInvoiceSent={onMarkInvoiceSent}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                />
              ))}
            </div>

            {/* Desktop Cards Totals */}
            <DesktopCardsTotals entries={entries} />
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE CARDS VIEW (hidden on desktop)
          Full card layout with rich details - existing design
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

        {/* Mobile Card List */}
        {entries.length > 0 && (
          <div className="flex flex-col gap-2">
            {entries.map((entry) => (
              <MobileIncomeCard
                key={entry.id}
                entry={entry}
                onCardClick={onRowClick}
                onStatusChange={onStatusChange}
                onMarkAsPaid={onMarkAsPaid}
                onMarkInvoiceSent={onMarkInvoiceSent}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))}

            {/* Mobile Totals Summary */}
            <MobileTotals entries={entries} />
          </div>
        )}
      </div>
    </>
  );
});

