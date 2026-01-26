"use client";

import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/Navbar";
import { KPICards } from "@/app/income/components/KPICards";
import { IncomeFilters } from "@/app/income/components/IncomeFilters";
import type { IncomeEntry, KPIData, FilterType } from "@/app/income/types";
import type { SortColumn } from "@/app/income/components/income-table/IncomeTableHeader";
import type { ViewMode } from "@/app/income/components/ViewModeToggle";
import type { Category } from "@/db/schema";
import { Check, Send, FileText } from "lucide-react";
import { CategoryChip } from "@/app/income/components/CategoryChip";

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const mockCategories: Category[] = [
  { id: "cat-1", name: "הופעות", color: "emerald", icon: "music", displayOrder: "0", userId: "mock", createdAt: new Date(), updatedAt: new Date(), isArchived: false },
  { id: "cat-2", name: "שיעורים", color: "blue", icon: "book", displayOrder: "1", userId: "mock", createdAt: new Date(), updatedAt: new Date(), isArchived: false },
  { id: "cat-3", name: "הקלטות", color: "purple", icon: "mic", displayOrder: "2", userId: "mock", createdAt: new Date(), updatedAt: new Date(), isArchived: false },
  { id: "cat-4", name: "הפקה", color: "orange", icon: "settings", displayOrder: "3", userId: "mock", createdAt: new Date(), updatedAt: new Date(), isArchived: false },
];

// Helper to get date strings relative to today
function getRelativeDate(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().split("T")[0];
}

const mockEntries: IncomeEntry[] = [
  { id: "1", date: getRelativeDate(-5), description: "הופעה בבית הופעות", clientName: "הזמר", amountGross: 5000, amountPaid: 5000, vatRate: 17, includesVat: false, invoiceStatus: "paid", paymentStatus: "paid", category: "הופעות", categoryId: "cat-1", categoryData: mockCategories[0], createdAt: new Date(), updatedAt: new Date() },
  { id: "2", date: getRelativeDate(-3), description: "שיעור פרטי", clientName: "דני כהן", amountGross: 350, amountPaid: 0, vatRate: 17, includesVat: false, invoiceStatus: "sent", paymentStatus: "unpaid", category: "שיעורים", categoryId: "cat-2", categoryData: mockCategories[1], createdAt: new Date(), updatedAt: new Date() },
  { id: "3", date: getRelativeDate(-1), description: "הקלטות באולפן", clientName: "אולפני סאונד", amountGross: 2800, amountPaid: 2800, vatRate: 17, includesVat: false, invoiceStatus: "paid", paymentStatus: "paid", category: "הקלטות", categoryId: "cat-3", categoryData: mockCategories[2], createdAt: new Date(), updatedAt: new Date() },
  { id: "4", date: getRelativeDate(0), description: "שיעור פרטי", clientName: "יעל ישראלי", amountGross: 350, amountPaid: 0, vatRate: 17, includesVat: false, invoiceStatus: "sent", paymentStatus: "unpaid", category: "שיעורים", categoryId: "cat-2", categoryData: mockCategories[1], createdAt: new Date(), updatedAt: new Date() },
  { id: "5", date: getRelativeDate(0), description: "עיבוד מוזיקלי", clientName: "להקת רוק", amountGross: 1500, amountPaid: 0, vatRate: 17, includesVat: false, invoiceStatus: "draft", paymentStatus: "unpaid", category: "הפקה", categoryId: "cat-4", categoryData: mockCategories[3], createdAt: new Date(), updatedAt: new Date() },
  { id: "6", date: getRelativeDate(2), description: "הופעה בחתונה", clientName: "משפחת לוי", amountGross: 4500, amountPaid: 0, vatRate: 17, includesVat: false, invoiceStatus: "draft", paymentStatus: "unpaid", category: "הופעות", categoryId: "cat-1", categoryData: mockCategories[0], createdAt: new Date(), updatedAt: new Date() },
  { id: "7", date: getRelativeDate(4), description: "הופעה בפסטיבל", clientName: "עיריית תל אביב", amountGross: 8000, amountPaid: 0, vatRate: 17, includesVat: false, invoiceStatus: "draft", paymentStatus: "unpaid", category: "הופעות", categoryId: "cat-1", categoryData: mockCategories[0], createdAt: new Date(), updatedAt: new Date() },
  { id: "8", date: getRelativeDate(7), description: "שיעור קבוצתי", clientName: "מתנ״ס רמת גן", amountGross: 600, amountPaid: 0, vatRate: 17, includesVat: false, invoiceStatus: "sent", paymentStatus: "unpaid", category: "שיעורים", categoryId: "cat-2", categoryData: mockCategories[1], createdAt: new Date(), updatedAt: new Date() },
];

