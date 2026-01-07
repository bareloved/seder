"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Plus, Keyboard, ChevronDown, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { IncomeEntry, DisplayStatus, VatType } from "../../types";
import type { Category } from "@/db/schema";
import { CategoryChip } from "../CategoryChip";

// ─────────────────────────────────────────────────────────────────────────────
// Quick Add Card Component
// ─────────────────────────────────────────────────────────────────────────────
// A standalone quick-add component styled as a card that matches the row-card
// design language. Used in the desktop list view above the entry rows.
// ─────────────────────────────────────────────────────────────────────────────

interface QuickAddCardProps {
  onAddEntry: (entry: Omit<IncomeEntry, "id" | "invoiceStatus" | "paymentStatus" | "vatRate" | "includesVat"> & { status?: DisplayStatus, vatType?: VatType, invoiceStatus?: "draft" | "sent" | "paid" | "cancelled", paymentStatus?: "unpaid" | "partial" | "paid", vatRate?: number, includesVat?: boolean }) => void;
  clients: string[];
  categories: Category[];
  onEditCategories?: () => void;
}

export function QuickAddCard({
  onAddEntry,
  clients,
  categories,
  onEditCategories,
}: QuickAddCardProps) {
  const [newEntryDate, setNewEntryDate] = React.useState<Date>();
  const [quickAddDescription, setQuickAddDescription] = React.useState("");
  const [quickAddAmount, setQuickAddAmount] = React.useState("");
  const [quickAddClient, setQuickAddClient] = React.useState("");
  const [quickAddCategoryId, setQuickAddCategoryId] = React.useState("");
  const [showClientSuggestions, setShowClientSuggestions] = React.useState(false);

  const quickAddDescriptionRef = React.useRef<HTMLInputElement>(null);

  // Filter clients for autocomplete
  const filteredClients = React.useMemo(() => {
    if (!quickAddClient.trim()) return clients.slice(0, 5);
    return clients
      .filter((c) => c.toLowerCase().includes(quickAddClient.toLowerCase()))
      .slice(0, 5);
  }, [clients, quickAddClient]);

  // Keyboard shortcut for 'N'
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (!isInputFocused && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        quickAddDescriptionRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleQuickAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (quickAddDescription || quickAddAmount)) {
      e.preventDefault();
      handleAddEntry();
    }
  };

  const handleAddEntry = () => {
    if (!quickAddDescription && !quickAddAmount) return;

    const date = newEntryDate || new Date();
    const selectedCategory = categories.find(c => c.id === quickAddCategoryId);
    onAddEntry({
      date: date.toISOString().split("T")[0],
      description: quickAddDescription || "עבודה חדשה",
      amountGross: parseFloat(quickAddAmount) || 0,
      amountPaid: 0,
      clientName: quickAddClient || "לא צוין",
      categoryId: quickAddCategoryId || undefined,
      categoryData: selectedCategory || null,
      status: "בוצע",
      vatType: "חייב מע״מ",
      invoiceStatus: "draft",
      paymentStatus: "unpaid",
      vatRate: 18,
      includesVat: true
    });

    // Clear form
    setQuickAddDescription("");
    setQuickAddAmount("");
    setQuickAddClient("");
    setQuickAddCategoryId("");
    setNewEntryDate(undefined);
  };

  const selectClient = (client: string) => {
    setQuickAddClient(client);
    setShowClientSuggestions(false);
  };

  return (
    <div className="group rounded-xl border-2 border-dashed border-emerald-300 dark:border-emerald-700/50 bg-gradient-to-l from-emerald-50/60 via-emerald-50/40 to-white dark:from-emerald-900/20 dark:via-emerald-900/10 dark:to-slate-900 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/30 transition-colors print:hidden">
      <div className="hidden md:flex md:items-center md:min-h-[52px]">
        {/* DATE */}
        <div className="shrink-0 w-[70px] px-2 py-2.5 border-l border-emerald-100/70 flex items-center justify-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-8 w-full text-xs justify-start text-right font-normal px-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800/50",
                  !newEntryDate && "text-slate-400"
                )}
              >
                <CalendarIcon className="ml-1 h-3.5 w-3.5 opacity-60" />
                {newEntryDate
                  ? format(newEntryDate, "dd.MM", { locale: he })
                  : "היום"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={newEntryDate}
                onSelect={setNewEntryDate}
                initialFocus
                locale={he}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* DESCRIPTION */}
        <div className="flex-1 min-w-0 max-w-[420px] px-3 py-2.5 border-l border-emerald-100/70 flex items-center">
          <div className="w-full relative">
            <Input
              ref={quickAddDescriptionRef}
              value={quickAddDescription}
              onChange={(e) => setQuickAddDescription(e.target.value)}
              placeholder="✨ הוסף עבודה חדשה..."
              className="h-8 w-full text-sm border-emerald-200 dark:border-emerald-700/50 bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-600 placeholder:text-emerald-400 dark:placeholder:text-emerald-500 rounded-lg transition-shadow"
              onKeyDown={handleQuickAddKeyDown}
            />
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 pointer-events-none hidden lg:flex opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <Keyboard className="h-3 w-3" />
              <span>
                <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[9px] font-mono">Tab</span>
                {" "}הבא
                <span className="mx-1">•</span>
                <span className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[9px] font-mono">Enter</span>
                {" "}שמור
              </span>
            </div>
          </div>
        </div>

        {/* CLIENT */}
        <div className="shrink-0 w-[110px] px-3 py-2.5 border-l border-emerald-100/70 flex items-center">
          <div className="w-full relative">
            <Input
              value={quickAddClient}
              onChange={(e) => {
                setQuickAddClient(e.target.value);
                setShowClientSuggestions(true);
              }}
              onFocus={() => setShowClientSuggestions(true)}
              onBlur={() =>
                setTimeout(() => setShowClientSuggestions(false), 200)
              }
              onKeyDown={handleQuickAddKeyDown}
              placeholder="לקוח"
              className="h-8 w-full text-sm border-emerald-200 dark:border-emerald-700/50 bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-600 placeholder:text-emerald-400 rounded-lg transition-shadow"
            />
            {showClientSuggestions && filteredClients.length > 0 && (
              <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 overflow-hidden">
                {filteredClients.map((client) => (
                  <button
                    key={client}
                    className="w-full px-3 py-2 text-right text-xs hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                    onClick={() => selectClient(client)}
                  >
                    {client}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CATEGORY */}
        <div className="shrink-0 w-[100px] px-2 py-2.5 border-l border-emerald-100/70 flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-8 w-full text-xs border-emerald-200 dark:border-emerald-700/50 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-600 rounded-lg transition-shadow text-right justify-between font-normal px-2"
              >
                {quickAddCategoryId ? (
                  <CategoryChip
                    category={categories.find(c => c.id === quickAddCategoryId) || null}
                    size="sm"
                  />
                ) : (
                  <span className="text-muted-foreground truncate">קטגוריה</span>
                )}
                <ChevronDown className="h-3 w-3 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {categories.filter(c => !c.isArchived).map((cat) => (
                <DropdownMenuItem
                  key={cat.id}
                  onClick={() => setQuickAddCategoryId(cat.id)}
                  className="justify-end"
                >
                  <CategoryChip category={cat} size="sm" />
                </DropdownMenuItem>
              ))}
              {onEditCategories && (
                <>
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                  <DropdownMenuItem
                    onClick={onEditCategories}
                    className="justify-end text-xs text-slate-500 gap-1"
                  >
                    <Settings2 className="h-3 w-3" />
                    ערוך קטגוריות
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* AMOUNT */}
        <div className="shrink-0 w-[105px] px-3 py-2.5 border-l border-emerald-100/70 flex items-center justify-end">
          <div className="relative w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
              ₪
            </span>
            <Input
              value={quickAddAmount}
              onChange={(e) => setQuickAddAmount(e.target.value)}
              onKeyDown={handleQuickAddKeyDown}
              placeholder="0"
              className="h-8 w-full pl-8 text-sm border-emerald-200 dark:border-emerald-700/50 bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-600 text-right placeholder:text-slate-400 rounded-lg transition-shadow"
              dir="rtl"
            />
          </div>
        </div>

        {/* STATUS BADGE */}
        <div className="shrink-0 w-[100px] px-2 py-2.5 border-l border-emerald-100/70 flex items-center justify-center">
          <Badge className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
            בוצע
          </Badge>
        </div>

        {/* ADD BUTTON */}
        <div className="shrink-0 w-[110px] px-1.5 py-2.5 flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddEntry}
            disabled={!quickAddDescription && !quickAddAmount}
            className="h-8 px-3 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 disabled:opacity-40 rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline mr-1">הוסף</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

