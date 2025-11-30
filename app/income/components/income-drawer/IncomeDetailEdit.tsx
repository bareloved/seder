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
import {
  CalendarDays,
  User,
  Receipt,
  FileText,
  CreditCard,
  Tag,
  Check,
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  IncomeEntry,
  DisplayStatus,
  STATUS_CONFIG,
  CATEGORIES,
  VatType,
} from "../../types";
import { formatFullDate, getDisplayStatus } from "../../utils";

interface IncomeDetailEditProps {
  entry: IncomeEntry;
  onSave: (entry: IncomeEntry & { status?: DisplayStatus; vatType?: VatType }) => void;
  onClose: () => void;
  onStatusChange: (id: string, status: DisplayStatus) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkInvoiceSent: (id: string) => void;
}

type EditableIncomeEntry = IncomeEntry & {
  status?: DisplayStatus;
  vatType: VatType;
};

export function IncomeDetailEdit({
  entry,
  onSave,
  onClose,
  onStatusChange,
  onMarkAsPaid,
  onMarkInvoiceSent,
}: IncomeDetailEditProps) {
  // Initialize state with derived fields
  const [editedEntry, setEditedEntry] = React.useState<EditableIncomeEntry>(() => {
    const status = getDisplayStatus(entry) || undefined;
    const vatType = entry.includesVat ? "כולל מע״מ" : entry.vatRate === 0 ? "ללא מע״מ" : "חייב מע״מ";
    return { ...entry, status, vatType };
  });

  const [isDirty, setIsDirty] = React.useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const handleSave = () => {
    onSave(editedEntry);
    setIsDirty(false);
  };

  const handleChange = (updates: Partial<EditableIncomeEntry>) => {
    setEditedEntry((prev) => ({ ...prev, ...updates }));
    setIsDirty(true);
  };

  const displayStatus = getDisplayStatus(editedEntry);

  // Common input style for "editable text" feel
  const inputClassName = "h-auto py-1 px-2 -mx-2 text-base font-semibold text-slate-900 dark:text-slate-100 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:ring-0 focus:border-slate-300 dark:focus:border-slate-600 focus-visible:ring-0 focus-visible:ring-offset-0 rounded transition-all shadow-none text-right";
  const labelClassName = "text-xs font-medium text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5";

  return (
    <div className="space-y-6 py-4">
      
      {/* Top Section: Main Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client */}
        <div>
          <label className={labelClassName}>
            <User className="h-3.5 w-3.5" />
            לקוח
          </label>
          <Input
            value={editedEntry.clientName}
            onChange={(e) => handleChange({ clientName: e.target.value })}
            className={inputClassName}
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
                variant="ghost"
                className={cn(
                  inputClassName,
                  "w-full justify-start text-right",
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
          value={editedEntry.description}
          onChange={(e) => handleChange({ description: e.target.value })}
          className={inputClassName}
        />
      </div>

      {/* Middle Section: Payment & Category */}
      <div className="grid grid-cols-2 gap-6">
        {/* Amount */}
        <div>
          <label className={labelClassName}>
            <CreditCard className="h-3.5 w-3.5" />
            סכום
          </label>
          <Input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*"
            value={editedEntry.amountGross}
            onChange={(e) => handleChange({ amountGross: parseFloat(e.target.value) || 0 })}
            onFocus={(e) => e.target.select()}
            className={cn(inputClassName, "text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none")}
            dir="rtl"
          />
        </div>

        {/* Category */}
        <div>
          <label className={labelClassName}>
            <Tag className="h-3.5 w-3.5" />
            קטגוריה
          </label>
          <Select
            value={editedEntry.category || ""}
            onValueChange={(v) => handleChange({ category: v })}
          >
            <SelectTrigger className={cn(inputClassName, "w-full [&>span]:text-right [&>span]:flex-1")}>
              <SelectValue placeholder="בחר קטגוריה" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          placeholder="הוסף הערות..."
          className="w-full h-20 text-base p-3 border-transparent bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md resize-none focus:outline-none focus:ring-0 transition-colors"
        />
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        
        {/* Primary Status Actions */}
        {displayStatus === "בוצע" && (
          <Button
            onClick={() => onMarkInvoiceSent(entry.id)}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <FileText className="h-4 w-4 ml-2" />
            שלחתי חשבונית
          </Button>
        )}

        {displayStatus === "נשלחה" && (
          <Button
            onClick={() => onMarkAsPaid(entry.id)}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <Check className="h-4 w-4 ml-2" />
            התקבל תשלום
          </Button>
        )}

        {/* Save Changes (only if dirty) */}
        {isDirty && (
          <Button
            onClick={handleSave}
            className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
          >
            שמור שינויים
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
