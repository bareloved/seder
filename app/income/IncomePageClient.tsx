"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IncomeHeader } from "./components/IncomeHeader";
import { KPICards } from "./components/KPICards";
import { IncomeFilters } from "./components/IncomeFilters";
import { IncomeTable } from "./components/IncomeTable";
import { IncomeDetailDialog } from "./components/IncomeDetailDialog";
import { CalendarImportDialog } from "./components/CalendarImportDialog";
import { exportToCSV, isOverdue, getDisplayStatus, calculateKPIs } from "./utils";
import {
  createIncomeEntryAction,
  updateIncomeEntryAction,
  markIncomeEntryAsPaidAction,
  markInvoiceSentAction,
  updateEntryStatusAction,
  deleteIncomeEntryAction,
  importFromCalendarAction,
} from "./actions";
import type { IncomeEntry, DisplayStatus, FilterType, KPIData } from "./types";
import type { IncomeAggregates, MonthPaymentStatus } from "./data";
import type { IncomeEntry as DBIncomeEntry } from "@/db/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Props interface
// ─────────────────────────────────────────────────────────────────────────────

interface IncomePageClientProps {
  year: number;
  month: number;
  dbEntries: DBIncomeEntry[];
  aggregates: IncomeAggregates;
  clients: string[];
  monthPaymentStatuses: Record<number, MonthPaymentStatus>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper to convert DB entry to UI entry format
// ─────────────────────────────────────────────────────────────────────────────

function dbEntryToUIEntry(dbEntry: DBIncomeEntry): IncomeEntry {
  return {
    id: dbEntry.id,
    date: dbEntry.date,
    description: dbEntry.description,
    clientName: dbEntry.clientName,
    amountGross: parseFloat(dbEntry.amountGross),
    amountPaid: parseFloat(dbEntry.amountPaid),
    vatRate: parseFloat(dbEntry.vatRate),
    includesVat: dbEntry.includesVat,
    invoiceStatus: dbEntry.invoiceStatus,
    paymentStatus: dbEntry.paymentStatus,
    category: dbEntry.category,
    notes: dbEntry.notes,
    invoiceSentDate: dbEntry.invoiceSentDate,
    paidDate: dbEntry.paidDate,
    calendarEventId: dbEntry.calendarEventId,
    createdAt: dbEntry.createdAt,
    updatedAt: dbEntry.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Client Component
// ─────────────────────────────────────────────────────────────────────────────

export default function IncomePageClient({
  year,
  month,
  dbEntries,
  aggregates,
  clients: initialClients,
  monthPaymentStatuses,
}: IncomePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Convert DB entries to UI format
  const initialEntries = React.useMemo(
    () => dbEntries.map(dbEntryToUIEntry),
    [dbEntries]
  );

  // Local state for entries (for optimistic updates)
  const [entries, setEntries] = React.useState<IncomeEntry[]>(initialEntries);

  // Update entries when props change (e.g., month/year navigation)
  React.useEffect(() => {
    setEntries(dbEntries.map(dbEntryToUIEntry));
    // Reset client filter when month changes (selected client may not exist in new month)
    setSelectedClient("all");
  }, [dbEntries]);

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  // Calendar import dialog state
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = React.useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState<string>("all");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");

  // Dialog state
  const [selectedEntry, setSelectedEntry] = React.useState<IncomeEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Dialog handlers (defined early for use in effects)
  const closeDialog = React.useCallback(() => {
    setIsDialogOpen(false);
    setSelectedEntry(null);
  }, []);

  // Get unique clients from current month's entries only
  const monthClients = React.useMemo(() => {
    const uniqueClients = new Set(
      entries.map((e) => e.clientName).filter((name) => name && name.trim() !== "")
    );
    return Array.from(uniqueClients).sort();
  }, [entries]);

  // All clients (for autocomplete in quick add)
  const allClients = React.useMemo(() => {
    const uniqueClients = new Set([
      ...initialClients,
      ...entries.map((e) => e.clientName),
    ]);
    return Array.from(uniqueClients).filter((name) => name && name.trim() !== "").sort();
  }, [initialClients, entries]);

  // Calculate KPIs using aggregates from server
  const kpis: KPIData = React.useMemo(() => {
    // Recalculate some values locally for accurate filtered display
    const localKPIs = calculateKPIs(entries, month, year, aggregates.previousMonthPaid);
    
    return {
      outstanding: aggregates.outstanding,
      readyToInvoice: aggregates.readyToInvoice,
      readyToInvoiceCount: aggregates.readyToInvoiceCount,
      thisMonth: localKPIs.thisMonth,
      thisMonthCount: localKPIs.thisMonthCount,
      trend: aggregates.trend,
      totalPaid: localKPIs.totalPaid, // Use local calculation for current filter
      overdueCount: aggregates.overdueCount,
      invoicedCount: aggregates.invoicedCount,
    };
  }, [entries, month, year, aggregates]);

  // Filter entries based on all criteria
  const filteredEntries = React.useMemo(() => {
    let result = entries;

    // Status filter (using derived display status)
    switch (activeFilter) {
      case "ready-to-invoice":
        result = result.filter((e) => getDisplayStatus(e) === "בוצע");
        break;
      case "invoiced":
        result = result.filter((e) => getDisplayStatus(e) === "נשלחה");
        break;
      case "paid":
        result = result.filter((e) => getDisplayStatus(e) === "שולם");
        break;
      case "overdue":
        result = result.filter((e) => isOverdue(e));
        break;
    }

    // Client filter
    if (selectedClient !== "all") {
      result = result.filter((e) => e.clientName === selectedClient);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(query) ||
          e.clientName.toLowerCase().includes(query) ||
          (e.category && e.category.toLowerCase().includes(query))
      );
    }

    // Sort by date
    return result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [entries, activeFilter, selectedClient, searchQuery, sortDirection]);

  // Dark mode effect
  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDialogOpen) {
        closeDialog();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDialogOpen, closeDialog]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Navigation handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleMonthChange = (newMonth: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", newMonth.toString());
    params.set("year", year.toString());
    router.push(`/income?${params.toString()}`);
  };

  const handleYearChange = (newYear: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", newYear.toString());
    params.set("month", month.toString());
    router.push(`/income?${params.toString()}`);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // CRUD handlers with server actions
  // ─────────────────────────────────────────────────────────────────────────────

  const addEntry = async (entry: Omit<IncomeEntry, "id" | "weekday" | "invoiceStatus" | "paymentStatus" | "vatRate" | "includesVat"> & { status?: DisplayStatus, vatType?: "חייב מע״מ" | "ללא מע״מ" | "כולל מע״מ" }) => {
    const formData = new FormData();
    formData.append("date", entry.date);
    formData.append("description", entry.description);
    formData.append("clientName", entry.clientName);
    formData.append("amountGross", entry.amountGross.toString());
    formData.append("amountPaid", entry.amountPaid.toString());
    if (entry.category) formData.append("category", entry.category);
    if (entry.notes) formData.append("notes", entry.notes);

    // Map Hebrew status to DB status
    if (entry.status === "שולם") {
      formData.append("invoiceStatus", "paid");
      formData.append("paymentStatus", "paid");
    } else if (entry.status === "נשלחה") {
      formData.append("invoiceStatus", "sent");
    } else {
      formData.append("invoiceStatus", "draft");
    }

    // Map VAT type
    if (entry.vatType === "ללא מע״מ") {
      formData.append("vatRate", "0");
      formData.append("includesVat", "false");
    } else if (entry.vatType === "כולל מע״מ") {
      formData.append("includesVat", "true");
    } else {
      formData.append("includesVat", "false");
    }

    const result = await createIncomeEntryAction(formData);
    
    if (result.success && result.entry) {
      // Optimistically add to local state
      const newEntry = dbEntryToUIEntry(result.entry);
      setEntries((prev) => [newEntry, ...prev]);
    }
  };

  const updateEntry = async (updatedEntry: IncomeEntry & { status?: DisplayStatus, vatType?: "חייב מע״מ" | "ללא מע״מ" | "כולל מע״מ" }) => {
    const formData = new FormData();
    formData.append("id", updatedEntry.id.toString());
    formData.append("date", updatedEntry.date);
    formData.append("description", updatedEntry.description);
    formData.append("clientName", updatedEntry.clientName);
    formData.append("amountGross", updatedEntry.amountGross.toString());
    formData.append("amountPaid", updatedEntry.amountPaid.toString());
    formData.append("category", updatedEntry.category || "");
    
    // Keep notes as-is (calendar draft badge now only depends on amountGross and calendarEventId)
    formData.append("notes", updatedEntry.notes || "");

    // Map Hebrew status to DB status
    // Use the display status if provided, otherwise fall back to existing DB status logic?
    // Actually the drawer usually provides the display status
    if (updatedEntry.status) {
      if (updatedEntry.status === "שולם") {
        formData.append("invoiceStatus", "paid");
        formData.append("paymentStatus", "paid");
      } else if (updatedEntry.status === "נשלחה") {
        formData.append("invoiceStatus", "sent");
      } else {
        formData.append("invoiceStatus", "draft");
      }
    } else {
      // Fallback if status not explicitly changed in UI but exists in object
      formData.append("invoiceStatus", updatedEntry.invoiceStatus);
      formData.append("paymentStatus", updatedEntry.paymentStatus);
    }

    // Map VAT type
    if (updatedEntry.vatType) {
      if (updatedEntry.vatType === "ללא מע״מ") {
        formData.append("vatRate", "0");
        formData.append("includesVat", "false");
      } else if (updatedEntry.vatType === "כולל מע״מ") {
        formData.append("includesVat", "true");
      } else {
        formData.append("includesVat", "false");
      }
    } else {
        formData.append("vatRate", updatedEntry.vatRate.toString());
        formData.append("includesVat", String(updatedEntry.includesVat));
    }

    // Optimistically update local state
    const optimisticEntry: IncomeEntry = {
        ...updatedEntry,
        // If status was updated, reflect it in DB fields for local state
        invoiceStatus: updatedEntry.status === "שולם" ? "paid" : updatedEntry.status === "נשלחה" ? "sent" : updatedEntry.status === "בוצע" ? "draft" : updatedEntry.invoiceStatus,
        paymentStatus: updatedEntry.status === "שולם" ? "paid" : updatedEntry.paymentStatus
    };

    setEntries((prev) =>
      prev.map((e) => (e.id === updatedEntry.id ? optimisticEntry : e))
    );
    setSelectedEntry((prev) =>
      prev?.id === updatedEntry.id ? optimisticEntry : prev
    );

    await updateIncomeEntryAction(formData);
  };

  const deleteEntry = async (id: string) => {
    // Optimistically update local state
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSelectedEntry((prev) => (prev?.id === id ? null : prev));
    if (selectedEntry?.id === id) {
      setIsDialogOpen(false);
    }

    await deleteIncomeEntryAction(id);
  };

  const updateStatus = async (id: string, status: DisplayStatus) => {
    // Optimistically update local state
    const today = new Date().toISOString().split("T")[0];
    
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        
        const updates: Partial<IncomeEntry> = {};
        
        if (status === "שולם") {
            updates.invoiceStatus = "paid";
            updates.paymentStatus = "paid";
            updates.paidDate = today;
            updates.amountPaid = e.amountGross;
        } else if (status === "נשלחה") {
            updates.invoiceStatus = "sent";
            updates.paymentStatus = "unpaid";
            updates.paidDate = undefined;
            updates.amountPaid = 0;
            if (!e.invoiceSentDate) {
                updates.invoiceSentDate = today;
            }
        } else if (status === "בוצע") {
            updates.invoiceStatus = "draft";
            updates.paymentStatus = "unpaid";
            updates.invoiceSentDate = undefined;
            updates.paidDate = undefined;
            updates.amountPaid = 0;
        }

        return { ...e, ...updates };
      })
    );

    // Call server action for all status changes
    await updateEntryStatusAction(id, status);
  };

