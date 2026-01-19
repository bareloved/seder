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
import { IncomeEntry, DisplayStatus, STATUS_CONFIG } from "../../types";
import {
  formatCurrency,
  formatDate,
  isOverdue,
  getDisplayStatus,
  isPastDate,
  getWeekday,
} from "../../utils";
import { CategoryChip } from "../CategoryChip";

interface MobileIncomeCardProps {
  entry: IncomeEntry;
  onCardClick: (entry: IncomeEntry) => void;
  onStatusChange: (id: string, status: DisplayStatus) => void;
  onMarkAsPaid: (id: string) => void;
  onMarkInvoiceSent: (id: string) => void;
  onDuplicate: (entry: IncomeEntry) => void;
  onDelete: (id: string) => void;
}

export const MobileIncomeCard = React.memo(function MobileIncomeCard({
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
  const isFutureGig = !isPastDate(entry.date);
  const isUnpaidPast = !isFutureGig && entry.paymentStatus !== "paid";
  const rawNotes = (entry.notes || "").trim();
  const hasNotes = rawNotes.length > 0 && rawNotes !== "יובא מהיומן";
  const isPaid = displayStatus === "שולם";
  const isWaiting = displayStatus === "נשלחה";
  
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
          MAIN CONTENT AREA - 3 Column Layout (RTL: Right→Left)
          Right: Date + Status (stacked)
          Center: Description + Client/Category
          Left: Amount (large, vertically centered)
          ════════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-stretch gap-3">
        
        {/* RIGHT COLUMN: Date + Status (stacked) */}
        <div className="flex flex-col items-start gap-1.5 min-w-[65px]">
          {/* Date */}
          <div className="flex flex-col">
            <span className="text-sm font-semibold font-numbers text-slate-700 dark:text-slate-200">
              {formatDate(entry.date)}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {getWeekday(new Date(entry.date))}
            </span>
          </div>
          
          {/* Status Badge - Tappable dropdown */}
          {statusConfig && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  className="focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Badge
                    className={cn(
                      "text-[10px] px-2.5 py-1 rounded-full font-medium border cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap",
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
                align="start"
                className="p-1.5 min-w-[140px]"
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

          {/* Overdue badge */}
          {overdue && (
            <Badge className="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 border-0 dark:bg-red-900/40 dark:text-red-200 animate-pulse">
              מאחר
            </Badge>
          )}
        </div>

        {/* CENTER COLUMN: Description + Client/Category */}
        <div className="flex-1 flex flex-col justify-center min-w-0 gap-1">
          {/* Description with calendar icon if imported */}
          <div className="flex items-start gap-1.5">
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
          
          {/* Client + Category + Notes indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium truncate max-w-[120px]">{entry.clientName}</span>
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
        </div>

        {/* LEFT COLUMN: Amount (large, scannable) */}
        <div className="flex items-center justify-end min-w-[85px]">
          <span
            className={cn(
              "text-2xl font-normal font-numbers whitespace-nowrap",
              getAmountColor()
            )}
            dir="ltr"
          >
            <span className="text-sm">₪</span> {entry.amountGross.toLocaleString("he-IL")}
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

