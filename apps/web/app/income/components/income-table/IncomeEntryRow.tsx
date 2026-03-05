"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Check,
  FileText,
  Pencil,
  Trash2,
  Settings2,
  MoreVertical,
  MoreHorizontal,
  CheckSquare,
  Send,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { IncomeEntry, DisplayStatus, MoneyStatus } from "../../types";
import type { Category, Client } from "@/db/schema";
import { isOverdue } from "../../utils";
import { CategoryChip } from "../CategoryChip";
import { ClientDropdown } from "@/app/clients/components/ClientDropdown";

type EditableField = "date" | "description" | "amountGross" | "clientName" | "category" | null;

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

function getTimingFromDate(dateStr: string): "past" | "today" | "future" {
  const date = new Date(dateStr);
  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  if (date.getTime() === today.getTime()) return "today";
  if (date < today) return "past";
  return "future";
}

function getStatusFromEntry(entry: IncomeEntry): "paid" | "sent" | "draft" {
  if (entry.paymentStatus === "paid") return "paid";
  if (entry.invoiceStatus === "sent") return "sent";
  return "draft";
}

function getStatusIcon(status: "paid" | "sent" | "draft") {
  switch (status) {
    case "paid":
      return <Check className="w-3.5 h-3.5" />;
    case "sent":
      return <Send className="w-3.5 h-3.5" />;
    case "draft":
      return <FileText className="w-3.5 h-3.5" />;
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

function getStatusColor(status: "paid" | "sent" | "draft") {
  switch (status) {
    case "paid":
      return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30";
    case "sent":
      return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30";
    case "draft":
      return "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Component Props
// ─────────────────────────────────────────────────────────────────────────────

export interface IncomeEntryRowProps {
  entry: IncomeEntry;
  onClick: (entry: IncomeEntry) => void;
  onStatusChange: (id: string, status: DisplayStatus) => void;
  onMoneyStatusChange?: (id: string, status: MoneyStatus) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkInvoiceSent: (id: string) => void;
  onDuplicate: (entry: IncomeEntry) => void;
  onDelete: (id: string) => void;
  onInlineEdit?: (id: string, field: string, value: string | number) => void;
  clients?: string[];
  clientRecords?: Client[];
  categories?: Category[];
  onEditCategories?: () => void;
  // Selection props
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  onToggleSelectionMode?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export const IncomeEntryRow = React.memo(function IncomeEntryRow({
  entry,
  onClick,
  onStatusChange,
  onMoneyStatusChange,
  onMarkAsPaid,
  onMarkInvoiceSent,
  onDuplicate,
  onDelete,
  onInlineEdit,
  clients = [],
  clientRecords = [],
  categories = [],
  onEditCategories,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
  onToggleSelectionMode,
}: IncomeEntryRowProps) {
  const status = getStatusFromEntry(entry);
  const timing = getTimingFromDate(entry.date);
  const { day, weekday } = formatDateParts(entry.date);
  const overdue = isOverdue(entry);
  const isPaid = status === "paid";
  const isDraft = status === "draft";
  const isWaiting = status === "sent";

  const [editingField, setEditingField] = React.useState<EditableField>(null);
  const [editValue, setEditValue] = React.useState<string>("");
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = React.useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editingField && inputRef.current && editingField !== "category" && editingField !== "date") {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const startEditing = (field: EditableField, currentValue: string) => {
    if (!onInlineEdit) return;
    setEditingField(field);
    setEditValue(currentValue);
    if (field === "category") {
      setIsCategoryDropdownOpen(true);
    }
  };

  const saveCurrentValue = (): boolean => {
    if (!editingField || !onInlineEdit) return false;

    let valueToSave: string | number = editValue;

    if (editingField === "amountGross") {
      const numValue = parseFloat(editValue.replace(/[^\d.-]/g, ""));
      if (isNaN(numValue)) return false;
      valueToSave = numValue;
    }

    const currentValue = editingField === "amountGross"
      ? entry.amountGross
      : entry[editingField];

    if (valueToSave !== currentValue) {
      onInlineEdit(entry.id, editingField, valueToSave);
    }
    return true;
  };

  const saveEdit = () => {
    if (saveCurrentValue()) {
      setEditingField(null);
      setEditValue("");
    } else {
      cancelEdit();
    }
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
    setIsCategoryDropdownOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  const handleStatusChange = (newStatus: "paid" | "sent" | "draft") => {
    if (newStatus === "paid") {
      onMarkAsPaid(entry.id);
    } else if (newStatus === "sent") {
      onMarkInvoiceSent(entry.id);
    } else {
      onStatusChange(entry.id, "בוצע");
    }
    setIsStatusDropdownOpen(false);
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT (md+)
          Card-based design with timing border, centered amount
          ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={cn(
          "income-row hidden md:flex items-center relative",
          "bg-white dark:bg-card rounded-lg",
          "border border-slate-100 dark:border-border",
          "border-l-2 shadow-sm hover:shadow-md transition-all",
          "px-4 py-2 min-h-[52px] cursor-pointer gap-3",
          isSelected && "bg-slate-50 dark:bg-muted/40 ring-1 ring-slate-300 dark:ring-slate-600"
        )}
        data-status={status}
        data-timing={timing}
        onClick={() => onClick(entry)}
      >
        {/* Selection Checkbox */}
        {isSelectionMode && onToggleSelection && (
          <div
            className="shrink-0 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(entry.id)}
              className="h-5 w-5 border-2 border-slate-300 data-[state=checked]:bg-slate-800 data-[state=checked]:border-slate-800"
            />
          </div>
        )}

        {/* Date Cell - Mini Calendar Style */}
        <div
          className="date-cell shrink-0 w-[44px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700/50 rounded px-1.5 py-1"
          onClick={(e) => {
            if (onInlineEdit) {
              e.stopPropagation();
              setIsDatePickerOpen(true);
            }
          }}
        >
          {onInlineEdit ? (
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <button className="flex flex-col items-center hover:opacity-70 transition-opacity">
                  <span className="date-day text-lg font-semibold text-slate-800 dark:text-slate-100 leading-tight">{day}</span>
                  <span className="date-weekday text-[10px] text-slate-400 dark:text-slate-500 font-medium">{weekday}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={new Date(entry.date)}
                  onSelect={(date) => {
                    if (date && onInlineEdit) {
                      const dateStr = format(date, "yyyy-MM-dd");
                      onInlineEdit(entry.id, "date", dateStr);
                    }
                    setIsDatePickerOpen(false);
                  }}
                  initialFocus
                  locale={he}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <>
              <span className="date-day text-lg font-semibold text-slate-800 dark:text-slate-100 leading-tight">{day}</span>
              <span className="date-weekday text-[10px] text-slate-400 dark:text-slate-500 font-medium">{weekday}</span>
            </>
          )}
        </div>

        {/* Description + Client - Limited width to leave room for centered amount */}
        <div
          className="flex-1 min-w-0 max-w-[40%]"
          onClick={(e) => {
            if (onInlineEdit && editingField !== "description") {
              e.stopPropagation();
              startEditing("description", entry.description);
            }
          }}
        >
          {editingField === "description" ? (
            <Input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="h-8 text-sm w-full px-2 text-right border-slate-200 focus:border-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          ) : (
            <>
              <span className={cn(
                "font-semibold text-slate-800 dark:text-slate-100 truncate block text-base",
                onInlineEdit && "hover:text-slate-600 dark:hover:text-slate-300"
              )}>
                {entry.description}
              </span>
              <div
                className="text-sm text-slate-500 dark:text-slate-400 truncate"
                onClick={(e) => {
                  if (onInlineEdit && clientRecords.length > 0) {
                    e.stopPropagation();
                  }
                }}
              >
                {onInlineEdit && clientRecords.length > 0 ? (
                  <ClientDropdown
                    clients={clientRecords}
                    selectedClientId={entry.clientId}
                    selectedClientName={entry.clientName}
                    onSelect={(client, name) => {
                      onInlineEdit(entry.id, "clientId", client?.id ?? "");
                      onInlineEdit(entry.id, "clientName", name);
                    }}
                    className="h-6 text-sm w-full border-0 bg-transparent hover:bg-slate-100 dark:hover:bg-muted/50 -mx-1 px-1"
                    compact={true}
                    allowCreate={true}
                    hideArrow={true}
                  />
                ) : (
                  <span>{entry.clientName || "-"}</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Amount - Positioned left of center */}
        <div
          className="absolute left-[45%] -translate-x-1/2"
          onClick={(e) => {
            if (onInlineEdit && editingField !== "amountGross") {
              e.stopPropagation();
              startEditing("amountGross", entry.amountGross.toString());
            }
          }}
        >
          {editingField === "amountGross" ? (
            <Input
              ref={inputRef}
              type="number"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="h-8 text-sm w-24 px-2 text-center border-slate-200 focus:border-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              dir="ltr"
            />
          ) : (
            <div className={cn(
              "amount-value text-lg font-numbers tracking-tight",
              isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200",
              onInlineEdit && "hover:opacity-70 cursor-pointer"
            )} dir="ltr">
              <span className="text-xs me-0.5">₪</span>{entry.amountGross.toLocaleString("he-IL")}
            </div>
          )}
        </div>

        {/* Category - positioned between amount and status */}
        <div
          className="absolute left-[28%] -translate-x-1/2 hidden md:block"
          onClick={(e) => e.stopPropagation()}
        >
          {onInlineEdit && categories.length > 0 ? (
            <DropdownMenu open={isCategoryDropdownOpen} onOpenChange={setIsCategoryDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <button className="hover:opacity-80">
                  <CategoryChip
                    category={entry.categoryData}
                    legacyCategory={entry.category}
                    size="sm"
                    withIcon={true}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[180px]">
                {categories.filter(c => !c.isArchived).map(cat => (
                  <DropdownMenuItem
                    key={cat.id}
                    onClick={() => {
                      if (onInlineEdit) onInlineEdit(entry.id, "categoryId", cat.id);
                      setIsCategoryDropdownOpen(false);
                    }}
                    className="justify-end"
                  >
                    <CategoryChip
                      category={cat}
                      size="sm"
                      withIcon={true}
                    />
                  </DropdownMenuItem>
                ))}
                {onEditCategories && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setIsCategoryDropdownOpen(false);
                        onEditCategories();
                      }}
                      className="text-slate-500 gap-2 justify-end"
                    >
                      <span>ניהול קטגוריות</span>
                      <Settings2 className="h-3.5 w-3.5" />
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <CategoryChip
              category={entry.categoryData}
              legacyCategory={entry.category}
              size="sm"
              withIcon={true}
            />
          )}
        </div>

        {/* Status - Simplified with Dropdown */}
        <div
          className="shrink-0 flex items-center gap-1 ms-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu open={isStatusDropdownOpen} onOpenChange={setIsStatusDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                getStatusColor(status),
                "hover:opacity-80"
              )}>
                {getStatusIcon(status)}
                <span>{getStatusLabel(status)}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              <DropdownMenuItem
                onClick={() => handleStatusChange("paid")}
                className="gap-2 justify-end"
                disabled={isPaid}
              >
                <span>סמן כשולם</span>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusChange("sent")}
                className="gap-2 justify-end"
                disabled={isWaiting}
              >
                <span>נשלחה חשבונית</span>
                <Send className="h-3.5 w-3.5 text-orange-500" />
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleStatusChange("draft")}
                className="gap-2 justify-end"
                disabled={isDraft}
              >
                <span>סמן כטיוטה</span>
                <FileText className="h-3.5 w-3.5 text-sky-500" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {overdue && (
            <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 rounded-full font-medium">
              מאחר
            </span>
          )}
        </div>

        {/* Actions Menu */}
        <div
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-600">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[150px]">
              <DropdownMenuItem onClick={() => onClick(entry)} className="gap-2 justify-end whitespace-nowrap">
                <span>עריכה</span>
                <Pencil className="h-3.5 w-3.5 shrink-0" />
              </DropdownMenuItem>
              {onToggleSelectionMode && (
                <DropdownMenuItem onClick={onToggleSelectionMode} className="gap-2 justify-end whitespace-nowrap">
                  <span>{isSelectionMode ? "בטל בחירה" : "בחר עבודות"}</span>
                  <CheckSquare className="h-3.5 w-3.5 shrink-0" />
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(entry.id)} className="gap-2 justify-end whitespace-nowrap text-red-600 focus:text-red-600">
                <span>מחיקה</span>
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT (<md)
          Card-based design with date box on side
          ═══════════════════════════════════════════════════════════════════════ */}
      <div
        className={cn(
          "income-row md:hidden flex items-start gap-3",
          "bg-white dark:bg-card rounded-lg",
          "border border-slate-100 dark:border-border",
          "border-l-2 shadow-sm",
          "px-3 py-2.5 cursor-pointer"
        )}
        data-status={status}
        data-timing={timing}
        onClick={() => onClick(entry)}
      >
        {/* Date Cell - Mini Calendar Style */}
        <div className="date-cell flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700/50 rounded px-2 py-1.5 shrink-0">
          <span className="date-day text-lg font-semibold text-slate-800 dark:text-slate-100 leading-tight">{day}</span>
          <span className="date-weekday text-[10px] text-slate-400 dark:text-slate-500 font-medium">{weekday}</span>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Top row: Description + Amount */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-100 truncate text-base">
              {entry.description}
            </span>
            <div className={cn(
              "amount-value text-lg font-numbers tracking-tight shrink-0",
              isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200"
            )} dir="ltr">
              <span className="text-xs me-0.5">₪</span>{entry.amountGross.toLocaleString("he-IL")}
            </div>
          </div>

          {/* Client name */}
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {entry.clientName || "-"}
          </div>

          {/* Bottom row: Category + Status + Actions */}
          <div className="flex items-center gap-2 mt-2">
            <CategoryChip category={entry.categoryData} legacyCategory={entry.category} size="sm" />

            <div className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
              getStatusColor(status)
            )}>
              {getStatusIcon(status)}
              <span>{getStatusLabel(status)}</span>
            </div>

            {overdue && (
              <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 rounded-full font-medium">
                מאחר
              </span>
            )}

            {/* Actions menu */}
            <div className="ms-auto" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[150px]">
                  <DropdownMenuItem onClick={() => onClick(entry)} className="gap-2 justify-end whitespace-nowrap">
                    <span>עריכה</span>
                    <Pencil className="h-3.5 w-3.5 shrink-0" />
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(entry.id)} className="gap-2 justify-end whitespace-nowrap text-red-600 focus:text-red-600">
                    <span>מחיקה</span>
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});
