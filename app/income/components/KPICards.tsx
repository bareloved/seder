"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Wallet,
  FileText,
  CalendarDays,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { KPIData, FilterType } from "../types";
import { formatCurrency, MONTH_NAMES } from "../utils";

interface KPICardsProps {
  kpis: KPIData;
  selectedMonth: number;
  onFilterClick?: (filter: FilterType) => void;
  activeFilter: FilterType;
}

export function KPICards({
  kpis,
  selectedMonth,
  onFilterClick,
  activeFilter,
}: KPICardsProps) {
  const monthName = MONTH_NAMES[selectedMonth];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 print:grid-cols-4">
      {/* This Month Total */}
      <Card
        className={cn(
          "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm print:shadow-none print:border-slate-200 transition-all cursor-pointer hover:shadow-md active:scale-[0.98]",
          activeFilter === "all" && "ring-2 ring-slate-400"
        )}
        onClick={() => onFilterClick?.("all")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 pt-3 sm:pt-4 px-3 sm:px-4">
          <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
            סה״כ {monthName}
          </CardTitle>
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
            <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-400" />
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
            {formatCurrency(kpis.thisMonth)}
          </div>
          <div className="flex flex-col gap-0.5 sm:gap-1 mt-1">
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
              כולל מע״מ: {formatCurrency(kpis.thisMonth * 1.18)}
            </span>
            <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-0 text-[10px] px-1.5 py-0 font-medium w-fit">
              {kpis.thisMonthCount} עבודות
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Ready to Invoice - לשלוח חשבונית */}
      <Card
        className={cn(
          "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm print:shadow-none print:border-slate-200 transition-all cursor-pointer hover:shadow-md active:scale-[0.98]",
          activeFilter === "ready-to-invoice" && "ring-2 ring-sky-400"
        )}
        onClick={() => onFilterClick?.("ready-to-invoice")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 pt-3 sm:pt-4 px-3 sm:px-4">
          <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
            לשלוח חשבונית
          </CardTitle>
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
            <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-500 dark:text-sky-400" />
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="text-xl sm:text-2xl font-bold text-sky-500 dark:text-sky-400 tabular-nums">
            {formatCurrency(kpis.readyToInvoice)}
          </div>
          <div className="flex flex-col gap-0.5 sm:gap-1 mt-1">
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
              עוד לא נשלחה חשבונית
            </span>
            <Badge className="bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-300 border-0 text-[10px] px-1.5 py-0 font-medium w-fit">
              {kpis.readyToInvoiceCount} עבודות
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding - מחכה לתשלום */}
      <Card
        className={cn(
          "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm print:shadow-none print:border-slate-200 transition-all cursor-pointer hover:shadow-md active:scale-[0.98]",
          activeFilter === "invoiced" && "ring-2 ring-orange-400"
        )}
        onClick={() => onFilterClick?.("invoiced")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 pt-3 sm:pt-4 px-3 sm:px-4">
          <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
            מחכה לתשלום
          </CardTitle>
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
            <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500 dark:text-orange-400" />
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="text-xl sm:text-2xl font-bold text-orange-500 dark:text-orange-400 tabular-nums">
            {formatCurrency(kpis.outstanding)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
              חשבוניות שנשלחו וממתינות לתשלום
            </span>
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 sm:hidden">
              ממתינות לתשלום
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
            {kpis.invoicedCount > 0 && (
              <Badge className="bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300 border-0 text-[10px] px-1.5 py-0 font-medium">
                {kpis.invoicedCount} חשבוניות
              </Badge>
            )}
            {kpis.overdueCount > 0 && (
              <Badge className="bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300 border-0 text-[10px] px-1.5 py-0 font-medium">
                {kpis.overdueCount} באיחור
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Paid This Month + Trend */}
      <Card
        className={cn(
          "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm print:shadow-none print:border-slate-200 transition-all cursor-pointer hover:shadow-md active:scale-[0.98]",
          activeFilter === "paid" && "ring-2 ring-green-400"
        )}
        onClick={() => onFilterClick?.("paid")}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 sm:pb-2 pt-3 sm:pt-4 px-3 sm:px-4">
          <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
            התקבל החודש
          </CardTitle>
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center shrink-0">
            {kpis.trend >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 dark:text-green-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-400" />
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
          <div className="text-xl sm:text-2xl font-bold text-green-500 dark:text-green-400 tabular-nums">
            {formatCurrency(kpis.totalPaid)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              className={cn(
                "border-0 text-[10px] px-1.5 py-0 font-medium",
                kpis.trend >= 0
                  ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300"
                  : "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300"
              )}
            >
              מחודש שעבר {kpis.trend >= 0 ? "+" : ""}
              {Math.round(kpis.trend)}%
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

