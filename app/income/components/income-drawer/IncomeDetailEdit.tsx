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
import {
  CalendarDays,
  User,
  Receipt,
  FileText,
  CreditCard,
  Tag,
  Check,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  IncomeEntry,
  DisplayStatus,
  VatType,
} from "../../types";
import type { Category } from "@/db/schema";
import { formatFullDate, getDisplayStatus, getVatTypeFromEntry } from "../../utils";
import { CategoryChip } from "../CategoryChip";
import { ClientDropdown } from "@/app/clients/components/ClientDropdown";
import type { Client } from "@/db/schema";

interface IncomeDetailEditProps {
  entry: IncomeEntry;
  categories: Category[];
  clients: Client[];
  onSave: (entry: IncomeEntry & { status?: DisplayStatus; vatType?: VatType }) => void;
  onClose: () => void;
  onMarkAsPaid: (id: string) => void;
  onMarkInvoiceSent: (id: string) => void;
  initialFocusField?: "description" | "amount" | "clientName";
}

type EditableIncomeEntry = IncomeEntry & {
  status?: DisplayStatus;
  vatType: VatType;
};

export function IncomeDetailEdit({
  entry,
  categories,
  clients,
  onSave,
  onClose,
  onMarkAsPaid,
  onMarkInvoiceSent,
  initialFocusField,
}: IncomeDetailEditProps) {
  // Initialize state with derived fields
  const [editedEntry, setEditedEntry] = React.useState<EditableIncomeEntry>(() => {
    const status = getDisplayStatus(entry) || undefined;
    const vatType = getVatTypeFromEntry(entry);
    return { ...entry, status, vatType };
  });

  const [isDirty, setIsDirty] = React.useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const descriptionRef = React.useRef<HTMLInputElement>(null);
  const amountRef = React.useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onSave(editedEntry);
    setIsDirty(false);
  };

  const handleChange = (updates: Partial<EditableIncomeEntry>) => {
    setEditedEntry((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const displayStatus = getDisplayStatus(editedEntry);

  // Common input style - clearly editable with visible border
  const inputClassName = "h-10 px-3 text-base font-sans text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus:border-slate-400 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-md transition-all shadow-none text-right placeholder:text-slate-400";
  const labelClassName = "text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5";

  React.useEffect(() => {
    if (entry.id === "new" && initialFocusField) {
      const target =
        initialFocusField === "description"
          ? descriptionRef.current
          : initialFocusField === "amount"
            ? amountRef.current
            : null; // Client dropdown handles its own focus

      target?.focus();
      if (target instanceof HTMLInputElement) {
        target.select();
      }
    }
  }, [entry.id, initialFocusField]);

  return (
    <div className="space-y-4 py-3 font-sans">

      {/* Top Section: Client & Date */}
      <div className="grid grid-cols-2 gap-4">
        {/* Client */}
        <div>
          <label className={labelClassName}>
            <User className="h-3.5 w-3.5" />
            לקוח
          </label>
          <ClientDropdown
            clients={clients}
            selectedClientId={editedEntry.clientId}
            selectedClientName={editedEntry.clientName}
            onSelect={(client, name) => {
              handleChange({
                clientId: client?.id ?? null,
                clientName: name,
              });
            }}
            className={cn(inputClassName, "w-full")}
            allowCreate={true}
          />
        </div>

        {/* Date */}
        <div>
          <label className={labelClassName}>
            <CalendarDays className="h-3.5 w-3.5" />
            תאריך
          </label>
          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  inputClassName,
                  "w-full justify-start text-right font-normal",
                  !editedEntry.date && "text-slate-400"
                )}
              >
                {editedEntry.date ? formatFullDate(editedEntry.date) : <span>בחר תאריך</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={editedEntry.date ? new Date(editedEntry.date) : undefined}
                onSelect={(date) => {
                  if (date) {
                    handleChange({ date: format(date, "yyyy-MM-dd") });
                    setIsCalendarOpen(false);
                  }
                }}
                initialFocus
                locale={he}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Description - Full Width */}
      <div>
        <label className={labelClassName}>
          <FileText className="h-3.5 w-3.5" />
          תיאור עבודה
        </label>
        <Input
          ref={descriptionRef}
          value={editedEntry.description}
          onChange={(e) => handleChange({ description: e.target.value })}
          className={inputClassName}
        />
      </div>

      {/* Amount & Category */}
      <div className="grid grid-cols-2 gap-4">
        {/* Amount with currency symbol */}
        <div>
          <label className={labelClassName}>
            <CreditCard className="h-3.5 w-3.5" />
            סכום
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">₪</span>
            <Input
              ref={amountRef}
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              value={editedEntry.amountGross || ""}
              onChange={(e) => handleChange({ amountGross: parseFloat(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
              placeholder="0"
              className={cn(inputClassName, "pl-8 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none")}
              dir="rtl"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className={labelClassName}>
            <Tag className="h-3.5 w-3.5" />
            קטגוריה
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  inputClassName,
                  "w-full justify-between font-normal"
                )}
              >
                <span className="flex-1 text-right">
                  {editedEntry.categoryData ? (
                    <CategoryChip category={editedEntry.categoryData} size="sm" withIcon={true} />
                  ) : editedEntry.category ? (
                    <CategoryChip legacyCategory={editedEntry.category} size="sm" withIcon={true} />
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">בחר קטגוריה</span>
                  )}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px]" align="start">
              {categories.filter(c => !c.isArchived).map((cat) => (
                <DropdownMenuItem
                  key={cat.id}
                  onClick={() => handleChange({ categoryId: cat.id, categoryData: cat })}
                >
                  <CategoryChip category={cat} size="sm" withIcon={true} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Notes Section */}
      <div>
        <label className={labelClassName}>
          <Receipt className="h-3.5 w-3.5" />
          הערות
        </label>
        <textarea
          value={editedEntry.notes || ""}
          onChange={(e) => handleChange({ notes: e.target.value })}
          className="w-full h-20 text-base font-sans p-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 focus:border-slate-400 rounded-md resize-none focus:outline-none focus:ring-0 transition-all"
        />
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        {/* Save Changes (only if dirty) */}
        {isDirty && (
          <Button
            onClick={handleSave}
            className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
          >
            שמור שינויים
          </Button>
        )}

        {/* Primary Status Actions - Only for existing entries */}
        {entry.id !== "new" && displayStatus === "בוצע" && (
          <Button
            onClick={() => onMarkInvoiceSent(entry.id)}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <FileText className="h-4 w-4 ml-2" />
            שלחתי חשבונית
          </Button>
        )}

        {entry.id !== "new" && displayStatus === "נשלחה" && (
          <Button
            onClick={() => onMarkAsPaid(entry.id)}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Check className="h-4 w-4 ml-2" />
            התקבל תשלום
          </Button>
        )}

        {/* Close Button */}
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-700"
        >
          סגור
        </Button>
      </div>
    </div>
  );
}
