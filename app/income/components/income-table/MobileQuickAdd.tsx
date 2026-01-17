"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Plus, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { IncomeEntry, DisplayStatus, VatType } from "../../types";
import type { Category } from "@/db/schema";
import { CategoryChip } from "../CategoryChip";

interface MobileQuickAddProps {
  onAddEntry: (entry: Omit<IncomeEntry, "id" | "invoiceStatus" | "paymentStatus" | "vatRate" | "includesVat"> & { status?: DisplayStatus, vatType?: VatType, invoiceStatus?: "draft" | "sent" | "paid" | "cancelled", paymentStatus?: "unpaid" | "partial" | "paid", vatRate?: number, includesVat?: boolean }) => void;
  clients: string[];
  categories: Category[];
  defaultDate?: string;
}

export function MobileQuickAdd({
  onAddEntry,
  clients,
  categories,
  defaultDate,
}: MobileQuickAddProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [newEntryDate, setNewEntryDate] = React.useState<Date>();
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [clientName, setClientName] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [showClientSuggestions, setShowClientSuggestions] = React.useState(false);

  // Filter clients for autocomplete
  const filteredClients = React.useMemo(() => {
    if (!clientName.trim()) return clients.slice(0, 5);
    return clients
      .filter((c) => c.toLowerCase().includes(clientName.toLowerCase()))
      .slice(0, 5);
  }, [clients, clientName]);

  React.useEffect(() => {
    if (defaultDate && isExpanded) {
      setNewEntryDate(new Date(defaultDate));
    }
  }, [defaultDate, isExpanded]);

  const handleAddEntry = () => {
    if (!description && !amount) return;

    const date = newEntryDate || new Date();
    const selectedCategory = categories.find(c => c.id === categoryId);
    onAddEntry({
      date: date.toISOString().split("T")[0],
      description: description || "עבודה חדשה",
      amountGross: parseFloat(amount) || 0,
      amountPaid: 0,
      clientName: clientName || "לא צוין",
      categoryId: categoryId || undefined,
      categoryData: selectedCategory || null,
      status: "בוצע",
      vatType: "חייב מע״מ",
      invoiceStatus: "draft",
      paymentStatus: "unpaid",
      vatRate: 18,
      includesVat: true
    });

    // Clear form and collapse
    setDescription("");
    setAmount("");
    setClientName("");
    setCategoryId("");
    setNewEntryDate(undefined);
    setIsExpanded(false);
  };

  const selectClient = (client: string) => {
    setClientName(client);
    setShowClientSuggestions(false);
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20 transition-colors"
      >
        <Plus className="h-4 w-4" />
        <span className="text-sm font-medium">הוסף עבודה חדשה</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-900/10 p-3 space-y-3">
      {/* Collapse button */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          עבודה חדשה
        </span>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-slate-400 hover:text-slate-600 p-1"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>

      {/* Date picker */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 flex-1 justify-start text-right text-sm",
                !newEntryDate && "text-slate-400"
              )}
            >
              <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
              {newEntryDate
                ? format(newEntryDate, "dd.MM.yyyy", { locale: he })
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
      </div>

      {/* Description */}
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="תיאור העבודה"
        className="h-10 text-sm bg-white dark:bg-slate-800"
      />

      {/* Category */}
      <Select value={categoryId} onValueChange={setCategoryId}>
        <SelectTrigger className="h-10 w-full text-sm bg-white dark:bg-slate-800 text-right justify-between" dir="rtl">
          <SelectValue placeholder="בחר קטגוריה">
            {categoryId && (
              <CategoryChip
                category={categories.find(c => c.id === categoryId) || null}
                size="sm"
                withIcon={true}
              />
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end" dir="rtl">
          {categories.filter(c => !c.isArchived).map((cat) => (
            <SelectItem key={cat.id} value={cat.id} className="justify-end">
              <CategoryChip category={cat} size="sm" withIcon={true} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Amount + Client in a row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
            ₪
          </span>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="סכום"
            type="number"
            className="h-10 pl-8 text-sm bg-white dark:bg-slate-800 text-right"
            dir="rtl"
          />
        </div>
        <div className="relative flex-1">
          <Input
            value={clientName}
            onChange={(e) => {
              setClientName(e.target.value);
              setShowClientSuggestions(true);
            }}
            onFocus={() => setShowClientSuggestions(true)}
            onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
            placeholder="שם לקוח"
            className="h-10 text-sm bg-white dark:bg-slate-800"
          />
          {/* Client Autocomplete */}
          {showClientSuggestions && filteredClients.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 py-1">
              {filteredClients.map((client) => (
                <button
                  key={client}
                  className="w-full px-3 py-2 text-right text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                  onClick={() => selectClient(client)}
                >
                  {client}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add button */}
      <Button
        onClick={handleAddEntry}
        disabled={!description && !amount}
        className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50"
      >
        <Plus className="h-4 w-4 ml-2" />
        הוסף עבודה
      </Button>
    </div>
  );
}

