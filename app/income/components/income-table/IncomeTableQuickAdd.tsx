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
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Plus, Keyboard, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { IncomeEntry, DisplayStatus, VatType, CATEGORIES } from "../../types";
import { CategoryChip } from "../CategoryChip";

interface IncomeTableQuickAddProps {
  onAddEntry: (entry: Omit<IncomeEntry, "id" | "invoiceStatus" | "paymentStatus" | "vatRate" | "includesVat"> & { status?: DisplayStatus, vatType?: VatType, invoiceStatus?: "draft" | "sent" | "paid" | "cancelled", paymentStatus?: "unpaid" | "partial" | "paid", vatRate?: number, includesVat?: boolean }) => void;
  clients: string[];
}

export function IncomeTableQuickAdd({
  onAddEntry,
  clients,
}: IncomeTableQuickAddProps) {
  const [newEntryDate, setNewEntryDate] = React.useState<Date>();
  const [quickAddDescription, setQuickAddDescription] = React.useState("");
  const [quickAddAmount, setQuickAddAmount] = React.useState("");
  const [quickAddClient, setQuickAddClient] = React.useState("");
  const [quickAddCategory, setQuickAddCategory] = React.useState("");
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
    onAddEntry({
      date: date.toISOString().split("T")[0],
      description: quickAddDescription || "עבודה חדשה",
      amountGross: parseFloat(quickAddAmount) || 0,
      amountPaid: 0,
      clientName: quickAddClient || "לא צוין",
      category: quickAddCategory || undefined,
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
    setQuickAddCategory("");
    setNewEntryDate(undefined);
  };

  const selectClient = (client: string) => {
    setQuickAddClient(client);
    setShowClientSuggestions(false);
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════════
          QUICK ADD ROW - Enhanced with better visual affordance
          - Increased vertical padding (py-3 instead of py-2)
          - More prominent background and borders
          - Friendly, clickable appearance
          ═══════════════════════════════════════════════════════════════════════════ */}
      <TableRow className="group bg-gradient-to-l from-emerald-50/60 via-emerald-50/40 to-white dark:from-emerald-900/20 dark:via-emerald-900/10 dark:to-slate-900 border-b-2 border-dashed border-emerald-300 dark:border-emerald-700/50 hover:bg-emerald-50/80 dark:hover:bg-emerald-900/30 print:hidden transition-colors">
        <TableCell className="py-3 pl-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-9 text-xs justify-end text-right font-normal px-0.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-800/50",
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
      </TableCell>
        <TableCell className="py-3 pr-1">
          {/* Description input - main entry field with placeholder prompting action */}
          <div className="relative w-full">
        <Input
          ref={quickAddDescriptionRef}
          value={quickAddDescription}
          onChange={(e) => setQuickAddDescription(e.target.value)}
              placeholder="✨ הוסף עבודה חדשה..."
              className="h-9 w-full text-sm border-emerald-200 dark:border-emerald-700/50 bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-600 placeholder:text-emerald-400 dark:placeholder:text-emerald-500 rounded-lg transition-shadow"
          onKeyDown={handleQuickAddKeyDown}
        />
            {/* Keyboard hint - positioned absolutely inside input */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 pointer-events-none hidden sm:flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
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
      </TableCell>
        <TableCell className="py-3 pr-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
            ₪
          </span>
          <Input
            value={quickAddAmount}
            onChange={(e) => setQuickAddAmount(e.target.value)}
            onKeyDown={handleQuickAddKeyDown}
            placeholder="0"
              className="h-9 w-full pl-8 text-sm border-emerald-200 dark:border-emerald-700/50 bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-600 text-right placeholder:text-slate-400 rounded-lg transition-shadow"
            dir="rtl"
          />
        </div>
      </TableCell>
        <TableCell className="py-3 pr-3">
        <div className="relative w-full">
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
            placeholder="שם לקוח"
              className="h-9 w-full text-sm border-emerald-200 dark:border-emerald-700/50 bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-600 placeholder:text-slate-400 rounded-lg transition-shadow"
          />
            {/* Client Autocomplete dropdown */}
          {showClientSuggestions && filteredClients.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 overflow-hidden">
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
      </TableCell>
        <TableCell className="py-3 pr-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-9 w-full text-sm border-emerald-200 dark:border-emerald-700/50 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-emerald-300 dark:focus:ring-emerald-600 rounded-lg transition-shadow text-right justify-between font-normal px-3"
              >
                <span className={cn("truncate", !quickAddCategory && "text-muted-foreground")}>
                  {quickAddCategory ? (
                    <CategoryChip legacyCategory={quickAddCategory} size="sm" withIcon={true} />
                  ) : (
                    "קטגוריה"
                  )}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[200px] overflow-y-auto">
              {CATEGORIES.map((category) => (
                <DropdownMenuItem
                  key={category}
                  onClick={() => setQuickAddCategory(category)}
                >
                  <CategoryChip legacyCategory={category} size="sm" withIcon={true} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
        <TableCell className="py-3">
          <Badge className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          בוצע
        </Badge>
      </TableCell>
        <TableCell className="py-3">
          {/* Add button - more prominent and friendly */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddEntry}
          disabled={!quickAddDescription && !quickAddAmount}
            className="h-8 px-3 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 disabled:opacity-40 rounded-lg transition-colors"
        >
            <Plus className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
    </>
  );
}
