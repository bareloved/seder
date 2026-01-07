"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IncomeHeader } from "./components/IncomeHeader";
import { KPICards } from "./components/KPICards";
import { ScopeToggle } from "./components/ScopeToggle";
import { IncomeTable } from "./components/IncomeTable";
import { IncomeDetailDialog } from "./components/IncomeDetailDialog";
import { CalendarImportDialog } from "./components/CalendarImportDialog";
import { IncomeFilters } from "./components/IncomeFilters";
import type { ViewMode } from "./components/ViewModeToggle";
import { exportToCSV, isOverdue, getDisplayStatus, calculateKPIs, mapStatusToDb, mapVatTypeToDb, getVatTypeFromEntry, formatCurrency, formatFullDate, getTodayDateString, formatScopeLabel } from "./utils";
import { useScopeState } from "./hooks/useScopeState";
import {
  createIncomeEntryAction,
  updateIncomeEntryAction,
  updateEntryStatusAction,
  deleteIncomeEntryAction,
  importFromCalendarAction,
} from "./actions";
import type { IncomeEntry, DisplayStatus, FilterType, KPIData } from "./types";
import type { IncomeAggregates, MonthPaymentStatus } from "./data";
import type { Category } from "@/db/schema";
import type { IncomeEntryWithCategory } from "./data";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { CategoryManagerDialog } from "@/app/categories/components";

// ─────────────────────────────────────────────────────────────────────────────
// View Mode localStorage key and helpers
// ─────────────────────────────────────────────────────────────────────────────
const VIEW_MODE_STORAGE_KEY = "seder_income_view_mode";

function getDefaultViewMode(): ViewMode {
  // Default based on screen width - cards for mobile, list for desktop
  if (typeof window !== "undefined") {
    return window.innerWidth < 768 ? "cards" : "list";
  }
  return "list"; // SSR fallback
}

function getStoredViewMode(): ViewMode | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  if (stored === "list" || stored === "cards") {
    return stored;
  }
  return null;
}

function setStoredViewMode(mode: ViewMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
}

// ─────────────────────────────────────────────────────────────────────────────
// Props interface
// ─────────────────────────────────────────────────────────────────────────────

interface IncomePageClientProps {
  year: number;
  month: number;
  dbEntries: IncomeEntryWithCategory[];
  aggregates: IncomeAggregates;
  clients: string[];
  categories: Category[];
  monthPaymentStatuses: Record<number, MonthPaymentStatus>;
  isGoogleConnected: boolean;
  user: { name: string | null; email: string; image: string | null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper to convert DB entry to UI entry format
// ─────────────────────────────────────────────────────────────────────────────

// Accept either full entry with category data or basic entry from create/update
type DBEntryInput = IncomeEntryWithCategory | {
  id: string;
  date: string;
  description: string;
  clientName: string;
  amountGross: string;
  amountPaid: string;
  vatRate: string;
  includesVat: boolean;
  invoiceStatus: "draft" | "sent" | "paid" | "cancelled";
  paymentStatus: "unpaid" | "partial" | "paid";
  category: string | null;
  categoryId: string | null;
  notes: string | null;
  invoiceSentDate: string | null;
  paidDate: string | null;
  calendarEventId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function dbEntryToUIEntry(dbEntry: DBEntryInput): IncomeEntry {
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
    categoryId: dbEntry.categoryId,
    categoryData: "categoryData" in dbEntry ? dbEntry.categoryData : null,
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
  categories,
  monthPaymentStatuses,
  isGoogleConnected,
  user,
}: IncomePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // KPI Scope state management
  const { scope, setScope } = useScopeState();
  const scopeLabel = React.useMemo(
    () => formatScopeLabel(scope, year, month),
    [scope, year, month]
  );

  // Convert DB entries to UI format
  const initialEntries = React.useMemo(
    () => dbEntries.map(dbEntryToUIEntry),
    [dbEntries]
  );

  const defaultNewEntryDate = React.useMemo(() => {
    const todayString = getTodayDateString();
    const today = new Date(todayString);
    if (today.getFullYear() === year && today.getMonth() + 1 === month) {
      return todayString;
    }
    return `${year}-${String(month).padStart(2, "0")}-01`;
  }, [month, year]);

  // Local state for entries (for optimistic updates)
  const [entries, setEntries] = React.useState<IncomeEntry[]>(initialEntries);

  // Update entries when props change (e.g., month/year navigation)
  React.useEffect(() => {
    setEntries(dbEntries.map(dbEntryToUIEntry));
    // Reset client filter when month changes (selected client may not exist in new month)
    setSelectedClient("all");
    setSelectedCategories([]);
  }, [dbEntries]);

  // ─────────────────────────────────────────────────────────────────────────────
  // View Mode State with localStorage persistence
  // - Defaults: Desktop (md+) → "list", Mobile (sm-) → "cards"
  // - User choice persisted in localStorage and restored on mount
  // ─────────────────────────────────────────────────────────────────────────────
  // Important: start with a deterministic SSR-safe default to avoid hydration mismatches.
  // We defer reading window width/localStorage until after mount.
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  
  // On mount, restore user's saved view mode preference from localStorage or screen width
  React.useEffect(() => {
    const storedMode = getStoredViewMode();
    if (storedMode) {
      setViewMode(storedMode);
      return;
    }
    setViewMode(getDefaultViewMode());
  }, []);

  // Handler to change view mode and persist to localStorage
  const handleViewModeChange = React.useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setStoredViewMode(mode);
  }, []);

