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
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Check,
  FileText,
  MoreVertical,
  Pencil,
  Trash2,
  StickyNote,
  CalendarDays,
  Settings2,
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { IncomeEntry, DisplayStatus, STATUS_CONFIG } from "../../types";
import type { Category } from "@/db/schema";
import {
  formatCurrency,
  formatDate,
  daysSince,
  isOverdue,
  getDisplayStatus,
  isPastDate,
  getWeekday,
} from "../../utils";
import { CategoryChip } from "../CategoryChip";

// ─────────────────────────────────────────────────────────────────────────────
// Shared Income Entry Row Component
// ─────────────────────────────────────────────────────────────────────────────
// Desktop (md+): Compact table-like row with inline editing, separate columns
//                for date, description, client, category, amount, status, actions.
// Mobile (<md):  Stacked layout optimized for touch (unchanged).
// ─────────────────────────────────────────────────────────────────────────────

type EditableField = "date" | "description" | "amountGross" | "clientName" | "category" | null;
type ColumnKey = "date" | "description" | "client" | "category" | "amount" | "status" | "actions";
const DEFAULT_COLUMN_ORDER: ColumnKey[] = ["date", "description", "client", "category", "amount", "status", "actions"];

export interface IncomeEntryRowProps {
  entry: IncomeEntry;
  onClick: (entry: IncomeEntry) => void;
  onStatusChange: (id: string, status: DisplayStatus) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkInvoiceSent: (id: string) => void;
  onDuplicate: (entry: IncomeEntry) => void;
  onDelete: (id: string) => void;
  /** Optional inline edit handler - enables Excel-like editing on desktop */
  onInlineEdit?: (id: string, field: string, value: string | number) => void;
  /** Client list for autocomplete */
  clients?: string[];
  /** Categories list for dropdown */
  categories?: Category[];
  /** Column order for desktop layout */
  columnOrder?: ColumnKey[];
  /** Optional handler to open category manager dialog */
  onEditCategories?: () => void;
}

