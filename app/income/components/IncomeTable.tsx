"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { CalendarDays, ListX, Plus, X } from "lucide-react";
import { IncomeEntry, DisplayStatus, VatType } from "../types";
import { IncomeTableHeader } from "./income-table/IncomeTableHeader";
import { IncomeTableQuickAdd } from "./income-table/IncomeTableQuickAdd";
import { IncomeTableRow } from "./income-table/IncomeTableRow";
import { IncomeTableTotals } from "./income-table/IncomeTableTotals";
import { MobileIncomeCard } from "./income-table/MobileIncomeCard";
import { MobileQuickAdd } from "./income-table/MobileQuickAdd";
import { formatCurrency } from "../utils";

interface IncomeTableProps {
  entries: IncomeEntry[];
  clients: string[];
  onRowClick: (entry: IncomeEntry) => void;
  onStatusChange: (id: string, status: DisplayStatus) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkInvoiceSent: (id: string) => void;
  onDuplicate: (entry: IncomeEntry) => void;
  onDelete: (id: string) => void;
  onAddEntry: (entry: Omit<IncomeEntry, "id" | "invoiceStatus" | "paymentStatus" | "vatRate" | "includesVat"> & { status?: DisplayStatus, vatType?: VatType }) => void;
  onInlineEdit?: (id: string, field: string, value: string | number) => void;
  onClearFilter?: () => void;
  hasActiveFilter: boolean;
  sortDirection: "asc" | "desc";
  onSortToggle: () => void;
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
        <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums" dir="ltr">
          {formatCurrency(totalGross)}
        </span>
      </div>
      {unpaid > 0 && (
        <div className="flex items-center justify-between text-xs mt-1.5">
          <span className="text-orange-600 dark:text-orange-400">
            ממתין לתשלום
          </span>
          <span className="font-semibold text-orange-600 dark:text-orange-400 tabular-nums" dir="ltr">
            {formatCurrency(unpaid)}
          </span>
        </div>
      )}
    </div>
  );
}

export function IncomeTable({
  entries,
  clients,
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
}: IncomeTableProps) {
  const hasNoData = entries.length === 0 && !hasActiveFilter;
  const hasFilteredAway = entries.length === 0 && hasActiveFilter;

  const handleAddClick = () => {
    const input = document.querySelector(
      'input[placeholder="הוסף עבודה חדשה"]'
    ) as HTMLInputElement;
    input?.focus();
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP TABLE VIEW (hidden on mobile)
          ═══════════════════════════════════════════════════════════════════════ */}
      <Card className="hidden md:block overflow-hidden bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm print:shadow-none print:border-slate-200">
        <div className="relative w-full overflow-x-auto overflow-y-visible">
          <Table className="table-fixed w-full min-w-[800px]">
            <IncomeTableHeader
              sortDirection={sortDirection}
              onSortToggle={onSortToggle}
            />
            <TableBody>
              {/* Quick Add Row */}
              <IncomeTableQuickAdd onAddEntry={onAddEntry} clients={clients} />

              {/* Empty States */}
              {hasNoData && (
                <TableRow>
                  <TableCell colSpan={6} className="py-16">
                    <EmptyState type="no-data" onAddClick={handleAddClick} />
                  </TableCell>
                </TableRow>
              )}

              {hasFilteredAway && (
                <TableRow>
                  <TableCell colSpan={6} className="py-16">
                    <EmptyState type="filtered" onClearFilter={onClearFilter} />
                  </TableCell>
                </TableRow>
              )}

              {/* Data Rows */}
              {entries.map((entry, index) => (
                <IncomeTableRow
                  key={entry.id}
                  entry={entry}
                  index={index}
                  clients={clients}
                  onRowClick={onRowClick}
                  onStatusChange={onStatusChange}
                  onMarkAsPaid={onMarkAsPaid}
                  onMarkInvoiceSent={onMarkInvoiceSent}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  onInlineEdit={onInlineEdit}
                />
              ))}

              {/* Totals Row */}
              <IncomeTableTotals entries={entries} />
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE CARD LIST VIEW (hidden on desktop)
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden print:hidden">
        {/* Mobile Quick Add - Touch-friendly expandable form */}
        <div className="mb-3">
          <MobileQuickAdd onAddEntry={onAddEntry} clients={clients} />
        </div>

        {/* Empty States for Mobile */}
        {hasNoData && (
          <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
            <EmptyState type="no-data" onAddClick={() => {}} />
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
}
