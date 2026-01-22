"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { KPICards } from "./components/KPICards";
import { IncomeTable } from "./components/IncomeTable";
import { IncomeDetailDialog } from "./components/IncomeDetailDialog";
import { CalendarImportDialog } from "./components/CalendarImportDialog";
import { IncomeFilters } from "./components/IncomeFilters";
import { IncomeListView } from "./components/IncomeListView";
import type { ViewMode } from "./components/ViewModeToggle";
import { isOverdue, getDisplayStatus, calculateKPIs, mapStatusToDb, mapVatTypeToDb, getVatTypeFromEntry, getWorkStatus, getMoneyStatus, mapMoneyStatusToDb } from "./utils";
import {
  createIncomeEntryAction,
  updateIncomeEntryAction,
  updateEntryStatusAction,
  deleteIncomeEntryAction,
  batchUpdateEntriesAction,
  batchDeleteEntriesAction,
} from "./actions";
import { BatchActionBar } from "./components/BatchActionBar";
import { BatchEditDialog } from "./components/BatchEditDialog";
import { BatchDeleteDialog } from "./components/BatchDeleteDialog";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { IncomeEntry, DisplayStatus, FilterType, KPIData, MoneyStatus } from "./types";
import type { SortColumn } from "./components/income-table/IncomeTableHeader";
import type { IncomeAggregates, MonthPaymentStatus } from "./data";
import type { Category, Client } from "@/db/schema";
import type { IncomeEntryWithCategory } from "./data";
import { toast } from "sonner";
import { CategoryManagerDialog } from "@/app/categories/components";
import { OnboardingTour, EXAMPLE_INCOME_ENTRY } from "@/components/onboarding";

const VIEW_MODE_STORAGE_KEY = "seder_income_view_mode";

