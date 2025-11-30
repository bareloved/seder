"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Check,
  Pencil,
  Copy,
  Trash2,
  FileText,
  Clock,
  CalendarDays,
} from "lucide-react";
import { IncomeEntry, DisplayStatus, STATUS_CONFIG } from "../../types";
import {
  formatCurrency,
  formatDate,
  daysSince,
  isOverdue,
  getDisplayStatus,
  isPastDate,
  getWeekday,
} from "../../utils";

type EditableField = "date" | "description" | "amountGross" | "clientName" | null;

interface IncomeTableRowProps {
  entry: IncomeEntry;
  index: number;
  clients?: string[];
  onRowClick: (entry: IncomeEntry) => void;
  onStatusChange: (id: string, status: DisplayStatus) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkInvoiceSent: (id: string) => void;
  onDuplicate: (entry: IncomeEntry) => void;
  onDelete: (id: string) => void;
  onInlineEdit?: (id: string, field: string, value: string | number) => void;
}

export function IncomeTableRow({
  entry,
  index,
  clients = [],
  onRowClick,
  onStatusChange,
  onMarkAsPaid,
  onMarkInvoiceSent,
  onDuplicate,
  onDelete,
  onInlineEdit,
}: IncomeTableRowProps) {
  const displayStatus = getDisplayStatus(entry);
  const statusConfig = displayStatus ? STATUS_CONFIG[displayStatus] : null;
  const isEven = index % 2 === 0;
  const overdue = isOverdue(entry);
  const daysSinceInvoice = entry.invoiceSentDate
    ? daysSince(entry.invoiceSentDate)
    : null;
  const isFutureGig = !isPastDate(entry.date);
  
  // Check if this is an unpaid past job (work done but not fully paid)
  const isUnpaidPast = !isFutureGig && entry.paymentStatus !== "paid";

  // Check if this is a draft entry imported from calendar that needs attention
  // Badge shows only if: imported from calendar + still has default amount (0) + unpaid
  const isCalendarDraft =
    entry.calendarEventId &&
    entry.amountGross === 0 &&
    entry.paymentStatus === "unpaid";

  // Inline editing state
  const [editingField, setEditingField] = React.useState<EditableField>(null);
  const [editValue, setEditValue] = React.useState<string>("");
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  React.useEffect(() => {
    if (editingField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingField]);

  const startEditing = (field: EditableField, currentValue: string) => {
    if (!onInlineEdit) return;
    setEditingField(field);
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (!editingField || !onInlineEdit) return;
    
    let valueToSave: string | number = editValue;
    
    // Convert amount to number
    if (editingField === "amountGross") {
      const numValue = parseFloat(editValue.replace(/[^\d.-]/g, ""));
      if (isNaN(numValue)) {
        cancelEdit();
        return;
      }
      valueToSave = numValue;
    }
    
    // Only save if value changed
    const currentValue = editingField === "amountGross" 
      ? entry.amountGross 
      : entry[editingField];
    
    if (valueToSave !== currentValue) {
      onInlineEdit(entry.id, editingField, valueToSave);
    }
    
    setEditingField(null);
    setEditValue("");
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    } else if (e.key === "Tab") {
      saveEdit();
      // Tab navigation between fields could be added here
    }
  };

  return (
    <TableRow
      className={cn(
        "border-b border-slate-200 dark:border-slate-700 transition-colors group",
        isEven
          ? "bg-white dark:bg-slate-900"
          : "bg-slate-50/40 dark:bg-slate-800/20",
        "hover:bg-slate-50/60 dark:hover:bg-slate-800/40",
        // Highlight unpaid past jobs with red tint and shadow
        isUnpaidPast && "bg-red-50/60 dark:bg-red-900/20 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.2),0_1px_2px_rgba(239,68,68,0.1)] dark:shadow-[inset_0_0_0_1px_rgba(239,68,68,0.3),0_1px_2px_rgba(239,68,68,0.18)]",
        // Stronger highlight for overdue (invoice sent > 30 days)
        overdue && "bg-red-50/80 dark:bg-red-900/30 shadow-[inset_0_0_0_1px_rgba(239,68,68,0.3),0_1px_3px_rgba(239,68,68,0.15)] dark:shadow-[inset_0_0_0_1px_rgba(239,68,68,0.4),0_1px_3px_rgba(239,68,68,0.25)]",
        isCalendarDraft && !isUnpaidPast && "bg-blue-50/30 dark:bg-blue-900/10"
      )}
    >
      {/* Date */}
      <TableCell className="font-medium py-3">
        {onInlineEdit ? (
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger asChild>
              <div
                className={cn(
                  "flex items-center gap-1.5 cursor-pointer rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                )}
              >
                <span className="text-sm text-slate-800 dark:text-slate-200">
                  {formatDate(entry.date)}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  ({getWeekday(new Date(entry.date))})
                </span>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={new Date(entry.date)}
                onSelect={(date) => {
                  if (date) {
                    const dateStr = date.toISOString().split("T")[0];
                    onInlineEdit(entry.id, "date", dateStr);
                  }
                  setIsDatePickerOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-slate-800 dark:text-slate-200">
              {formatDate(entry.date)}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              ({getWeekday(new Date(entry.date))})
            </span>
          </div>
        )}
      </TableCell>

      {/* Description */}
      <TableCell className="py-3">
        {editingField === "description" ? (
          <Input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm w-full px-2 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            dir="rtl"
          />
        ) : (
          <div
            className={cn(
              "flex flex-col gap-0.5 overflow-hidden rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
              onInlineEdit && "cursor-text"
            )}
            onClick={() => onInlineEdit && startEditing("description", entry.description)}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                {entry.description}
              </span>
              {isCalendarDraft && (
                <Badge
                  className={cn(
                    "text-[9px] px-1.5 py-0 font-medium border-0 shrink-0",
                    "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  )}
                >
                  <CalendarDays className="h-2.5 w-2.5 ml-0.5" />
                  טיוטה מהיומן
                </Badge>
              )}
            </div>
            {entry.category && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {entry.category}
              </span>
            )}
          </div>
        )}
      </TableCell>

      {/* Amount */}
      <TableCell className="font-semibold tabular-nums py-3">
        {editingField === "amountGross" ? (
          <Input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm w-[100px] px-2 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            dir="ltr"
            step="0.01"
          />
        ) : (
          <span
            className={cn(
              "text-sm rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-block",
              displayStatus === "שולם"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-orange-600 dark:text-orange-400",
              onInlineEdit && "cursor-text"
            )}
            dir="ltr"
            onClick={() => onInlineEdit && startEditing("amountGross", entry.amountGross.toString())}
          >
            {formatCurrency(entry.amountGross)}
          </span>
        )}
      </TableCell>

      {/* Client */}
      <TableCell className="py-3 overflow-hidden">
        {editingField === "clientName" ? (
          <Input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            className="h-7 text-sm w-full px-2 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            dir="rtl"
            list="clients-list"
          />
        ) : (
          <span
            className={cn(
              "text-sm text-slate-600 dark:text-slate-400 font-medium truncate block rounded-md px-2 py-1 -mx-2 -my-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
              onInlineEdit && "cursor-text"
            )}
            onClick={() => onInlineEdit && startEditing("clientName", entry.clientName)}
          >
            {entry.clientName}
          </span>
        )}
        {/* Client suggestions datalist */}
        <datalist id="clients-list">
          {clients.map((client) => (
            <option key={client} value={client} />
          ))}
        </datalist>
      </TableCell>

      {/* Status */}
      <TableCell className="py-3">
        <div className="flex items-center gap-2">
          {/* Future gig without status - show nothing */}
          {isFutureGig && !displayStatus ? null : statusConfig ? (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  className="focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Badge
                    className={cn(
                      "text-[10px] px-2.5 py-0.5 rounded-full font-medium border cursor-pointer hover:opacity-80 transition-opacity",
                      statusConfig.bgClass,
                      statusConfig.textClass,
                      statusConfig.borderClass
                    )}
                  >
                    {statusConfig.label}
                  </Badge>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="p-1.5 min-w-[120px]"
                sideOffset={4}
                avoidCollisions={true}
              >
                {(["בוצע", "נשלחה", "שולם"] as DisplayStatus[])
                  .filter((status) => status !== displayStatus)
                  .map((status) => {
                    const config = STATUS_CONFIG[status];
                    return (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => onStatusChange(entry.id, status)}
                        className="p-1 focus:bg-transparent"
                      >
                        <Badge
                          className={cn(
                            "w-full justify-center text-[10px] px-2.5 py-1 rounded-full font-medium border cursor-pointer",
                            config.bgClass,
                            config.textClass,
                            config.borderClass
                          )}
                        >
                          {config.label}
                        </Badge>
                      </DropdownMenuItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {/* Days since invoice badge */}
          {daysSinceInvoice !== null && displayStatus === "נשלחה" && (
            <Badge
              className={cn(
                "text-[9px] px-1.5 py-0 font-medium border-0",
                overdue
                  ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              )}
            >
              {daysSinceInvoice}
              <Clock className="h-2.5 w-2.5 mr-1" />
            </Badge>
          )}
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="py-3 print:hidden">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {displayStatus === "בוצע" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              onClick={(e) => {
                e.stopPropagation();
                onMarkInvoiceSent(entry.id);
              }}
              title="שלחתי חשבונית"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
          )}
          {displayStatus === "נשלחה" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsPaid(entry.id);
              }}
              title="סמן כשולם"
            >
              <Check className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => onRowClick(entry)}
            title="ערוך"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(entry);
            }}
            title="שכפל"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            title="מחק"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
