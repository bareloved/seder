"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  MoreHorizontal,
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

interface MobileIncomeCardProps {
  entry: IncomeEntry;
  onCardClick: (entry: IncomeEntry) => void;
  onStatusChange: (id: string, status: DisplayStatus) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkInvoiceSent: (id: string) => void;
  onDuplicate: (entry: IncomeEntry) => void;
  onDelete: (id: string) => void;
}

export function MobileIncomeCard({
  entry,
  onCardClick,
  onStatusChange,
  onMarkAsPaid,
  onMarkInvoiceSent,
  onDuplicate,
  onDelete,
}: MobileIncomeCardProps) {
  const displayStatus = getDisplayStatus(entry);
  const statusConfig = displayStatus ? STATUS_CONFIG[displayStatus] : null;
  const overdue = isOverdue(entry);
  const daysSinceInvoice = entry.invoiceSentDate
    ? daysSince(entry.invoiceSentDate)
    : null;
  const isFutureGig = !isPastDate(entry.date);
  const isUnpaidPast = !isFutureGig && entry.paymentStatus !== "paid";

  // Check if this is a draft entry imported from calendar that needs attention
  // Badge shows only if: imported from calendar + still has default amount (0) + unpaid
  const isCalendarDraft =
    entry.calendarEventId &&
    entry.amountGross === 0 &&
    entry.paymentStatus === "unpaid";

  return (
    <div
      className={cn(
        "rounded-xl border bg-white dark:bg-slate-900 p-3 shadow-sm transition-all active:scale-[0.99]",
        "border-slate-200 dark:border-slate-800",
        // Highlight unpaid past jobs
        isUnpaidPast && "bg-red-50/60 dark:bg-red-900/20 border-red-200/60 dark:border-red-800/40",
        // Stronger highlight for overdue
        overdue && "bg-red-50/80 dark:bg-red-900/30 border-red-300/60 dark:border-red-700/50",
        // Calendar draft
        isCalendarDraft && !isUnpaidPast && "bg-blue-50/30 dark:bg-blue-900/10 border-blue-200/50"
      )}
      onClick={() => onCardClick(entry)}
    >
      {/* Row 1: Date + Weekday, Status Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {formatDate(entry.date)}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            ({getWeekday(new Date(entry.date))})
          </span>
          {isCalendarDraft && (
            <Badge
              className="text-[9px] px-1.5 py-0 font-medium border-0 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
            >
              <CalendarDays className="h-2.5 w-2.5 ml-0.5" />
              טיוטה
            </Badge>
          )}
        </div>
        
        {/* Status Badge */}
        {statusConfig && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                className="focus:outline-none"
                onClick={(e) => e.stopPropagation()}
              >
                <Badge
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-medium border cursor-pointer hover:opacity-80 transition-opacity",
                    statusConfig.bgClass,
                    statusConfig.textClass,
                    statusConfig.borderClass
                  )}
                >
                  {statusConfig.label}
                  {daysSinceInvoice !== null && displayStatus === "נשלחה" && (
                    <span className="mr-1">({daysSinceInvoice})</span>
                  )}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="p-1.5 min-w-[120px]"
              sideOffset={4}
            >
              {(["בוצע", "נשלחה", "שולם"] as DisplayStatus[])
                .filter((status) => status !== displayStatus)
                .map((status) => {
                  const config = STATUS_CONFIG[status];
                  return (
                    <DropdownMenuItem
                      key={status}
                      onClick={(e) => {
                        e.stopPropagation();
                        onStatusChange(entry.id, status);
                      }}
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
        )}
      </div>

      {/* Row 2: Description + Category */}
      <div className="mb-2">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
          {entry.description}
        </p>
        {entry.category && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {entry.category}
          </span>
        )}
      </div>

      {/* Row 3: Client + Amount */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-[50%]">
          {entry.clientName}
        </span>
        <span
          className={cn(
            "text-base font-bold tabular-nums",
            displayStatus === "שולם"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-orange-600 dark:text-orange-400"
          )}
          dir="ltr"
        >
          {formatCurrency(entry.amountGross)}
        </span>
      </div>

      {/* Row 4: Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        {/* Quick actions based on status */}
        <div className="flex items-center gap-1">
          {displayStatus === "בוצע" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              onClick={(e) => {
                e.stopPropagation();
                onMarkInvoiceSent(entry.id);
              }}
            >
              <FileText className="h-3.5 w-3.5 ml-1" />
              שלחתי חשבונית
            </Button>
          )}
          {displayStatus === "נשלחה" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
              onClick={(e) => {
                e.stopPropagation();
                onMarkAsPaid(entry.id);
              }}
            >
              <Check className="h-3.5 w-3.5 ml-1" />
              סמן כשולם
            </Button>
          )}
        </div>

        {/* More actions dropdown */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onCardClick(entry);
              }}
            >
              <Pencil className="h-4 w-4 ml-2" />
              ערוך
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(entry);
              }}
            >
              <Copy className="h-4 w-4 ml-2" />
              שכפל
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(entry.id);
              }}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 ml-2" />
              מחק
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

