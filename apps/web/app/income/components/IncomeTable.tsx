"use client";

import * as React from "react";
import { IncomeEntry, DisplayStatus, VatType, MoneyStatus } from "../types";
import type { Category, Client } from "@/db/schema";
import { IncomeListView } from "./IncomeListView";

// ─────────────────────────────────────────────────────────────────────────────
// Income Table Component
// Wrapper for IncomeListView
// ─────────────────────────────────────────────────────────────────────────────

interface IncomeTableProps {
  entries: IncomeEntry[];
  clients: string[];
  clientRecords?: Client[];
  categories: Category[];
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

export const IncomeTable = React.memo(function IncomeTable({
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
  onAddEntry,
  onInlineEdit,
  onClearFilter,
  hasActiveFilter,
  onEditCategories,
  isSelectionMode,
  selectedIds,
  onToggleSelection,
  onToggleSelectionMode,
}: IncomeTableProps) {
  return (
    <IncomeListView
      entries={entries}
      clients={clients}
      clientRecords={clientRecords}
      categories={categories}
      onRowClick={onRowClick}
      onStatusChange={onStatusChange}
      onMoneyStatusChange={onMoneyStatusChange}
      onMarkAsPaid={onMarkAsPaid}
      onMarkInvoiceSent={onMarkInvoiceSent}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onAddEntry={onAddEntry}
      onInlineEdit={onInlineEdit}
      onClearFilter={onClearFilter}
      hasActiveFilter={hasActiveFilter}
      onEditCategories={onEditCategories}
      isSelectionMode={isSelectionMode}
      selectedIds={selectedIds}
      onToggleSelection={onToggleSelection}
      onToggleSelectionMode={onToggleSelectionMode}
    />
  );
});
