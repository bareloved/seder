"use client";

import * as React from "react";
import { IncomeEntry, DisplayStatus, VatType } from "../types";
import type { Category } from "@/db/schema";
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

export const IncomeTable = React.memo(function IncomeTable({
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
  // View mode
  viewMode,
  onViewModeChange,
}: IncomeTableProps) {
  // Common props for both views
  const viewProps = {
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
  };

  // Render the appropriate view based on viewMode
  if (viewMode === "cards") {
    return <IncomeCardsView {...viewProps} />;
  }

  return <IncomeListView {...viewProps} />;
});
