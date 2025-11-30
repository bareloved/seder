"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { IncomeEntry, DisplayStatus, VatType } from "../../types";

interface IncomeTableQuickAddProps {
  onAddEntry: (entry: Omit<IncomeEntry, "id" | "invoiceStatus" | "paymentStatus" | "vatRate" | "includesVat"> & { status?: DisplayStatus, vatType?: VatType }) => void;
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
      status: "בוצע",
      vatType: "חייב מע״מ",
    });

    // Clear form
    setQuickAddDescription("");
    setQuickAddAmount("");
    setQuickAddClient("");
    setNewEntryDate(undefined);
  };

  const selectClient = (client: string) => {
    setQuickAddClient(client);
    setShowClientSuggestions(false);
  };

  return (
    <TableRow className="bg-emerald-50/40 dark:bg-emerald-900/10 border-b-2 border-dashed border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 print:hidden">
      <TableCell className="py-2">
        <div className="flex items-center justify-end gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-8 text-xs justify-end text-right font-normal px-2",
                  !newEntryDate && "text-slate-400"
                )}
              >
                <CalendarIcon className="ml-1 h-3 w-3 opacity-50" />
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
              />
            </PopoverContent>
          </Popover>
          <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center flex-shrink-0">
            <Plus className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          </span>
        </div>
      </TableCell>
      <TableCell className="py-2 pr-3">
        <Input
          ref={quickAddDescriptionRef}
          value={quickAddDescription}
          onChange={(e) => setQuickAddDescription(e.target.value)}
          placeholder="הוסף עבודה חדשה"
          className="h-8 w-full text-xs border-dashed border-slate-200 bg-white/60 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 placeholder:text-slate-400"
          onKeyDown={handleQuickAddKeyDown}
        />
      </TableCell>
      <TableCell className="py-2 pr-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
            ₪
          </span>
          <Input
            value={quickAddAmount}
            onChange={(e) => setQuickAddAmount(e.target.value)}
            onKeyDown={handleQuickAddKeyDown}
            placeholder="0"
            className="h-8 w-full pl-8 text-xs border-dashed border-slate-200 bg-white/60 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 text-right placeholder:text-slate-400"
            dir="rtl"
          />
        </div>
      </TableCell>
      <TableCell className="py-2 pr-3">
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
            className="h-8 w-full text-xs border-dashed border-slate-200 bg-white/60 dark:bg-slate-800/60 focus:bg-white dark:focus:bg-slate-800 placeholder:text-slate-400"
          />
          {/* Client Autocomplete */}
          {showClientSuggestions && filteredClients.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1">
              {filteredClients.map((client) => (
                <button
                  key={client}
                  className="w-full px-3 py-1.5 text-right text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => selectClient(client)}
                >
                  {client}
                </button>
              ))}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="py-2">
        <Badge className="text-[10px] px-2 py-0.5 bg-slate-50 text-slate-400 border border-slate-200">
          בוצע
        </Badge>
      </TableCell>
      <TableCell className="py-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddEntry}
          disabled={!quickAddDescription && !quickAddAmount}
          className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
