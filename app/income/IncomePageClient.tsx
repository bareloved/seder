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
import { isOverdue, getDisplayStatus, calculateKPIs, mapStatusToDb, mapVatTypeToDb, getVatTypeFromEntry, getTodayDateString } from "./utils";
import {
  createIncomeEntryAction,
  updateIncomeEntryAction,
  updateEntryStatusAction,
  deleteIncomeEntryAction,
} from "./actions";
import type { IncomeEntry, DisplayStatus, FilterType, KPIData } from "./types";
import type { SortColumn } from "./components/income-table/IncomeTableHeader";
import type { IncomeAggregates, MonthPaymentStatus } from "./data";
import type { Category } from "@/db/schema";
import type { IncomeEntryWithCategory } from "./data";
import { toast } from "sonner";
import { CategoryManagerDialog } from "@/app/categories/components";

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
  categories: Category[];
  monthPaymentStatuses: Record<number, MonthPaymentStatus>;
  isGoogleConnected: boolean;
  user: { name: string | null; email: string; image: string | null };
}

export function dbEntryToUIEntry(dbEntry: any): IncomeEntry {
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

  const [activeFilter, setActiveFilter] = React.useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedClient, setSelectedClient] = React.useState<string>("all");
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [sortColumn, setSortColumn] = React.useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  const [selectedEntry, setSelectedEntry] = React.useState<IncomeEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [initialFocusField, setInitialFocusField] = React.useState<"description" | "amount" | "clientName" | undefined>();

  const closeDialog = React.useCallback(() => {
    setIsDialogOpen(false);
    setSelectedEntry(null);
    setInitialFocusField(undefined);
  }, []);

  const monthClients = React.useMemo(() => {
    const uniqueClients = new Set(
      entries.map((e) => e.clientName).filter((name) => name && name.trim() !== "")
    );
    return Array.from(uniqueClients).sort();
  }, [entries]);

  const allClients = React.useMemo(() => {
    const uniqueClients = new Set([
      ...initialClients,
      ...entries.map((e) => e.clientName),
    ]);
    return Array.from(uniqueClients).filter((name) => name && name.trim() !== "").sort();
  }, [initialClients, entries]);

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

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDialogOpen) closeDialog();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDialogOpen, closeDialog]);

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

  const handleMonthYearChange = (newMonth: number, newYear: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", newMonth.toString());
    params.set("year", newYear.toString());
    router.push(`/income?${params.toString()}`);
  };

  const addEntry = React.useCallback(async (entry: any) => {
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
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (field === "categoryId") {
          const selectedCategory = categories.find(c => c.id === value) || null;
          return { ...e, categoryId: value as string || null, categoryData: selectedCategory };
        }
        return { ...e, [field]: value };
      })
    );
    const formData = new FormData();
    formData.append("id", id);
    formData.append(field, String(value));
    await updateIncomeEntryAction(formData);
  }, [categories]);

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
    onMarkAsPaid: markAsPaid,
    onMarkInvoiceSent: markInvoiceSent,
    onDuplicate: duplicateEntry,
    onRowClick: openDialog,
    clients: allClients,
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
    onNewEntry: openNewEntryDialog,
    onEditCategories: () => setIsCategoryDialogOpen(true),
    onInlineEdit: inlineEditEntry,
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-slate-950/50 pb-20 font-sans" dir="rtl">

      <Navbar user={user} isGoogleConnected={isGoogleConnected} />

      <main className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-8 space-y-6">

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
        <section className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden">

          {/* Toolbar / Filters Area */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <IncomeFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              clients={monthClients}
              selectedClient={selectedClient}
              onClientChange={setSelectedClient}
              categories={categories}
              selectedCategories={selectedCategories}
              onCategoryChange={setSelectedCategories}
              onNewEntry={openNewEntryDialog} // We can invoke the dialog or stick to inline
              year={year}
              month={month}
              onYearChange={handleYearChange}
              onMonthChange={handleMonthChange}
              onMonthYearChange={handleMonthYearChange}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              monthPaymentStatuses={monthPaymentStatuses}
            />
          </div>

          {/* Content Area */}
          <div className="p-0">
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
        <p>© 2026 סדר - יוצאים לעצמאות</p>
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
        initialFocusField={initialFocusField}
      />

      <CalendarImportDialog
        isOpen={isCalendarDialogOpen}
        onClose={() => setIsCalendarDialogOpen(false)}
        defaultYear={year}
        defaultMonth={month}
      />

      <CategoryManagerDialog
        isOpen={isCategoryDialogOpen}
        onClose={() => setIsCategoryDialogOpen(false)}
        initialCategories={categories}
      />

    </div>
  );
}
