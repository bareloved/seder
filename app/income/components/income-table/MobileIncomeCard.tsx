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
  Copy,
  Trash2,
  FileText,
  CalendarDays,
  MoreVertical,
  StickyNote,
} from "lucide-react";
import { IncomeEntry, DisplayStatus, STATUS_CONFIG, MoneyStatus } from "../../types";
import {
  formatCurrency,
  formatDate,
  isOverdue,
  getDisplayStatus,
  isPastDate,
  getWeekday,
  getWorkStatus,
  getMoneyStatus,
} from "../../utils";
import { SplitStatusPill } from "../SplitStatusPill";
import { CategoryChip } from "../CategoryChip";

interface MobileIncomeCardProps {
  entry: IncomeEntry;
  onCardClick: (entry: IncomeEntry) => void;
  onStatusChange: (id: string, status: DisplayStatus) => void;
  onMoneyStatusChange?: (id: string, status: MoneyStatus) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkInvoiceSent: (id: string) => void;
  onDuplicate: (entry: IncomeEntry) => void;
  onDelete: (id: string) => void;
}

export const MobileIncomeCard = React.memo(function MobileIncomeCard({
  entry,
  onCardClick,
  onStatusChange,
  onMoneyStatusChange,
  onMarkAsPaid,
  onMarkInvoiceSent,
  onDuplicate,
  onDelete,
}: MobileIncomeCardProps) {
  const displayStatus = getDisplayStatus(entry);
  const statusConfig = displayStatus ? STATUS_CONFIG[displayStatus] : null;
  const workStatus = getWorkStatus(entry);
  const moneyStatus = getMoneyStatus(entry);
  const overdue = isOverdue(entry);
  const isFutureGig = !isPastDate(entry.date);
  const isUnpaidPast = !isFutureGig && entry.paymentStatus !== "paid";
  const rawNotes = (entry.notes || "").trim();
  const hasNotes = rawNotes.length > 0 && rawNotes !== "יובא מהיומן";
  const isPaid = moneyStatus === "paid";
  const isWaiting = moneyStatus === "invoice_sent";
  
  // Check if imported from calendar (show icon next to description)
  const isFromCalendar = Boolean(entry.calendarEventId);

  // Check if this is a draft entry imported from calendar that needs attention
  // Badge shows only if: imported from calendar + still has default amount (0) + unpaid
  const isCalendarDraft =
    entry.calendarEventId &&
    entry.amountGross === 0 &&
    entry.paymentStatus === "unpaid";

  // Amount color based on status
  const getAmountColor = () => {
    if (isPaid) return "text-emerald-600 dark:text-emerald-400";
    if (isWaiting || overdue) return "text-orange-600 dark:text-orange-400";
    return "text-slate-800 dark:text-slate-200";
  };

  return (
    <div
      className={cn(
        // Compact card with clean shadow
        "rounded-xl border bg-white dark:bg-card p-3.5 shadow-sm transition-all active:scale-[0.99] relative overflow-hidden",
        "border-slate-200/80 dark:border-border",
        // Subtle left accent for status
        !isPaid && "border-r-[3px] border-r-orange-300 dark:border-r-orange-700",
        overdue && "border-r-[3px] border-r-red-400 dark:border-r-red-600",
        isPaid && "border-r-[3px] border-r-emerald-400 dark:border-r-emerald-600",
        // Calendar draft background
        isCalendarDraft && !isUnpaidPast && "bg-blue-50/40 dark:bg-blue-900/15"
      )}
      onClick={() => onCardClick(entry)}
    >
      {/* ════════════════════════════════════════════════════════════════════════
          MAIN CONTENT AREA - Stacked Layout
          Top: Description (with status badge, calendar icon, etc.)
          Middle: Client name
          Bottom: Date (right, smaller) | Amount (left)
          ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col gap-1.5">

        {/* TOP ROW: Status pill + Description */}
        <div className="flex items-start gap-2">
          {/* Split Status Pill - Compact with icons only on mobile */}
          <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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

            {/* Overdue badge */}
            {overdue && (
              <Badge className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 border-0 dark:bg-red-900/40 dark:text-red-200 animate-pulse">
                מאחר
              </Badge>
            )}
          </div>

          {/* Description with calendar icon if imported */}
          <div className="flex items-start gap-1.5 flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug line-clamp-2 flex-1">
              {entry.description}
            </p>
            {isFromCalendar && (
              <CalendarDays
                className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5"
                aria-label="יובא מהיומן"
              />
            )}
            {isCalendarDraft && (
              <Badge className="text-[8px] px-1 py-0 font-medium border-0 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 flex-shrink-0">
                טיוטה
              </Badge>
            )}
          </div>
        </div>

        {/* MIDDLE ROW: Client + Category + Notes indicator */}
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span className="font-medium truncate max-w-[180px]">{entry.clientName}</span>
          {(entry.categoryData || entry.category) && (
            <>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <CategoryChip category={entry.categoryData} legacyCategory={entry.category} size="sm" withIcon={true} />
            </>
          )}
          {hasNotes && (
            <StickyNote className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
          )}
        </div>

        {/* BOTTOM ROW: Date (right) | Amount (left) */}
        <div className="flex items-center justify-between mt-1">
          {/* Date - smaller */}
          <span className="text-xs text-slate-500 dark:text-slate-400 font-numbers">
            {formatDate(entry.date)}
          </span>

          {/* Amount */}
          <span
            className={cn(
              "text-lg font-medium font-numbers whitespace-nowrap",
              getAmountColor()
            )}
            dir="ltr"
          >
            ₪ {entry.amountGross.toLocaleString("he-IL")}
          </span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          ACTIONS ROW - Larger touch targets for mobile
          ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-border">
        {/* Quick action buttons - larger touch targets */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            disabled={displayStatus === "שולם"}
            className={cn(
              // Larger touch target: h-9 with more padding
              "h-9 px-3 text-xs font-medium rounded-lg",
              displayStatus === "שולם"
                ? "text-slate-400"
                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 active:bg-emerald-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsPaid(entry.id);
            }}
          >
            <Check className="h-4 w-4 ml-1.5" />
            שולם
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={displayStatus === "נשלחה" || displayStatus === "שולם"}
            className={cn(
              // Larger touch target
              "h-9 px-3 text-xs font-medium rounded-lg",
              displayStatus === "נשלחה" || displayStatus === "שולם"
                ? "text-slate-400"
                : "text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 active:bg-blue-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onMarkInvoiceSent(entry.id);
            }}
          >
            <FileText className="h-4 w-4 ml-1.5" />
            חשבונית
          </Button>
        </div>

        {/* More actions menu - larger trigger */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              // Larger touch target: h-10 w-10
              className="h-10 w-10 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-muted/50 rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          {/* Larger menu items for easier tapping */}
          <DropdownMenuContent
            align="end"
            className="w-44 p-1 text-right"
            style={{ direction: "rtl" }}
          >
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(entry);
              }}
              className="h-11 text-sm px-3 gap-3 items-center justify-start"
            >
              <Copy className="h-4 w-4" />
              שכפל
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDelete(entry.id);
              }}
              className="h-11 text-sm px-3 gap-3 items-center justify-start text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
              מחק
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