export const IncomeEntryRow = React.memo(function IncomeEntryRow({
  entry,
  onClick,
  onStatusChange,
  onMarkAsPaid,
  onMarkInvoiceSent,
  onDelete,
  onInlineEdit,
  clients = [],
  categories = [],
  columnOrder,
  onEditCategories,
}: IncomeEntryRowProps) {
  const effectiveOrder = columnOrder && columnOrder.length ? columnOrder : DEFAULT_COLUMN_ORDER;
  const displayStatus = getDisplayStatus(entry);
  const statusConfig = displayStatus ? STATUS_CONFIG[displayStatus] : null;
  const overdue = isOverdue(entry);
  const daysSinceInvoice = entry.invoiceSentDate
    ? daysSince(entry.invoiceSentDate)
    : null;
  const isFutureGig = !isPastDate(entry.date);
  
  // Parse notes
  const rawNotes = (entry.notes || "").trim();
  const isCalendarImportNote = rawNotes === "יובא מהיומן";
  const hasNotes = rawNotes.length > 0 && !isCalendarImportNote;
  const hasCalendarEvent = !!entry.calendarEventId;
  
  // Status checks
  const isPaid = displayStatus === "שולם";
  const isWaiting = displayStatus === "נשלחה";
  const isDraft = displayStatus === "בוצע";
  
  const isUnpaidPast = !isFutureGig && entry.paymentStatus !== "paid";
  const isCalendarDraft =
    entry.calendarEventId &&
    entry.amountGross === 0 &&
    entry.paymentStatus === "unpaid";

  // Invoice status label
  const invoiceStatusLabel =
    isPaid
      ? null
      : entry.invoiceStatus === "sent" || entry.invoiceSentDate
        ? "נשלחה"
        : "אין חשבונית";

  // ─── Colors ───
  const leftBorderColor = overdue
    ? "border-l-red-500 dark:border-l-red-600"
    : isPaid
      ? "border-l-emerald-500 dark:border-l-emerald-600"
      : isWaiting
        ? "border-l-amber-400 dark:border-l-amber-500"
        : "border-l-slate-300 dark:border-l-slate-600";

  // Calm visual style: mostly white/neutral
  const bgClass = "bg-white dark:bg-slate-900";

  const amountColor = isPaid
    ? "text-emerald-600 dark:text-emerald-400"
    : isWaiting || overdue || isUnpaidPast
      ? "text-amber-600 dark:text-amber-400"
      : "text-slate-800 dark:text-slate-200";

  // ─── Inline Editing State (Desktop only) ───
  const [editingField, setEditingField] = React.useState<EditableField>(null);
  const [editValue, setEditValue] = React.useState<string>("");
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = React.useState(false);
  const [showClientSuggestions, setShowClientSuggestions] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input when editing starts
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
        "group relative rounded-lg border border-slate-200 dark:border-slate-800",
        "border-l-[3px] transition-all",
        "hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
        leftBorderColor,
        bgClass
      )}
    >
      {/* ═══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT (md+)
          Columns: תאריך | תיאור | לקוח | קטגוריה | סכום | סטטוס | פעולות
          With Excel-like inline editing
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex md:items-center md:min-h-[52px]">
        { effectiveOrder.map((colKey) => {
          const columnMap: Record<ColumnKey, React.ReactElement> = {
            date: (
              <div className="shrink-0 w-[70px] px-2 py-2.5 border-l border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-0.5">
                {onInlineEdit ? (
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <button
                        className="text-sm font-numbers text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-1 py-0.5 rounded cursor-pointer transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {formatDate(entry.date)}
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
                  <span className="text-sm font-numbers text-slate-600 dark:text-slate-300">
                    {formatDate(entry.date)}
                  </span>
                )}
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {getWeekday(new Date(entry.date))}
                </span>
              </div>
            ),
            description: (
              <div 
                className="flex-1 min-w-0 max-w-[420px] px-3 py-2.5 border-l border-slate-100 dark:border-slate-800 flex items-center cursor-pointer"
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
                    className="h-8 text-base w-full px-2 border border-emerald-500/50 bg-white dark:bg-slate-800 focus-visible:ring-0 rounded-md shadow-sm"
                    dir="rtl"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    {/* Icons should sit on the left of the text box (RTL aware) */}
                    <div className="min-w-0 flex items-start gap-2 flex-row-reverse">
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "text-base font-medium text-slate-700 dark:text-slate-200 line-clamp-2 leading-snug",
                          onInlineEdit && "hover:text-slate-900 dark:hover:text-white transition-colors"
                        )}>
                          {entry.description}
                        </p>
                        {overdue && (
                          <Badge className="mt-1 text-[10px] px-1.5 py-0 bg-red-100 text-red-700 border-0 inline-flex items-center gap-1">
                            מאחר
                          </Badge>
                        )}
                      </div>
                      {/* Icons column aligned to the left edge of the description cell */}
                      <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                        {hasNotes && (
                          <Tooltip>
                            <TooltipTrigger>
                              <StickyNote className="h-3.5 w-3.5 text-amber-400/80" />
                            </TooltipTrigger>
                            <TooltipContent><p>{entry.notes}</p></TooltipContent>
                          </Tooltip>
                        )}
                        {hasCalendarEvent && (
                          <CalendarDays className="h-3.5 w-3.5 text-blue-400/80" />
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ),
            client: (
              <div 
                className="shrink-0 w-[110px] px-3 py-2.5 border-l border-slate-100 dark:border-slate-800 flex items-center cursor-pointer"
                onClick={(e) => {
                  if (onInlineEdit && editingField !== "clientName") {
                    e.stopPropagation();
                    startEditing("clientName", entry.clientName);
                  }
                }}
              >
                {editingField === "clientName" ? (
                  <div className="relative w-full">
                    <Input
                      ref={inputRef}
                      value={editValue}
                      onChange={(e) => {
                        setEditValue(e.target.value);
                        setShowClientSuggestions(true);
                      }}
                      onFocus={() => setShowClientSuggestions(true)}
                      onBlur={() => setTimeout(() => { setShowClientSuggestions(false); saveEdit(); }, 150)}
                      onKeyDown={handleKeyDown}
                      className="h-8 text-sm w-full px-2 border border-emerald-500/50 bg-white dark:bg-slate-800 focus-visible:ring-0 rounded-md shadow-sm"
                      dir="rtl"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {showClientSuggestions && filteredClients.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-slate-800 rounded shadow-lg border border-slate-200 dark:border-slate-700 py-1">
                        {filteredClients.map((client) => (
                          <button
                            key={client}
                            className="w-full px-2 py-1.5 text-right text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
                            onClick={(e) => { e.stopPropagation(); selectClient(client); }}
                          >
                            {client}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className={cn(
                    "text-sm text-slate-600 dark:text-slate-400 truncate block w-full",
                    onInlineEdit && "hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                  )}>
                    {entry.clientName || "—"}
                  </span>
                )}
              </div>
            ),
            category: (
              <div 
                className="shrink-0 w-[100px] px-2 py-2.5 border-l border-slate-100 dark:border-slate-800 flex items-center"
                onClick={(e) => e.stopPropagation()}
              >
                {onInlineEdit && categories.length > 0 ? (
                  <DropdownMenu open={isCategoryDropdownOpen} onOpenChange={setIsCategoryDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full text-right hover:opacity-80 transition-opacity">
                        <CategoryChip category={entry.categoryData} legacyCategory={entry.category} size="sm" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[150px]">
                      {categories.filter(c => !c.isArchived).map((cat) => (
                        <DropdownMenuItem
                          key={cat.id}
                          onClick={() => {
                            if (onInlineEdit) onInlineEdit(entry.id, "categoryId", cat.id);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className="justify-end"
                        >
                          <CategoryChip category={cat} size="sm" />
                        </DropdownMenuItem>
                      ))}
                      {(entry.categoryId || entry.category) && (
                        <>
                          <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                          <DropdownMenuItem
                            onClick={() => {
                              if (onInlineEdit) onInlineEdit(entry.id, "categoryId", "");
                              setIsCategoryDropdownOpen(false);
                            }}
                            className="justify-end text-xs text-slate-400"
                          >
                            הסר קטגוריה
                          </DropdownMenuItem>
                        </>
                      )}
                      {onEditCategories && (
                        <>
                          <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
                          <DropdownMenuItem
                            onClick={() => {
                              setIsCategoryDropdownOpen(false);
                              onEditCategories();
                            }}
                            className="justify-end text-xs text-slate-500 gap-1"
                          >
                            <Settings2 className="h-3 w-3" />
                            ערוך קטגוריות
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <CategoryChip category={entry.categoryData} legacyCategory={entry.category} size="sm" />
                )}
              </div>
            ),
            amount: (
              <div 
                className="shrink-0 w-[105px] px-3 py-2.5 border-l border-slate-100 dark:border-slate-800 flex items-center cursor-pointer"
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
                    className="h-8 text-base w-full px-2 border border-emerald-500/50 bg-white dark:bg-slate-800 focus-visible:ring-0 rounded-md shadow-sm text-left"
                    dir="ltr"
                    onClick={(e) => e.stopPropagation()}
                  />
                  ) : (
                    <span
                      className={cn(
                        "text-base font-bold font-numbers tabular-nums ml-auto",
                        amountColor,
                        onInlineEdit && "hover:opacity-80 transition-opacity"
                      )}
                      dir="ltr"
                    >
                      {formatCurrency(entry.amountGross)}
                    </span>
                  )}
              </div>
            ),
            status: (
              <div className="shrink-0 w-[100px] px-2 py-2.5 border-l border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-1">
                {statusConfig && (
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="focus:outline-none group/status"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Badge
                          className={cn(
                            "text-[10px] px-2.5 py-0.5 rounded-full font-medium border cursor-pointer group-hover/status:opacity-90 transition-opacity whitespace-nowrap shadow-sm",
                            statusConfig.bgClass,
                            statusConfig.textClass,
                            statusConfig.borderClass
                          )}
                        >
                          {statusConfig.label}
                        </Badge>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="p-1 min-w-[120px]" sideOffset={4}>
                      {(["בוצע", "נשלחה", "שולם"] as DisplayStatus[])
                        .filter((status) => status !== displayStatus)
                        .map((status) => {
                          const config = STATUS_CONFIG[status];
                          return (
                            <DropdownMenuItem
                              key={status}
                              onClick={(e) => { e.stopPropagation(); onStatusChange(entry.id, status); }}
                              className="p-1 focus:bg-transparent justify-center"
                            >
                              <Badge className={cn(
                                "w-full justify-center text-[10px] px-2 py-0.5 rounded-full font-medium border cursor-pointer",
                                config.bgClass, config.textClass, config.borderClass
                              )}>
                                {config.label}
                              </Badge>
                            </DropdownMenuItem>
                          );
                        })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {/* Invoice info - plain text below */}
                {isWaiting && daysSinceInvoice !== null ? (
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 font-medium font-numbers">
                    לפני {daysSinceInvoice} ימים
                  </span>
                ) : invoiceStatusLabel && !isWaiting ? (
                  <span className="text-[9px] text-slate-400 dark:text-slate-500">
                    {invoiceStatusLabel}
                  </span>
                ) : null}
              </div>
            ),
            actions: (
              <div className="shrink-0 w-[110px] px-1.5 py-2.5 flex items-center justify-center gap-1">
                {isDraft && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full"
                        onClick={(e) => { e.stopPropagation(); onMarkInvoiceSent(entry.id); }}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>סמן כנשלחה</p></TooltipContent>
                  </Tooltip>
                )}

                {!isPaid && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-full"
                        onClick={(e) => { e.stopPropagation(); onMarkAsPaid(entry.id); }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p>סמן כשולם</p></TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                      onClick={(e) => { e.stopPropagation(); onClick(entry); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>עריכה מלאה</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full"
                      onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom"><p>מחיקה</p></TooltipContent>
                </Tooltip>
              </div>
            ),
          };

          return (
            <React.Fragment key={colKey}>
              {columnMap[colKey]}
            </React.Fragment>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT (<md) - Unchanged
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="md:hidden p-3" onClick={() => onClick(entry)}>
        {/* TOP LINE */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-numbers font-medium text-slate-700 dark:text-slate-200">
              {formatDate(entry.date)}
            </span>
            <span>({getWeekday(new Date(entry.date))})</span>
            {overdue && (
              <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                מאחר
              </span>
            )}
            {isCalendarDraft && (
              <Badge className="text-[9px] px-1.5 py-0 font-medium border-0 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                <CalendarDays className="h-2.5 w-2.5 ml-0.5" />
                טיוטה
              </Badge>
            )}
          </div>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 -ml-1"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-44 text-right"
              style={{ direction: "rtl" }}
            >
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onMarkAsPaid(entry.id); }}
                disabled={isPaid}
                className={cn("h-11 text-sm px-3 gap-3 items-center justify-start", isPaid && "opacity-50")}
              >
                <Check className="h-4 w-4" />
                סמן כ־שולם
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onMarkInvoiceSent(entry.id); }}
                disabled={isWaiting || isPaid}
                className={cn("h-11 text-sm px-3 gap-3 items-center justify-start", (isWaiting || isPaid) && "opacity-50")}
              >
                <FileText className="h-4 w-4" />
                נשלחה חשבונית
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                className="h-11 text-sm px-3 gap-3 items-center justify-start text-red-600"
              >
                <Trash2 className="h-4 w-4" />
                מחק
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* MIDDLE */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Description with calendar icon if imported */}
            <div className="flex items-start gap-1.5">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug flex-1">
                {entry.description}
              </p>
              {hasCalendarEvent && (
                <CalendarDays className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              )}
              {hasNotes && (
                <StickyNote className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {entry.clientName}
              {(entry.categoryData || entry.category) && (
                <><span className="mx-1">·</span><CategoryChip category={entry.categoryData} legacyCategory={entry.category} size="sm" withIcon={false} className="inline" /></>
              )}
            </p>
          </div>
          <div className="flex flex-col items-start shrink-0">
            <span className={cn("text-lg font-bold font-numbers tabular-nums", amountColor)} dir="ltr">
              {formatCurrency(entry.amountGross)}
            </span>
            {statusConfig && (
              <Badge className={cn("text-[9px] px-1.5 py-0 rounded-full font-medium border mt-1", statusConfig.bgClass, statusConfig.textClass, statusConfig.borderClass)}>
                {statusConfig.label}
                {daysSinceInvoice !== null && displayStatus === "נשלחה" && (
                  <span className="mr-1 font-numbers">({daysSinceInvoice})</span>
                )}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
