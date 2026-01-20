"use client";

import * as React from "react";
import { IncomeEntry, DisplayStatus, VatType, MoneyStatus } from "../types";
import type { Category, Client } from "@/db/schema";
import type { SortColumn } from "./income-table/IncomeTableHeader";
import { IncomeListView } from "./IncomeListView";
import { IncomeCardsView } from "./IncomeCardsView";
import type { ViewMode } from "./ViewModeToggle";

// ─────────────────────────────────────────────────────────────────────────────
// Income Table Component
// Orchestrates between List and Cards views based on viewMode
// ─────────────────────────────────────────────────────────────────────────────

interface IncomeTableProps {
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

export const IncomeTable = React.memo(function IncomeTable({
  entries,
  clients,
  clientRecords,
  categories,
  defaultDate,
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
  // View mode
  viewMode,
  onViewModeChange,
  // Selection props
  isSelectionMode,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onToggleSelectionMode,
}: IncomeTableProps) {
  // Common props for both views
  const viewProps = {
    entries,
    clients,
    clientRecords,
    categories,
    defaultDate,
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
    sortColumn,
    sortDirection,
    onSort,
    searchQuery,
    onSearchChange,
    monthClients,
    selectedClient,
    onClientChange,
    selectedCategories,
    onCategoryChange,
    onNewEntry,
    onEditCategories,
    viewMode,
    onViewModeChange,
    // Selection props
    isSelectionMode,
    selectedIds,
    onToggleSelection,
    onSelectAll,
    onToggleSelectionMode,
  };

  // Render the appropriate view based on viewMode
  if (viewMode === "cards") {
    return <IncomeCardsView {...viewProps} />;
  }

  return <IncomeListView {...viewProps} />;
});
