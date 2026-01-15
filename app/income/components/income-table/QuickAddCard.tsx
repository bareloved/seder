"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Calendar as CalendarIcon, Plus, ChevronDown, Check } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { IncomeEntry, DisplayStatus, VatType } from "../../types";
import type { Category } from "@/db/schema";
import { CategoryChip } from "../CategoryChip";

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

  const filteredClients = React.useMemo(() => {
    if (!quickAddClient.trim()) return clients.slice(0, 5);
    return clients
      .filter((c) => c.toLowerCase().includes(quickAddClient.toLowerCase()))
      .slice(0, 5);
  }, [clients, quickAddClient]);

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
    <div className="group border-b border-transparent hover:border-slate-100 transition-colors py-1">
      <div className="hidden md:flex md:items-center min-h-[46px]">
        {/* DATE */}
        <div className="shrink-0 w-[70px] px-2">
          <div className="text-right">
            <span className="text-base text-slate-400">
              {newEntryDate
                ? format(newEntryDate, "dd.MM", { locale: he })
                : format(new Date(), "dd.MM", { locale: he })}
            </span>
          </div>
        </div>

        {/* CLIENT */}
        <div className="shrink-0 w-[110px] px-3">
          <div className="relative">
            <Button
              variant="ghost"
              className="h-8 w-full justify-between text-slate-400 font-normal px-2 hover:bg-slate-50 text-base"
              onClick={() => setShowClientSuggestions(true)}
            >
              {quickAddClient || "לקוח"}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
            {showClientSuggestions && (
              <div className="absolute z-20 top-full right-0 mt-1 w-40 bg-white shadow-lg rounded-md border border-slate-100 p-1">
                <Input
                  value={quickAddClient}
                  onChange={(e) => setQuickAddClient(e.target.value)}
                  className="h-8 text-base mb-1"
                  placeholder="חפש לקוח..."
                  autoFocus
                  onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                />
                {filteredClients.map((client) => (
                  <div
                    key={client}
                    className="px-2 py-1.5 text-xs hover:bg-slate-50 cursor-pointer rounded-sm"
                    onClick={() => selectClient(client)}
                  >
                    {client}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>


        {/* DESCRIPTION - Flexible */}
        <div className="flex-1 min-w-0 max-w-[420px] px-3">
          <Input
            ref={quickAddDescriptionRef}
            value={quickAddDescription}
            onChange={(e) => setQuickAddDescription(e.target.value)}
            placeholder="הוסף עבודה חדשה..."
            className="h-9 w-full border-transparent bg-transparent placeholder:text-slate-300 focus:bg-white focus:shadow-sm focus:border-slate-200 transition-all text-right text-base"
            onKeyDown={handleQuickAddKeyDown}
          />
        </div>

        {/* CATEGORY (Hidden in ghost row usually, or simplified) */}
        <div className="shrink-0 w-[100px] px-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-full justify-start text-base text-slate-400 font-normal px-1">
                {quickAddCategoryId
                  ? categories.find(c => c.id === quickAddCategoryId)?.name
                  : "קטגוריה"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {categories.filter(c => !c.isArchived).map(cat => (
                <DropdownMenuItem key={cat.id} onClick={() => setQuickAddCategoryId(cat.id)}>
                  <CategoryChip category={cat} size="sm" />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>


        {/* AMOUNT (Hidden in ghost row usually, or simplified) */}
        <div className="shrink-0 w-[105px] px-3 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">₪</span>
            <Input
              value={quickAddAmount}
              onChange={(e) => setQuickAddAmount(e.target.value)}
              placeholder="0"
              className="h-8 w-full border-transparent bg-transparent focus:bg-white focus:border-slate-200 text-right pl-6 text-base"
              onKeyDown={handleQuickAddKeyDown}
            />
          </div>
        </div>

        {/* ADD ACTION */}
        <div className="shrink-0 w-[60px] flex justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:bg-emerald-50" onClick={handleAddEntry}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>

      </div>
    </div>
  );
}
