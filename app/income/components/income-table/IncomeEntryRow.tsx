"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  StickyNote,
  CalendarDays,
  Settings2,
  MoreVertical,
  MoreHorizontal,
  CheckSquare,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { IncomeEntry, DisplayStatus, STATUS_CONFIG, MoneyStatus } from "../../types";
import type { Category, Client } from "@/db/schema";
import {
  formatCurrency,
  formatDate,
  daysSince,
  isOverdue,
  getDisplayStatus,
  isPastDate,
  getWeekday,
  getWorkStatus,
  getMoneyStatus,
} from "../../utils";
import { SplitStatusPill } from "../SplitStatusPill";
import { CategoryChip } from "../CategoryChip";
import { ClientDropdown } from "@/app/clients/components/ClientDropdown";

type EditableField = "date" | "description" | "amountGross" | "clientName" | "category" | null;
type ColumnKey = "date" | "description" | "client" | "category" | "amount" | "status" | "actions";
const DEFAULT_COLUMN_ORDER: ColumnKey[] = ["date", "description", "client", "category", "amount", "status", "actions"];

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
  columnOrder?: ColumnKey[];
  columnWidths?: Partial<Record<ColumnKey, number>>;
  onEditCategories?: () => void;
  // Selection props
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  onToggleSelectionMode?: () => void;
}