const mockKPIs: KPIData = {
  thisMonth: 23100,
  thisMonthCount: 8,
  readyToInvoice: 12500,
  readyToInvoiceCount: 2,
  outstanding: 1300,
  totalPaid: 9300,
  trend: 15,
  overdueCount: 0,
  invoicedCount: 3,
};

const mockClients = ["הזמר", "דני כהן", "משפחת לוי", "אולפני סאונד", "יעל ישראלי", "עיריית תל אביב", "להקת רוק", "מתנ״ס רמת גן"];

const mockUser = { name: "משתמש לדוגמה", email: "test@example.com", image: null };

// ─────────────────────────────────────────────────────────────────────────────
// Subtle Cards Style with Enhanced Design
// ─────────────────────────────────────────────────────────────────────────────

const subtleCardsStyle = `
  /* Base row styling */
  .subtle-cards .income-row {
    background-color: white;
    border-radius: 0.5rem;
    border: 1px solid rgb(241 245 249);
    transition: all 0.2s ease;
    border-left: 2px solid transparent;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
  }
  .dark .subtle-cards .income-row {
    background-color: hsl(var(--card));
    border-color: hsl(var(--border));
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  /* Hover glow effect */
  .subtle-cards .income-row:hover {
    box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.08);
    border-top-color: rgb(226 232 240);
    border-right-color: rgb(226 232 240);
    border-bottom-color: rgb(226 232 240);
  }
  .dark .subtle-cards .income-row:hover {
    box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.3);
    border-top-color: hsl(var(--border));
    border-right-color: hsl(var(--border));
    border-bottom-color: hsl(var(--border));
  }

  /* Time-based left border (subtle) */
  .subtle-cards .income-row[data-timing="past"] {
    border-left-color: #cbd5e1;
  }
  .subtle-cards .income-row[data-timing="today"] {
    border-left-color: transparent;
  }
  .subtle-cards .income-row[data-timing="future"] {
    border-left-color: rgba(147, 197, 253, 0.5);
  }
  .dark .subtle-cards .income-row[data-timing="past"] {
    border-left-color: #64748b;
  }
  .dark .subtle-cards .income-row[data-timing="future"] {
    border-left-color: rgba(96, 165, 250, 0.6);
  }

  /* Green paid amounts */
  .subtle-cards .income-row[data-status="paid"] .amount-value {
    color: #059669;
  }
  .dark .subtle-cards .income-row[data-status="paid"] .amount-value {
    color: #34d399;
  }

  /* Mini calendar date */
  .subtle-cards .date-cell {
    min-width: 2.5rem;
  }
  .subtle-cards .date-day {
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.2;
    color: #1e293b;
  }
  .dark .subtle-cards .date-day {
    color: #e2e8f0;
  }
  .subtle-cards .date-weekday {
    font-size: 0.6rem;
    color: #94a3b8;
    font-weight: 500;
  }
  .dark .subtle-cards .date-weekday {
    color: #64748b;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

const hebrewWeekdays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function formatDateParts(dateStr: string) {
  const date = new Date(dateStr);
  const day = date.getDate();
  const weekday = hebrewWeekdays[date.getDay()];
  return { day, weekday };
}

function formatNumber(amount: number): string {
  return new Intl.NumberFormat("he-IL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusFromEntry(entry: IncomeEntry): "paid" | "sent" | "draft" {
  if (entry.paymentStatus === "paid") return "paid";
  if (entry.invoiceStatus === "sent") return "sent";
  return "draft";
}

function getStatusIcon(status: "paid" | "sent" | "draft") {
  switch (status) {
    case "paid":
      return <Check className="w-3.5 h-3.5 text-emerald-500" />;
    case "sent":
      return <Send className="w-3.5 h-3.5 text-orange-500" />;
    case "draft":
      return <FileText className="w-3.5 h-3.5 text-sky-500" />;
  }
}

function getStatusLabel(status: "paid" | "sent" | "draft") {
  switch (status) {
    case "paid":
      return "שולם";
    case "sent":
      return "נשלח";
    case "draft":
      return "טיוטה";
  }
}

function getTimingFromDate(dateStr: string): "past" | "today" | "future" {
  const date = new Date(dateStr);
  const today = new Date();

  // Reset time to compare dates only
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) return "today";
  if (date < today) return "past";
  return "future";
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom Income Row Component
// ─────────────────────────────────────────────────────────────────────────────

interface IncomeRowProps {
  entry: IncomeEntry;
}

function IncomeRow({ entry }: IncomeRowProps) {
  const status = getStatusFromEntry(entry);
  const timing = getTimingFromDate(entry.date);
  const { day, weekday } = formatDateParts(entry.date);

  return (
    <div
      className="income-row relative flex items-center gap-3 px-4 py-2 cursor-pointer"
      data-status={status}
      data-timing={timing}
    >
      {/* Date Cell - Mini Calendar Style */}
      <div className="date-cell flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700/50 rounded px-1.5 py-1">
        <span className="date-day">{day}</span>
        <span className="date-weekday">{weekday}</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 max-w-[40%]">
        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate block">
          {entry.description}
        </span>
        <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {entry.clientName}
        </div>
      </div>

      {/* Amount - Centered */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <div className={cn(
          "amount-value text-base font-semibold font-numbers tracking-tight",
          status !== "paid" && "text-slate-700 dark:text-slate-200"
        )} dir="ltr">
          <span className="text-xs">₪</span> {formatNumber(entry.amountGross)}
        </div>
      </div>

      {/* Category Badge - Centered between amount and status */}
      <div className="absolute left-1/4 -translate-x-1/2">
        <CategoryChip category={entry.categoryData} size="sm" />
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-1.5 shrink-0 ms-auto">
        {getStatusIcon(status)}
        <span className={cn(
          "text-sm",
          status === "paid" && "text-emerald-600 dark:text-emerald-400",
          status === "sent" && "text-orange-600 dark:text-orange-400",
          status === "draft" && "text-sky-600 dark:text-sky-400"
        )}>
          {getStatusLabel(status)}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Income Row Component
// ─────────────────────────────────────────────────────────────────────────────

function MobileIncomeRow({ entry }: IncomeRowProps) {
  const status = getStatusFromEntry(entry);
  const timing = getTimingFromDate(entry.date);
  const { day, weekday } = formatDateParts(entry.date);

  return (
    <div
      className="income-row flex items-start gap-3 px-3 py-2 cursor-pointer"
      data-status={status}
      data-timing={timing}
    >
      {/* Date Cell - Mini Calendar Style */}
      <div className="date-cell flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700/50 rounded px-1.5 py-1 shrink-0">
        <span className="date-day">{day}</span>
        <span className="date-weekday">{weekday}</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-100 truncate text-sm">
            {entry.description}
          </span>
          <div className={cn(
            "amount-value font-semibold font-numbers tracking-tight shrink-0",
            status !== "paid" && "text-slate-700 dark:text-slate-200"
          )} dir="ltr">
            <span className="text-xs">₪</span> {formatNumber(entry.amountGross)}
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {entry.clientName}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <CategoryChip category={entry.categoryData} size="sm" />
          <div className="flex items-center gap-1">
            {getStatusIcon(status)}
            <span className={cn(
              "text-sm",
              status === "paid" && "text-emerald-600 dark:text-emerald-400",
              status === "sent" && "text-orange-600 dark:text-orange-400",
              status === "draft" && "text-sky-600 dark:text-sky-400"
            )}>
              {getStatusLabel(status)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Design Test Client Component
// ─────────────────────────────────────────────────────────────────────────────

export function DesignTestClient() {
  // State matching IncomePageClient
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<SortColumn>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Filter entries based on active filter
  const filteredEntries = React.useMemo(() => {
    let result = [...mockEntries];

    switch (activeFilter) {
      case "ready-to-invoice":
        result = result.filter((e) => e.invoiceStatus === "draft");
        break;
      case "invoiced":
        result = result.filter((e) => e.invoiceStatus === "sent");
        break;
      case "paid":
        result = result.filter((e) => e.paymentStatus === "paid");
        break;
    }

    if (selectedClient !== "all") {
      result = result.filter((e) => e.clientName === selectedClient);
    }

    if (selectedCategories.length > 0) {
      result = result.filter((e) => e.categoryId && selectedCategories.includes(e.categoryId));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(query) ||
          e.clientName.toLowerCase().includes(query)
      );
    }

    return result.sort((a, b) => {
      const multiplier = sortDirection === "desc" ? -1 : 1;
      if (sortColumn === "date") {
        return multiplier * (new Date(a.date).getTime() - new Date(b.date).getTime());
      }
      if (sortColumn === "amount") {
        return multiplier * (a.amountGross - b.amountGross);
      }
      return 0;
    });
  }, [activeFilter, selectedClient, selectedCategories, searchQuery, sortColumn, sortDirection]);

  const monthClients = React.useMemo(() => {
    return [...new Set(mockEntries.map((e) => e.clientName))];
  }, []);

  const hasActiveFilter = activeFilter !== "all" || searchQuery !== "" || selectedClient !== "all" || selectedCategories.length > 0;

  // Dummy handlers for components
  const noop = () => {};
  const noopAsync = async () => {};

  return (
    <>
      {/* Inject subtle cards style */}
      <style dangerouslySetInnerHTML={{ __html: subtleCardsStyle }} />

      <div className="min-h-screen bg-[#F0F2F5] dark:bg-background pb-24 md:pb-20 font-sans" dir="rtl">
        <Navbar user={mockUser} />

        <main className="max-w-7xl mx-auto px-2 sm:px-12 lg:px-20 py-3 sm:py-8 space-y-3 sm:space-y-6">
          {/* KPI Section */}
          <section>
            <KPICards
              kpis={mockKPIs}
              selectedMonth={1}
              onFilterClick={setActiveFilter}
              activeFilter={activeFilter}
            />
          </section>

          {/* Main Content Card with Subtle Cards styling */}
          <section className="subtle-cards">
            {/* Toolbar / Filters Area */}
            <div className="p-2 mb-3 rounded-xl bg-white dark:bg-card shadow-sm border border-slate-200/40 dark:border-slate-700/40">
              <IncomeFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                clients={monthClients}
                selectedClient={selectedClient}
                onClientChange={setSelectedClient}
                categories={mockCategories}
                selectedCategories={selectedCategories}
                onCategoryChange={setSelectedCategories}
                onNewEntry={noop}
                year={2024}
                month={1}
                onYearChange={noop}
                onMonthChange={noop}
                monthPaymentStatuses={{}}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>

            {/* Content Area - Custom Mock Rows */}
            <div>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  לא נמצאו רשומות
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {filteredEntries.map((entry) => (
                    <React.Fragment key={entry.id}>
                      {/* Desktop Row */}
                      <div className="hidden md:block">
                        <IncomeRow entry={entry} />
                      </div>
                      {/* Mobile Row */}
                      <div className="md:hidden">
                        <MobileIncomeRow entry={entry} />
                      </div>
                    </React.Fragment>
                  ))}
                </div>
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
          <p>© 2024 סדר</p>
        </footer>
      </div>
    </>
  );
}