function getDefaultViewMode(): ViewMode {
  if (typeof window !== "undefined") {
    return window.innerWidth < 768 ? "cards" : "list";
  }
  return "list";
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

interface IncomePageClientProps {
  year: number;
  month: number;
  dbEntries: IncomeEntryWithCategory[];
  aggregates: IncomeAggregates;
  clients: string[];
  clientRecords: Client[];
  categories: Category[];
  monthPaymentStatuses: Record<number, MonthPaymentStatus>;
  isGoogleConnected: boolean;
  user: { name: string | null; email: string; image: string | null };
  todayDateString: string;
  showOnboarding?: boolean;
}

export function dbEntryToUIEntry(dbEntry: any): IncomeEntry {
  return {
    id: dbEntry.id,
    date: dbEntry.date,
    description: dbEntry.description,
    clientName: dbEntry.clientName,
    clientId: dbEntry.clientId,
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

export default function IncomePageClient({
  year,
  month,
  dbEntries,
  aggregates,
  clients: initialClients,
  clientRecords,
  categories,
  monthPaymentStatuses,
  isGoogleConnected,
  user,
  todayDateString,
  showOnboarding = false,
}: IncomePageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = React.useTransition();

  const initialEntries = React.useMemo(
    () => dbEntries.map(dbEntryToUIEntry),
    [dbEntries]
  );

  const defaultNewEntryDate = React.useMemo(() => {
    const today = new Date(todayDateString);
    if (today.getFullYear() === year && today.getMonth() + 1 === month) {
      return todayDateString;
    }
    return `${year}-${String(month).padStart(2, "0")}-01`;
  }, [month, year, todayDateString]);

  const [entries, setEntries] = React.useState<IncomeEntry[]>(initialEntries);

  React.useEffect(() => {
    setEntries(dbEntries.map(dbEntryToUIEntry));
    setSelectedClient("all");
    setSelectedCategories([]);
  }, [dbEntries]);

  const [viewMode, setViewMode] = React.useState<ViewMode>("list");

  React.useEffect(() => {
    const storedMode = getStoredViewMode();
    if (storedMode) {
      setViewMode(storedMode);
      return;
    }
    setViewMode(getDefaultViewMode());
  }, []);

  const handleViewModeChange = React.useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setStoredViewMode(mode);
  }, []);

  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = React.useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);

  const handleImportStart = React.useCallback(() => {
    setIsImporting(true);
  }, []);

  const handleImportEnd = React.useCallback((success: boolean, error?: string) => {
    setIsImporting(false);
    if (!success && error) {
      toast.error(
        <div dir="rtl">
          <div className="font-medium">הייבוא נכשל</div>
          <div className="text-sm mt-1">נסה שוב או חבר מחדש את Google Calendar</div>
        </div>
      );
    }
  }, []);

  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState<string>("all");
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [sortColumn, setSortColumn] = React.useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const [selectedEntry, setSelectedEntry] = React.useState<IncomeEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [initialFocusField, setInitialFocusField] = React.useState<"description" | "amount" | "clientName" | undefined>();
  const [prefillData, setPrefillData] = React.useState<typeof EXAMPLE_INCOME_ENTRY | undefined>();

  // Selection state for batch operations
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [batchEditType, setBatchEditType] = React.useState<"client" | "category" | null>(null);
  const [isBatchLoading, setIsBatchLoading] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const closeDialog = React.useCallback(() => {
    setIsDialogOpen(false);
    setSelectedEntry(null);
    setInitialFocusField(undefined);
    setPrefillData(undefined);
  }, []);

  // Clear selection when month/year changes
  React.useEffect(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, [month, year]);

  // Selection handlers
  const toggleSelectionMode = React.useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        // Exiting selection mode, clear selection
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const toggleSelection = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      // Auto-enter selection mode when first item is selected
      if (newSet.size > 0 && !isSelectionMode) {
        setIsSelectionMode(true);
      }
      return newSet;
    });
  }, [isSelectionMode]);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, []);

  // Batch action handlers
  const batchMarkAsPaid = React.useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsBatchLoading(true);
    const today = new Date().toISOString().split("T")[0];

    // Optimistic update
    setEntries((prev) =>
      prev.map((e) => {
        if (!selectedIds.has(e.id)) return e;
        return {
          ...e,
          invoiceStatus: "paid" as const,
          paymentStatus: "paid" as const,
          paidDate: today,
          amountPaid: e.amountGross,
        };
      })
    );

    const result = await batchUpdateEntriesAction(Array.from(selectedIds), { markAsPaid: true });

    if (result.success) {
      toast.success(`${result.updatedCount} עבודות סומנו כשולמו`);
      clearSelection();
    } else {
      toast.error("שגיאה בעדכון");
    }

    setIsBatchLoading(false);
  }, [selectedIds, clearSelection]);

  const batchMarkInvoiceSent = React.useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsBatchLoading(true);
    const today = new Date().toISOString().split("T")[0];

    // Optimistic update
    setEntries((prev) =>
      prev.map((e) => {
        if (!selectedIds.has(e.id)) return e;
        return {
          ...e,
          invoiceStatus: "sent" as const,
          invoiceSentDate: e.invoiceSentDate || today,
        };
      })
    );

    const result = await batchUpdateEntriesAction(Array.from(selectedIds), { markInvoiceSent: true });

    if (result.success) {
      toast.success(`${result.updatedCount} חשבוניות סומנו כנשלחו`);
      clearSelection();
    } else {
      toast.error("שגיאה בעדכון");
    }

    setIsBatchLoading(false);
  }, [selectedIds, clearSelection]);

  const batchChangeClient = React.useCallback(async (clientName: string | null) => {
    if (selectedIds.size === 0) return;
    setIsBatchLoading(true);

    // Optimistic update
    setEntries((prev) =>
      prev.map((e) => {
        if (!selectedIds.has(e.id)) return e;
        return { ...e, clientName: clientName || "" };
      })
    );

    const result = await batchUpdateEntriesAction(Array.from(selectedIds), { clientName: clientName || "" });

    if (result.success) {
      toast.success(`${result.updatedCount} עבודות עודכנו`);
      clearSelection();
    } else {
      toast.error("שגיאה בעדכון");
    }

    setIsBatchLoading(false);
    setBatchEditType(null);
  }, [selectedIds, clearSelection]);

  const batchChangeCategory = React.useCallback(async (categoryId: string | null) => {
    if (selectedIds.size === 0) return;
    setIsBatchLoading(true);

    const selectedCategory = categoryId ? categories.find(c => c.id === categoryId) || null : null;

    // Optimistic update
    setEntries((prev) =>
      prev.map((e) => {
        if (!selectedIds.has(e.id)) return e;
        return { ...e, categoryId: categoryId, categoryData: selectedCategory };
      })
    );

    const result = await batchUpdateEntriesAction(Array.from(selectedIds), { categoryId });

    if (result.success) {
      toast.success(`${result.updatedCount} עבודות עודכנו`);
      clearSelection();
    } else {
      toast.error("שגיאה בעדכון");
    }

    setIsBatchLoading(false);
    setBatchEditType(null);
  }, [selectedIds, categories, clearSelection]);

  const handleBatchEditConfirm = React.useCallback((value: string | null) => {
    if (batchEditType === "client") {
      batchChangeClient(value);
    } else if (batchEditType === "category") {
      batchChangeCategory(value);
    }
  }, [batchEditType, batchChangeClient, batchChangeCategory]);

  const batchDelete = React.useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsBatchLoading(true);

    const idsToDelete = Array.from(selectedIds);

    // Optimistic update - remove entries from state
    setEntries((prev) => prev.filter((e) => !selectedIds.has(e.id)));

    const result = await batchDeleteEntriesAction(idsToDelete);

    if (result.success) {
      toast.success(`${result.deletedCount} עבודות נמחקו`);
      clearSelection();
    } else {
      toast.error("שגיאה במחיקה");
      // Revert on error - this will be handled by the next data refresh
    }

    setIsBatchLoading(false);
    setShowDeleteConfirm(false);
  }, [selectedIds, clearSelection]);

  const monthClients = React.useMemo(() => {
    const uniqueClients = new Set(
      entries.map((e) => e.clientName).filter((name) => name && name.trim() !== "")
    );
    return Array.from(uniqueClients).sort();
  }, [entries]);

  const allClients = React.useMemo(() => {
    // Client records are already sorted by job frequency (most used first)
    const clientNamesFromRecords = clientRecords.map((c) => c.name);
    const seenNames = new Set(clientNamesFromRecords.map(n => n.toLowerCase()));

    // Collect additional client names from entries and initialClients
    // that aren't already in clientRecords (legacy entries without client record)
    const additionalNames: string[] = [];
    for (const name of [...initialClients, ...entries.map((e) => e.clientName)]) {
      if (name && name.trim() !== "" && !seenNames.has(name.toLowerCase())) {
        seenNames.add(name.toLowerCase());
        additionalNames.push(name);
      }
    }

    return [...clientNamesFromRecords, ...additionalNames];
  }, [clientRecords, initialClients, entries]);

  const kpis: KPIData = React.useMemo(() => {
    const localKPIs = calculateKPIs(entries, month, year, aggregates.previousMonthPaid);
    return {
      outstanding: aggregates.outstanding,
      readyToInvoice: aggregates.readyToInvoice,
      readyToInvoiceCount: aggregates.readyToInvoiceCount,
      thisMonth: localKPIs.thisMonth,
      thisMonthCount: localKPIs.thisMonthCount,
      trend: aggregates.trend,
      totalPaid: localKPIs.totalPaid,
      overdueCount: aggregates.overdueCount,
      invoicedCount: aggregates.invoicedCount,
    };
  }, [entries, month, year, aggregates]);

  const filteredEntries = React.useMemo(() => {
    let result = entries;

    switch (activeFilter) {
      case "ready-to-invoice":
        // Work done + no invoice sent yet
        result = result.filter((e) => getWorkStatus(e) === "done" && getMoneyStatus(e) === "no_invoice");
        break;
      case "invoiced":
        // Invoice sent, waiting for payment
        result = result.filter((e) => getMoneyStatus(e) === "invoice_sent");
        break;
      case "paid":
        // Paid
        result = result.filter((e) => getMoneyStatus(e) === "paid");
        break;
      case "overdue":
        // Invoice sent > 30 days ago, not paid
        result = result.filter((e) => isOverdue(e));
        break;
    }

    if (selectedClient !== "all") {
      result = result.filter((e) => e.clientName === selectedClient);
    }

    if (selectedCategories.length > 0) {
      result = result.filter(
        (e) => e.category && selectedCategories.includes(e.category)
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(query) ||
          e.clientName.toLowerCase().includes(query) ||
          (e.category && e.category.toLowerCase().includes(query))
      );
    }

    return [...result].sort((a, b) => {
      const multiplier = sortDirection === "desc" ? -1 : 1;

      switch (sortColumn) {
        case "date": {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          return multiplier * (dateA - dateB);
        }
        case "description":
          return multiplier * a.description.localeCompare(b.description, "he");
        case "amount":
          return multiplier * (a.amountGross - b.amountGross);
        case "client":
          return multiplier * (a.clientName || "").localeCompare(b.clientName || "", "he");
        case "category": {
          const catA = a.categoryData?.name || a.category || "";
          const catB = b.categoryData?.name || b.category || "";
          return multiplier * catA.localeCompare(catB, "he");
        }
        case "status": {
          const statusOrder: Record<string, number> = { "בוצע": 0, "נשלחה": 1, "שולם": 2 };
          const statusA = getDisplayStatus(a) || "";
          const statusB = getDisplayStatus(b) || "";
          return multiplier * ((statusOrder[statusA] ?? 0) - (statusOrder[statusB] ?? 0));
        }
        default:
          return 0;
      }
    });
  }, [entries, activeFilter, selectedClient, selectedCategories, searchQuery, sortColumn, sortDirection]);

  // Define selectAll after filteredEntries to avoid circular dependency
  const selectAll = React.useCallback(() => {
    const allVisibleIds = filteredEntries.map((e) => e.id);
    setSelectedIds(new Set(allVisibleIds));
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }
  }, [filteredEntries, isSelectionMode]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDialogOpen) closeDialog();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDialogOpen, closeDialog]);

  const handleMonthChange = (newMonth: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", newMonth.toString());
      params.set("year", year.toString());
      router.push(`/income?${params.toString()}`);
    });
  };

  const handleYearChange = (newYear: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("year", newYear.toString());
      params.set("month", month.toString());
      router.push(`/income?${params.toString()}`);
    });
  };

  const handleMonthYearChange = (newMonth: number, newYear: number) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", newMonth.toString());
      params.set("year", newYear.toString());
      router.push(`/income?${params.toString()}`);
    });
  };

  const addEntry = React.useCallback(async (entry: any) => {
    try {
      const formData = new FormData();
      formData.append("date", entry.date);
      formData.append("description", entry.description);
      formData.append("clientName", entry.clientName || "");
      if (entry.clientId) formData.append("clientId", entry.clientId);
      formData.append("amountGross", entry.amountGross.toString());
      formData.append("amountPaid", entry.amountPaid.toString());
      if (entry.category) formData.append("category", entry.category);
      if (entry.categoryId) formData.append("categoryId", entry.categoryId);
      if (entry.notes) formData.append("notes", entry.notes);

      const statusMapping = mapStatusToDb(entry.status || "בוצע");
      formData.append("invoiceStatus", statusMapping.invoiceStatus);
      if (statusMapping.paymentStatus) {
        formData.append("paymentStatus", statusMapping.paymentStatus);
      }

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
        const newEntry = dbEntryToUIEntry(result.entry);
        setEntries((prev) => [newEntry, ...prev]);
        toast.success("העבודה נשמרה");
      } else {
        toast.error("לא הצלחנו לשמור, נסה שוב.");
      }
    } catch (error) {
      toast.error("לא הצלחנו לשמור, נסה שוב.");
    }
  }, []);

  const updateEntry = React.useCallback(async (updatedEntry: any) => {
    try {
      const formData = new FormData();
      formData.append("id", updatedEntry.id.toString());
      formData.append("date", updatedEntry.date);
      formData.append("description", updatedEntry.description);
      formData.append("clientName", updatedEntry.clientName);
      formData.append("clientId", updatedEntry.clientId || "");
      formData.append("amountGross", updatedEntry.amountGross.toString());
      formData.append("amountPaid", updatedEntry.amountPaid.toString());
      formData.append("category", updatedEntry.category || "");
      if (updatedEntry.categoryId) formData.append("categoryId", updatedEntry.categoryId);
      formData.append("notes", updatedEntry.notes || "");

      if (updatedEntry.status) {
        const statusMapping = mapStatusToDb(updatedEntry.status);
        formData.append("invoiceStatus", statusMapping.invoiceStatus);
        if (statusMapping.paymentStatus) {
          formData.append("paymentStatus", statusMapping.paymentStatus);
        }
      } else {
        formData.append("invoiceStatus", updatedEntry.invoiceStatus);
        formData.append("paymentStatus", updatedEntry.paymentStatus);
      }

      if (updatedEntry.vatType) {
        const vatMapping = mapVatTypeToDb(updatedEntry.vatType);
        if (vatMapping.vatRate) formData.append("vatRate", vatMapping.vatRate);
        formData.append("includesVat", vatMapping.includesVat);
      } else {
        formData.append("vatRate", updatedEntry.vatRate.toString());
        formData.append("includesVat", String(updatedEntry.includesVat));
      }

      const optimisticEntry = {
        ...updatedEntry,
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
      toast.error("לא הצלחנו לעדכן, נסה שוב.");
    }
  }, []);

  const deleteEntry = React.useCallback(async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSelectedEntry((prev) => (prev?.id === id ? null : prev));
    await deleteIncomeEntryAction(id);
  }, []);

  const updateStatus = React.useCallback(async (id: string, status: DisplayStatus) => {
    const today = new Date().toISOString().split("T")[0];
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updates: Partial<IncomeEntry> = {};
        if (status === "שולם") {
          updates.invoiceStatus = "paid"; updates.paymentStatus = "paid"; updates.paidDate = today; updates.amountPaid = e.amountGross;
        } else if (status === "נשלחה") {
          updates.invoiceStatus = "sent"; updates.paymentStatus = "unpaid"; updates.paidDate = undefined; updates.amountPaid = 0; if (!e.invoiceSentDate) updates.invoiceSentDate = today;
        } else if (status === "בוצע") {
          updates.invoiceStatus = "draft"; updates.paymentStatus = "unpaid"; updates.invoiceSentDate = undefined; updates.paidDate = undefined; updates.amountPaid = 0;
        }
        return { ...e, ...updates };
      })
    );
    await updateEntryStatusAction(id, status);
  }, []);

  const markAsPaid = React.useCallback(async (id: string) => { await updateStatus(id, "שולם"); }, [updateStatus]);
  const markInvoiceSent = React.useCallback(async (id: string) => { await updateStatus(id, "נשלחה"); }, [updateStatus]);

  // Handler for money status changes from SplitStatusPill
  const updateMoneyStatus = React.useCallback(async (id: string, moneyStatus: MoneyStatus) => {
    const today = new Date().toISOString().split("T")[0];

    // Map money status to display status for the existing updateStatus function
    let displayStatus: DisplayStatus;
    if (moneyStatus === "paid") {
      displayStatus = "שולם";
    } else if (moneyStatus === "invoice_sent") {
      displayStatus = "נשלחה";
    } else {
      displayStatus = "בוצע";
    }

    await updateStatus(id, displayStatus);
  }, [updateStatus]);

  const duplicateEntry = React.useCallback(async (entry: IncomeEntry) => {
    const defaultDate = defaultNewEntryDate ? new Date(defaultNewEntryDate) : new Date();
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
    // Optimistic update
    const previousEntries = entries;
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (field === "categoryId") {
          const selectedCategory = categories.find(c => c.id === value) || null;
          return { ...e, categoryId: value as string || null, categoryData: selectedCategory };
        }
        if (field === "clientId") {
          // Convert empty string to null for clientId
          return { ...e, clientId: value as string || null };
        }
        return { ...e, [field]: value };
      })
    );

    // Send update to server
    const formData = new FormData();
    formData.append("id", id);
    formData.append(field, String(value));
    const result = await updateIncomeEntryAction(formData);

    // Handle errors - revert optimistic update if save failed
    if (!result.success) {
      setEntries(previousEntries);
      toast.error("לא הצלחנו לשמור את השינוי");
      console.error("Inline edit failed:", result.error);
    }
  }, [categories, entries]);

  const openDialog = (entry: IncomeEntry) => {
    setSelectedEntry(entry);
    setInitialFocusField(undefined);
    setIsDialogOpen(true);
  };

  const openNewEntryDialog = React.useCallback((prefill?: typeof EXAMPLE_INCOME_ENTRY) => {
    setSelectedEntry(null);
    setInitialFocusField("description");
    setPrefillData(prefill);
    setIsDialogOpen(true);
  }, []);

  const onSort = React.useCallback((column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }, [sortColumn]);

  const hasActiveFilter =
    activeFilter !== "all" ||
    searchQuery !== "" ||
    selectedClient !== "all" ||
    selectedCategories.length > 0;

  const viewProps = {
    entries: filteredEntries,
    onDelete: deleteEntry,
    onStatusChange: updateStatus,
    onMoneyStatusChange: updateMoneyStatus,
    onMarkAsPaid: markAsPaid,
    onMarkInvoiceSent: markInvoiceSent,
    onDuplicate: duplicateEntry,
    onRowClick: openDialog,
    clients: allClients,
    clientRecords: clientRecords,
    categories: categories,
    viewMode: viewMode,
    onViewModeChange: handleViewModeChange,
    onAddEntry: addEntry,
    hasActiveFilter: hasActiveFilter,
    sortColumn: sortColumn,
    sortDirection: sortDirection,
    onSort: onSort,
    searchQuery: searchQuery,
    onSearchChange: setSearchQuery,
    monthClients: monthClients,
    selectedClient: selectedClient,
    onClientChange: setSelectedClient,
    selectedCategories: selectedCategories,
    onCategoryChange: setSelectedCategories,
    onNewEntry: () => openNewEntryDialog(),
    onEditCategories: () => setIsCategoryDialogOpen(true),
    onInlineEdit: inlineEditEntry,
    // Selection props
    isSelectionMode: isSelectionMode,
    selectedIds: selectedIds,
    onToggleSelection: toggleSelection,
    onSelectAll: selectAll,
    onToggleSelectionMode: toggleSelectionMode,
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background pb-24 md:pb-20 font-sans" dir="rtl">

      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-2 sm:px-12 lg:px-20 py-3 sm:py-8 space-y-3 sm:space-y-6">

        {/* KPI Section */}
        <section>
          <KPICards
            kpis={kpis}
            selectedMonth={month}
            onFilterClick={setActiveFilter}
            activeFilter={activeFilter}
          />
        </section>

        {/* Main Content Card - Filters + Table in one white container */}
        <section className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200/60 dark:border-border overflow-hidden">

          {/* Toolbar / Filters Area */}
          <div className="p-2 border-b border-slate-100 dark:border-border">
            <IncomeFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              clients={monthClients}
              selectedClient={selectedClient}
              onClientChange={setSelectedClient}
              categories={categories}
              selectedCategories={selectedCategories}
              onCategoryChange={setSelectedCategories}
              onNewEntry={() => openNewEntryDialog()}
              year={year}
              month={month}
              onYearChange={handleYearChange}
              onMonthChange={handleMonthChange}
              onMonthYearChange={handleMonthYearChange}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              monthPaymentStatuses={monthPaymentStatuses}
              isGoogleConnected={isGoogleConnected}
              onImportFromCalendar={() => setIsCalendarDialogOpen(true)}
              isNavigating={isNavigating}
              isImporting={isImporting}
            />
          </div>

          {/* Content Area */}
          <div className="p-0" data-tour="income-table">
            {filteredEntries.length === 0 && !hasActiveFilter ? (
              // Empty State
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <p className="font-medium">אין נתונים להצגה</p>
                <p className="text-sm mt-1">התחל להוסיף עבודות כדי לראות אותן כאן</p>
              </div>
            ) : (
              <>
                {/* Table / List View */}
                {viewMode === "list" ? (
                  <IncomeTable {...viewProps} />
                ) : (
                  <div className="p-4">
                    <IncomeListView {...viewProps} />
                  </div>
                )}
              </>
            )}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-400">
        <div className="flex justify-center gap-6 mb-2">
          <a href="#" className="hover:text-slate-600 transition-colors">הצהרת נגישות</a>
          <a href="#" className="hover:text-slate-600 transition-colors">מדיניות פרטיות</a>
          <a href="#" className="hover:text-slate-600 transition-colors">תנאי שימוש</a>
        </div>
        <p>© 2026 סדר</p>
      </footer>

      <IncomeDetailDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        entry={selectedEntry}
        onUpdate={updateEntry}
        onAdd={addEntry}
        onMarkAsPaid={markAsPaid}
        onMarkInvoiceSent={markInvoiceSent}
        categories={categories}
        clients={clientRecords}
        initialFocusField={initialFocusField}
        prefillData={prefillData}
      />

      <CalendarImportDialog
        isOpen={isCalendarDialogOpen}
        onClose={() => setIsCalendarDialogOpen(false)}
        defaultYear={year}
        defaultMonth={month}
        onImportStart={handleImportStart}
        onImportEnd={handleImportEnd}
      />

      <CategoryManagerDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        initialCategories={categories}
      />

      {/* Batch Action Bar */}
      <BatchActionBar
        selectedCount={selectedIds.size}
        onMarkAsPaid={batchMarkAsPaid}
        onMarkInvoiceSent={batchMarkInvoiceSent}
        onChangeClient={() => setBatchEditType("client")}
        onChangeCategory={() => setBatchEditType("category")}
        onDelete={() => setShowDeleteConfirm(true)}
        onClearSelection={clearSelection}
        isLoading={isBatchLoading}
      />

      {/* Batch Edit Dialog */}
      <BatchEditDialog
        isOpen={batchEditType !== null}
        onClose={() => setBatchEditType(null)}
        editType={batchEditType}
        selectedCount={selectedIds.size}
        clients={allClients}
        clientRecords={clientRecords}
        categories={categories}
        onConfirm={handleBatchEditConfirm}
        isLoading={isBatchLoading}
      />

      {/* Batch Delete Confirmation */}
      <BatchDeleteDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        selectedCount={selectedIds.size}
        onConfirm={batchDelete}
        isLoading={isBatchLoading}
      />

      {/* Mobile Floating Add Button */}
      <Button
        size="icon"
        onClick={() => openNewEntryDialog()}
        className="md:hidden fixed bottom-20 right-4 h-9 w-9 rounded-full shadow-sm bg-[#2ecc71] hover:bg-[#27ae60] text-white z-40"
        style={{ display: selectedIds.size > 0 ? 'none' : 'flex' }}
        data-tour="add-button-mobile"
      >
        <Plus className="h-5 w-5" />
      </Button>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav hidden={selectedIds.size > 0} />

      {/* Onboarding Tour */}
      <OnboardingTour
        showOnboarding={showOnboarding}
        onOpenAddDialog={openNewEntryDialog}
        onOpenCalendarDialog={() => setIsCalendarDialogOpen(true)}
        isGoogleConnected={isGoogleConnected}
        isDialogOpen={isDialogOpen}
      />

    </div>
  );
}