  const markAsPaid = async (id: string) => {
    updateStatus(id, "שולם");
  };

  const markInvoiceSent = async (id: string) => {
    updateStatus(id, "נשלחה");
  };

  const duplicateEntry = async (entry: IncomeEntry) => {
    const today = new Date();
    // Construct a new entry for duplication
    // We need to match the expected structure for `addEntry`
    const newEntry = {
      date: today.toISOString().split("T")[0],
      description: entry.description,
      clientName: entry.clientName,
      amountGross: entry.amountGross,
      amountPaid: 0,
      category: entry.category,
      notes: entry.notes,
      status: "בוצע" as DisplayStatus,
      vatType: entry.includesVat ? "כולל מע״מ" : entry.vatRate === 0 ? "ללא מע״מ" : "חייב מע״מ" as any
    };
    await addEntry(newEntry);
  };

  const inlineEditEntry = async (id: string, field: string, value: string | number) => {
    // Find the entry
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    // Build form data for update
    const formData = new FormData();
    formData.append("id", id);
    formData.append("date", field === "date" ? String(value) : entry.date);
    formData.append("description", field === "description" ? String(value) : entry.description);
    formData.append("clientName", field === "clientName" ? String(value) : entry.clientName);
    formData.append("amountGross", field === "amountGross" ? String(value) : entry.amountGross.toString());
    formData.append("amountPaid", entry.amountPaid.toString());
    formData.append("category", entry.category || "");
    formData.append("notes", entry.notes || "");
    formData.append("invoiceStatus", entry.invoiceStatus);
    formData.append("paymentStatus", entry.paymentStatus);
    formData.append("vatRate", entry.vatRate.toString());
    formData.append("includesVat", String(entry.includesVat));

    // Optimistically update local state
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        return {
          ...e,
          [field]: value,
        };
      })
    );

    await updateIncomeEntryAction(formData);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Dialog handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const openDialog = (entry: IncomeEntry) => {
    setSelectedEntry(entry);
    setIsDialogOpen(true);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Export handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    exportToCSV(
      filteredEntries,
      `income-${year}-${String(month).padStart(2, "0")}.csv`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Calendar Import handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const openCalendarImportDialog = () => {
    setIsCalendarDialogOpen(true);
  };

  const handleCalendarImport = async (importYear: number, importMonth: number) => {
    try {
      const result = await importFromCalendarAction(importYear, importMonth);
      if (result.success) {
        console.log(`Imported ${result.count} entries from calendar`);
      } else {
        console.error("Failed to import from calendar:", result.error);
      }
    } catch (error) {
      console.error("Failed to import from calendar:", error);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen paper-texture print:bg-white"
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-3 sm:space-y-4 md:space-y-6">
        {/* Header */}
        <IncomeHeader
          selectedMonth={month}
          selectedYear={year}
          onMonthChange={handleMonthChange}
          onYearChange={handleYearChange}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onExportCSV={handleExportCSV}
          onPrint={handlePrint}
          onImportFromCalendar={openCalendarImportDialog}
          monthPaymentStatuses={monthPaymentStatuses}
        />

        {/* KPI Cards */}
        <KPICards
          kpis={kpis}
          selectedMonth={month}
          onFilterClick={setActiveFilter}
          activeFilter={activeFilter}
        />

        {/* Filters */}
        <IncomeFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          clients={monthClients}
          selectedClient={selectedClient}
          onClientChange={setSelectedClient}
          readyToInvoiceCount={kpis.readyToInvoiceCount}
          overdueCount={kpis.overdueCount}
        />

        {/* Main Table */}
        <IncomeTable
          entries={filteredEntries}
          clients={allClients}
          onRowClick={openDialog}
          onStatusChange={updateStatus}
          onMarkAsPaid={markAsPaid}
          onMarkInvoiceSent={markInvoiceSent}
          onDuplicate={duplicateEntry}
          onDelete={deleteEntry}
          onAddEntry={addEntry}
          onInlineEdit={inlineEditEntry}
          onClearFilter={() => {
            setActiveFilter("all");
            setSelectedClient("all");
            setSearchQuery("");
          }}
          hasActiveFilter={activeFilter !== "all" || searchQuery !== "" || selectedClient !== "all"}
          sortDirection={sortDirection}
          onSortToggle={() => setSortDirection(sortDirection === "desc" ? "asc" : "desc")}
        />

        {/* Keyboard shortcuts hint - hidden on mobile */}
        <div className="hidden sm:block text-center text-xs text-slate-400 dark:text-slate-500 print:hidden">
          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono">
            N
          </span>{" "}
          עבודה חדשה
          <span className="mx-2">•</span>
          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono">
            Enter
          </span>{" "}
          הוסף
          <span className="mx-2">•</span>
          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px] font-mono">
            Esc
          </span>{" "}
          סגור
        </div>
      </div>

      {/* Detail Dialog */}
      <IncomeDetailDialog
        entry={selectedEntry}
        isOpen={isDialogOpen}
        onClose={closeDialog}
        onMarkAsPaid={markAsPaid}
        onMarkInvoiceSent={markInvoiceSent}
        onUpdate={updateEntry}
        onStatusChange={updateStatus}
      />

      {/* Calendar Import Dialog */}
      <CalendarImportDialog
        isOpen={isCalendarDialogOpen}
        onClose={() => setIsCalendarDialogOpen(false)}
        onImport={handleCalendarImport}
        defaultYear={year}
        defaultMonth={month}
      />
    </div>
  );
}