// Default widths (matching IncomeListView)
const DEFAULT_COLUMN_WIDTHS: Partial<Record<ColumnKey, number>> = {
  client: 110,
  description: 300,
};

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
  columnOrder,
  columnWidths,
  onEditCategories,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
  onToggleSelectionMode,
}: IncomeEntryRowProps) {
  const effectiveOrder = columnOrder && columnOrder.length ? columnOrder : DEFAULT_COLUMN_ORDER;
  const displayStatus = getDisplayStatus(entry);
  const statusConfig = displayStatus ? STATUS_CONFIG[displayStatus] : null;
  const workStatus = getWorkStatus(entry);
  const moneyStatus = getMoneyStatus(entry);
  const overdue = isOverdue(entry);

  const rawNotes = (entry.notes || "").trim();
  const isCalendarImportNote = rawNotes === "יובא מהיומן";
  const hasNotes = rawNotes.length > 0 && !isCalendarImportNote;
  const hasCalendarEvent = !!entry.calendarEventId;

  const isPaid = moneyStatus === "paid";
  const isDraft = workStatus === "done" && moneyStatus === "no_invoice";
  const isWaiting = moneyStatus === "invoice_sent";

  const [editingField, setEditingField] = React.useState<EditableField>(null);
  const [editValue, setEditValue] = React.useState<string>("");
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = React.useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editingField && inputRef.current && editingField !== "category" && editingField !== "date") {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const filteredClients = React.useMemo(() => {
    if (!editValue.trim()) return clients.slice(0, 5);
    return clients
      .filter((c) => c.toLowerCase().includes(editValue.toLowerCase()))
      .slice(0, 5);
  }, [clients, editValue]);

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
    setShowClientSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  const selectClient = (client: string) => {
    if (onInlineEdit) {
      onInlineEdit(entry.id, "clientName", client);
    }
    setEditingField(null);
    setEditValue("");
    setShowClientSuggestions(false);
  };

  return (
    <div
      className={cn(
        "group relative border-b border-slate-100 dark:border-border/50 hover:bg-slate-50/50 dark:hover:bg-muted/30 transition-colors py-1",
        isSelected && "bg-slate-100/80 dark:bg-muted/40 hover:bg-slate-100 dark:hover:bg-muted/50"
      )}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT (md+)
          match image style: clean white rows
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:items-center min-h-[50px] min-w-max">
        {/* Selection Checkbox - appears first (right side in RTL) when in selection mode */}
        {isSelectionMode && onToggleSelection && (
          <div
            className="shrink-0 w-[40px] px-2 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(entry.id)}
              className="h-5 w-5 border-2 border-slate-300 data-[state=checked]:bg-slate-800 data-[state=checked]:border-slate-800"
            />
          </div>
        )}
        {effectiveOrder.map((colKey) => {
          const columnMap: Record<ColumnKey, React.ReactElement> = {
            date: (
              <div className="shrink-0 w-[70px] px-2 flex justify-end">
                <div className="text-right">
                  {onInlineEdit ? (
                    <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <button
                          className="text-base text-slate-900 dark:text-slate-200 font-medium hover:bg-slate-100 dark:hover:bg-muted/50 rounded px-1 transition-colors block text-right w-full"
                        >
                          {format(new Date(entry.date), "dd.MM", { locale: he })}
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
                    <span className="text-base text-slate-900 dark:text-slate-200 font-medium">
                      {format(new Date(entry.date), "dd.MM", { locale: he })}
                    </span>
                  )}
                </div>
              </div>
            ),
            client: (
              <div
                className="shrink-0 px-3 flex items-center"
                style={{ width: columnWidths?.client || DEFAULT_COLUMN_WIDTHS.client }}
                onClick={(e) => e.stopPropagation()}
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
                    className="h-8 text-sm w-full border-0 bg-transparent hover:bg-slate-100 dark:hover:bg-muted/50"
                    compact={true}
                    allowCreate={true}
                  />
                ) : (
                  <span className={cn(
                    "text-base truncate block w-full text-right",
                    entry.clientName
                      ? "text-slate-900 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-500 opacity-50"
                  )}>
                    {entry.clientName || "-"}
                  </span>
                )}
              </div>
            ),
            description: (
              <div
                className="shrink-0 min-w-0 px-3 flex items-center"
                style={{
                  width: columnWidths?.description || DEFAULT_COLUMN_WIDTHS.description,
                }}
                onClick={(e) => {
                  if (onInlineEdit && editingField !== "description") {
                    e.stopPropagation();
                    startEditing("description", entry.description);
                  } else if (!onInlineEdit) {
                    onClick(entry);
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
                    className="h-9 text-base w-full px-2 text-right border-slate-200 focus:border-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                ) : (
                  <div className="w-full text-right truncate">
                    <span className={cn(
                      "text-base text-slate-700 truncate block",
                      onInlineEdit && "hover:text-slate-900 dark:text-slate-200 cursor-pointer"
                    )}>
                      {entry.description}
                    </span>
                  </div>
                )}
              </div>
            ),
            category: (
              <div
                className="shrink-0 w-[100px] px-2 flex items-center justify-start"
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
            ),
            amount: (
              <div
                className="shrink-0 w-[120px] px-3 flex items-center justify-start"
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
                    className="h-9 text-base w-full px-2 text-right border-slate-200 focus:border-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    dir="rtl"
                  />
                ) : (
                  <span className="text-lg font-normal font-numbers text-slate-900 dark:text-slate-200 whitespace-nowrap" dir="ltr">
                    <span className="text-xs">₪</span> {entry.amountGross.toLocaleString("he-IL")}
                  </span>
                )}
              </div>
            ),
            status: (
              <div className="shrink-0 w-[100px] px-2 flex justify-center items-center gap-1.5">
                <SplitStatusPill
                  workStatus={workStatus}
                  moneyStatus={moneyStatus}
                  isInteractive={true}
                  onMoneyStatusChange={(newStatus) => {
                    if (onMoneyStatusChange) {
                      onMoneyStatusChange(entry.id, newStatus);
                    }
                  }}
                />
                {overdue && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 rounded-full font-medium">
                    מאחר
                  </span>
                )}
              </div>
            ),
            actions: (
              <div className={cn(
                "shrink-0 w-[50px] px-1.5 flex items-center justify-end sticky left-0 z-10 transition-colors",
                isSelected
                  ? "bg-slate-100/80 dark:bg-muted/40 group-hover:bg-slate-100 dark:group-hover:bg-muted/50"
                  : "bg-white dark:bg-background group-hover:bg-slate-50/50 dark:group-hover:bg-muted/30"
              )}>
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-slate-600" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[150px]">
                    <DropdownMenuItem onClick={() => onClick(entry)} className="gap-2 justify-end whitespace-nowrap">
                      <span>עריכה</span>
                      <Pencil className="h-3.5 w-3.5 shrink-0" />
                    </DropdownMenuItem>
                    {!isPaid && (
                      <DropdownMenuItem onClick={() => onMarkAsPaid(entry.id)} className="gap-2 justify-end whitespace-nowrap">
                        <span>סמן כשולם</span>
                        <Check className="h-3.5 w-3.5 shrink-0" />
                      </DropdownMenuItem>
                    )}
                    {isDraft && (
                      <DropdownMenuItem onClick={() => onMarkInvoiceSent(entry.id)} className="gap-2 justify-end whitespace-nowrap">
                        <span>נשלחה חשבונית</span>
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                      </DropdownMenuItem>
                    )}
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
            )
          };

          return (
            <React.Fragment key={colKey}>
              {columnMap[colKey]}
            </React.Fragment>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT (<md) - Description on top, client below, date+amount at bottom
          Action button at bottom center opens menu
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden px-2 py-2 border-b border-slate-100 dark:border-border/50">
        {/* Top row: Description (right) + Status pill (left) */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{entry.description}</span>
          <div className="flex items-center gap-1 shrink-0">
            <SplitStatusPill
              workStatus={workStatus}
              moneyStatus={moneyStatus}
              isInteractive={false}
              useTouchTooltip={true}
            />
            {overdue && (
              <span className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200 rounded-full font-medium">
                מאחר
              </span>
            )}
          </div>
        </div>
        {/* Middle row: Client name */}
        <span className="text-xs text-slate-500 dark:text-slate-400">{entry.clientName}</span>
        {/* Bottom row: Date (right) | Action button (center) | Amount (left) */}
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-numbers">{formatDate(entry.date)}</span>

          {/* Action button - opens menu */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-muted/50 rounded-md"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[150px]">
              <DropdownMenuItem onClick={() => onClick(entry)} className="gap-2 justify-end whitespace-nowrap">
                <span>עריכה</span>
                <Pencil className="h-3.5 w-3.5 shrink-0" />
              </DropdownMenuItem>
              {!isPaid && (
                <DropdownMenuItem onClick={() => onMarkAsPaid(entry.id)} className="gap-2 justify-end whitespace-nowrap">
                  <span>סמן כשולם</span>
                  <Check className="h-3.5 w-3.5 shrink-0" />
                </DropdownMenuItem>
              )}
              {isDraft && (
                <DropdownMenuItem onClick={() => onMarkInvoiceSent(entry.id)} className="gap-2 justify-end whitespace-nowrap">
                  <span>נשלחה חשבונית</span>
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(entry.id)} className="gap-2 justify-end whitespace-nowrap text-red-600 focus:text-red-600">
                <span>מחיקה</span>
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-base font-medium text-slate-900 dark:text-slate-200 font-numbers" dir="ltr">₪ {entry.amountGross.toLocaleString("he-IL")}</span>
        </div>
      </div>

    </div>
  );
});