  // Dark mode state
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  // Calendar import dialog state
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = React.useState(false);

  // Category manager dialog state
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState<string>("all");
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  // Dialog state
  const [selectedEntry, setSelectedEntry] = React.useState<IncomeEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [initialFocusField, setInitialFocusField] = React.useState<"description" | "amount" | "clientName" | undefined>();

  // Dialog handlers (defined early for use in effects)
  const closeDialog = React.useCallback(() => {
    setIsDialogOpen(false);
    setSelectedEntry(null);
    setInitialFocusField(undefined);
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

    // Category filter
    if (selectedCategories.length > 0) {
      result = result.filter(
        (e) => e.category && selectedCategories.includes(e.category)
      );
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

    // Sort by date without mutating the source array
    return [...result].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === "desc" ? dateB - dateA : dateA - dateB;
    });
  }, [entries, activeFilter, selectedClient, selectedCategories, searchQuery, sortDirection]);

  const mobileTotals = React.useMemo(() => {
    return filteredEntries.reduce(
      (acc, entry) => {
        const status = getDisplayStatus(entry);
        acc.totalGross += entry.amountGross;
        if (status === "שולם") {
          acc.paidSum += entry.amountPaid;
        } else if (status === "נשלחה") {
          acc.waitingSum += entry.amountGross - entry.amountPaid;
        } else {
          acc.toInvoiceSum += entry.amountGross;
        }
        return acc;
      },
      { totalGross: 0, paidSum: 0, waitingSum: 0, toInvoiceSum: 0 }
    );
  }, [filteredEntries]);

  // Client summary derived from currently visible set
  const clientSummary = React.useMemo(() => {
    if (selectedClient === "all") return null;
    const clientEntries = filteredEntries.filter(
      (e) => e.clientName === selectedClient
    );
    const totalMonth = clientEntries.reduce(
      (sum, e) => sum + e.amountGross,
      0
    );
    const statusBuckets = clientEntries.reduce(
      (acc, entry) => {
        const status = getDisplayStatus(entry);
        if (status === "שולם") {
          acc.paidSum += entry.amountPaid;
          acc.paidCount += 1;
        } else if (status === "נשלחה") {
          acc.waitingSum += entry.amountGross - entry.amountPaid;
          acc.waitingCount += 1;
        } else {
          acc.toInvoiceSum += entry.amountGross;
          acc.toInvoiceCount += 1;
        }
        const time = new Date(entry.date).getTime();
        if (!acc.latestDate || time > acc.latestDate.time) {
          acc.latestDate = { time, date: entry.date };
        }
        return acc;
      },
      {
        paidSum: 0,
        waitingSum: 0,
        toInvoiceSum: 0,
        paidCount: 0,
        waitingCount: 0,
        toInvoiceCount: 0,
        latestDate: null as null | { time: number; date: string },
      }
    );

    return {
      totalMonth,
      // We only have current-month entries loaded; reuse for yearly/all-time view
      totalYear: totalMonth,
      latestDateLabel: statusBuckets.latestDate
        ? formatFullDate(statusBuckets.latestDate.date)
        : "—",
      ...statusBuckets,
    };
  }, [filteredEntries, selectedClient]);

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

  const addEntry = React.useCallback(async (entry: Omit<IncomeEntry, "id" | "weekday" | "invoiceStatus" | "paymentStatus" | "vatRate" | "includesVat"> & { status?: DisplayStatus, vatType?: "חייב מע״מ" | "ללא מע״מ" | "כולל מע״מ", invoiceStatus?: "draft" | "sent" | "paid" | "cancelled", paymentStatus?: "unpaid" | "partial" | "paid", vatRate?: number, includesVat?: boolean }) => {
    try {
    const formData = new FormData();
    formData.append("date", entry.date);
    formData.append("description", entry.description);
    formData.append("clientName", entry.clientName);
    formData.append("amountGross", entry.amountGross.toString());
    formData.append("amountPaid", entry.amountPaid.toString());
    if (entry.category) formData.append("category", entry.category);
    if (entry.categoryId) formData.append("categoryId", entry.categoryId);
    if (entry.notes) formData.append("notes", entry.notes);

    // Map Hebrew status to DB status
    const statusMapping = mapStatusToDb(entry.status || "בוצע");
    formData.append("invoiceStatus", statusMapping.invoiceStatus);
    if (statusMapping.paymentStatus) {
      formData.append("paymentStatus", statusMapping.paymentStatus);
    }

    // Map VAT type
    if (entry.vatType) {
      const vatMapping = mapVatTypeToDb(entry.vatType);
      if (vatMapping.vatRate) formData.append("vatRate", vatMapping.vatRate);
      formData.append("includesVat", vatMapping.includesVat);
    } else {
      formData.append("includesVat", "false");
      formData.append("vatRate", "18");
    }

    const result = await createIncomeEntryAction(formData);
    
    if (result.success && result.entry) {
      // Optimistically add to local state
      const newEntry = dbEntryToUIEntry(result.entry);
      setEntries((prev) => [newEntry, ...prev]);
        toast.success("העבודה נשמרה");
    } else {
      console.error("Failed to create entry:", result.error);
        toast.error("לא הצלחנו לשמור, נסה שוב.");
      }
    } catch (error) {
      console.error("Failed to create entry:", error);
      toast.error("לא הצלחנו לשמור, נסה שוב.");
    }
  }, []);

  const updateEntry = React.useCallback(async (updatedEntry: IncomeEntry & { status?: DisplayStatus, vatType?: "חייב מע״מ" | "ללא מע״מ" | "כולל מע״מ" }) => {
    try {
    const formData = new FormData();
    formData.append("id", updatedEntry.id.toString());
    formData.append("date", updatedEntry.date);
    formData.append("description", updatedEntry.description);
    formData.append("clientName", updatedEntry.clientName);
    formData.append("amountGross", updatedEntry.amountGross.toString());
    formData.append("amountPaid", updatedEntry.amountPaid.toString());
    formData.append("category", updatedEntry.category || "");
    if (updatedEntry.categoryId) formData.append("categoryId", updatedEntry.categoryId);

    // Keep notes as-is (calendar draft badge now only depends on amountGross and calendarEventId)
    formData.append("notes", updatedEntry.notes || "");

    // Map Hebrew status to DB status
    // Use the display status if provided, otherwise fall back to existing DB status logic
    if (updatedEntry.status) {
      const statusMapping = mapStatusToDb(updatedEntry.status);
      formData.append("invoiceStatus", statusMapping.invoiceStatus);
      if (statusMapping.paymentStatus) {
        formData.append("paymentStatus", statusMapping.paymentStatus);
      }
    } else {
      // Fallback if status not explicitly changed in UI but exists in object
      formData.append("invoiceStatus", updatedEntry.invoiceStatus);
      formData.append("paymentStatus", updatedEntry.paymentStatus);
    }

    // Map VAT type
    if (updatedEntry.vatType) {
      const vatMapping = mapVatTypeToDb(updatedEntry.vatType);
      if (vatMapping.vatRate) formData.append("vatRate", vatMapping.vatRate);
      formData.append("includesVat", vatMapping.includesVat);
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
      toast.success("העבודה עודכנה");
    } catch (error) {
      console.error("Failed to update entry:", error);
      toast.error("לא הצלחנו לעדכן, נסה שוב.");
    }
  }, []);

  const deleteEntry = React.useCallback(async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSelectedEntry((prev) => (prev?.id === id ? null : prev));
    await deleteIncomeEntryAction(id);
  }, []);

  const updateStatus = React.useCallback(async (id: string, status: DisplayStatus) => {
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

    try {
    await updateEntryStatusAction(id, status);
      const successMessage =
        status === "שולם"
          ? "סומן כ־שולם"
          : status === "נשלחה"
            ? "סומן כ־נשלחה חשבונית"
            : "הסטטוס עודכן";
      toast.success(successMessage);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("לא הצלחנו לעדכן סטטוס, נסה שוב.");
    }
  }, []);

  const markAsPaid = React.useCallback(async (id: string) => {
    await updateStatus(id, "שולם");
  }, [updateStatus]);

  const markInvoiceSent = React.useCallback(async (id: string) => {
    await updateStatus(id, "נשלחה");
  }, [updateStatus]);

  const duplicateEntry = React.useCallback(async (entry: IncomeEntry) => {
    const defaultDate = defaultNewEntryDate ? new Date(defaultNewEntryDate) : new Date();
    // Construct a new entry for duplication
    // We need to match the expected structure for `addEntry`
    const newEntry = {
      date: defaultDate.toISOString().split("T")[0],
      description: entry.description,
      clientName: entry.clientName,
      amountGross: entry.amountGross,
      amountPaid: 0,
      category: entry.category,
      notes: entry.notes,
      status: "בוצע" as DisplayStatus,
      vatType: getVatTypeFromEntry(entry)
    };
    await addEntry(newEntry);
  }, [addEntry, defaultNewEntryDate]);

  const inlineEditEntry = React.useCallback(async (id: string, field: string, value: string | number) => {
    // Optimistically update local state
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;

        // Handle categoryId updates - also update categoryData
        if (field === "categoryId") {
          const selectedCategory = categories.find(c => c.id === value) || null;
          return {
            ...e,
            categoryId: value as string || null,
            categoryData: selectedCategory,
          };
        }

        return {
          ...e,
          [field]: value,
        };
      })
    );

    // Build form data for update - only sending changed field + ID
    // This works because updateIncomeEntrySchema treats all fields as optional
    const formData = new FormData();
    formData.append("id", id);
    formData.append(field, String(value));

    await updateIncomeEntryAction(formData);
  }, [categories]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Dialog handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const openDialog = (entry: IncomeEntry) => {
    setSelectedEntry(entry);
    setInitialFocusField(undefined);
    setIsDialogOpen(true);
  };

  const openNewEntryDialog = () => {
    setSelectedEntry(null);
    setInitialFocusField("description");
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

  // ─────────────────────────────────────────────────────────────────────────────
  // Calendar Import handlers
  // ─────────────────────────────────────────────────────────────────────────────

  const openCalendarImportDialog = () => {
    setIsCalendarDialogOpen(true);
  };

  const handleCalendarImport = async (importYear: number, importMonth: number) => {
    try {
      const result = await importFromCalendarAction(importYear, importMonth);
      if (!result.success) {
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
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-28 space-y-3 sm:space-y-4 md:space-y-6 md:pb-8">
        {/* Header */}
        <IncomeHeader
          selectedMonth={month}
          selectedYear={year}
          onMonthChange={handleMonthChange}
          onYearChange={handleYearChange}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
          onExportCSV={handleExportCSV}
          onImportFromCalendar={openCalendarImportDialog}
          monthPaymentStatuses={monthPaymentStatuses}
          isGoogleConnected={isGoogleConnected}
          user={user}
        />

        {/* KPI Scope Toggle */}
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            מדדי ביצועים
          </h2>
          <ScopeToggle scope={scope} onScopeChange={setScope} />
        </div>

        {/* KPI Cards */}
        <KPICards
          kpis={kpis}
          scopeLabel={scopeLabel}
          onFilterClick={setActiveFilter}
          activeFilter={activeFilter}
        />

        {/* Mobile sticky filters with view toggle */}
        <div className="md:hidden sticky top-0 z-30 -mx-3 px-3 pb-2 pt-1 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200/70 dark:border-slate-800/70">
          <IncomeFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            clients={monthClients}
            selectedClient={selectedClient}
            onClientChange={setSelectedClient}
            categories={categories}
            selectedCategories={selectedCategories}
            onCategoryChange={setSelectedCategories}
            onNewEntry={openNewEntryDialog}
            onEditCategories={() => setIsCategoryDialogOpen(true)}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
          />
        </div>

        {/* Client summary (when a specific client is selected) */}
        {clientSummary && (
          <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="p-3 sm:p-4 grid gap-3 sm:gap-4 sm:grid-cols-5 items-start sm:items-center text-right">
              <div className="space-y-0.5">
                <p className="text-xs text-slate-500 dark:text-slate-400">סיכום לקוח</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {selectedClient}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  עבודה אחרונה: {clientSummary.latestDateLabel}
                </p>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  סה״כ החודש
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100" dir="ltr">
                  {formatCurrency(clientSummary.totalMonth)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  סה״כ השנה
                </span>
                <span className="text-sm font-bold text-slate-400 dark:text-slate-500">
                  בקרוב
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  סטטוסים
                </span>
                <div className="flex flex-wrap gap-1">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800">
                    {clientSummary.paidCount} שולם
                  </Badge>
                  <Badge className="bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800">
                    {clientSummary.waitingCount} מחכה
                  </Badge>
                  <Badge className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/40 dark:text-slate-200 dark:border-slate-700">
                    {clientSummary.toInvoiceCount} לשלוח
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  פירוט סכומים
                </span>
                <div className="flex flex-col text-[11px] leading-tight text-slate-600 dark:text-slate-300" dir="ltr">
                  <span>✓ {formatCurrency(clientSummary.paidSum)}</span>
                  <span>⌛ {formatCurrency(clientSummary.waitingSum)}</span>
                  <span>📝 {formatCurrency(clientSummary.toInvoiceSum)}</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Main Table/Cards View */}
        <IncomeTable
          entries={filteredEntries}
          clients={allClients}
          categories={categories}
          defaultDate={defaultNewEntryDate}
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
            setSelectedCategories([]);
          }}
          hasActiveFilter={
            activeFilter !== "all" ||
            searchQuery !== "" ||
            selectedClient !== "all" ||
            selectedCategories.length > 0
          }
          sortDirection={sortDirection}
          onSortToggle={() => setSortDirection(sortDirection === "desc" ? "asc" : "desc")}
          // Filter/search props
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          monthClients={monthClients}
          selectedClient={selectedClient}
          onClientChange={setSelectedClient}
          selectedCategories={selectedCategories}
          onCategoryChange={setSelectedCategories}
          onNewEntry={openNewEntryDialog}
          onEditCategories={() => setIsCategoryDialogOpen(true)}
          // View mode props
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
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

      <FloatingActionButton onClick={openNewEntryDialog} />
      {filteredEntries.length > 0 && (
        <MobileTotalsBar
          totalGross={mobileTotals.totalGross}
          paidSum={mobileTotals.paidSum}
          waitingSum={mobileTotals.waitingSum}
          toInvoiceSum={mobileTotals.toInvoiceSum}
        />
      )}

      {/* Detail Dialog */}
      <IncomeDetailDialog
        entry={selectedEntry}
        categories={categories}
        isOpen={isDialogOpen}
        onClose={closeDialog}
        onMarkAsPaid={markAsPaid}
        onMarkInvoiceSent={markInvoiceSent}
        onUpdate={updateEntry}
        onAdd={addEntry}
        defaultDateForNew={defaultNewEntryDate}
        initialFocusField={initialFocusField}
      />

      {/* Calendar Import Dialog */}
      <CalendarImportDialog
        isOpen={isCalendarDialogOpen}
        onClose={() => setIsCalendarDialogOpen(false)}
        onImport={handleCalendarImport}
        defaultYear={year}
        defaultMonth={month}
      />

      {/* Category Manager Dialog */}
      <CategoryManagerDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        initialCategories={categories}
      />
    </div>
  );
}

function FloatingActionButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="md:hidden print:hidden fixed bottom-24 right-4 z-40 flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        aria-label="עבודה חדשה"
        className="h-14 w-14 rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 active:scale-95 transition-transform flex items-center justify-center"
      >
        <Plus className="h-6 w-6" />
      </button>
      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
        עבודה חדשה
      </span>
    </div>
  );
}

function MobileTotalsBar({
  totalGross,
  paidSum,
  waitingSum,
  toInvoiceSum,
}: {
  totalGross: number;
  paidSum: number;
  waitingSum: number;
  toInvoiceSum: number;
}) {
  const pending = waitingSum + toInvoiceSum;
  return (
    <div className="md:hidden print:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pb-4">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-lg shadow-slate-900/5">
        <div className="grid grid-cols-3 px-4 py-3 text-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">סה״כ</span>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-50 font-numbers" dir="ltr">
              {formatCurrency(totalGross)}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm text-emerald-600 dark:text-emerald-300 font-medium">שולם</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-300 font-numbers" dir="ltr">
              {formatCurrency(paidSum)}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-sm text-orange-600 dark:text-orange-300 font-medium">ממתין</span>
            <span className="text-lg font-bold text-orange-600 dark:text-orange-300 font-numbers" dir="ltr">
              {formatCurrency(pending)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
