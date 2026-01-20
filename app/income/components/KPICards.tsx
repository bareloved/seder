"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, FileText, Wallet, Calendar, CheckCircle2 } from "lucide-react";
import { KPIData, FilterType } from "../types";
import { formatCurrency } from "../utils";

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
  const monthName = new Date(0, selectedMonth - 1).toLocaleString('he-IL', { month: 'long' });

  // Order from Right to Left (RTL layout):
  // 1. Total (Rightmost)
  // 2. Ready for Invoice (Blue highlight)
  // 3. Waiting for Payment
  // 4. Received (Leftmost)
  const cards = [
    {
      id: "total",
      title: `סה״כ ${monthName}`,
      amount: kpis.thisMonth,
      icon: Calendar,
      amountColor: "text-slate-900 dark:text-slate-100",
      filter: "all" as FilterType,
      highlight: false,
      iconColor: "text-slate-400 dark:text-slate-500",
      iconBg: "bg-slate-50"
    },
    {
      id: "to-invoice",
      title: "לשלוח חשבונית",
      amount: kpis.readyToInvoice,
      icon: FileText,
      amountColor: "text-slate-900 dark:text-slate-100",
      filter: "ready-to-invoice" as FilterType,
      highlight: false, // Special blue border
      iconColor: "text-sky-500 dark:text-sky-400",
      iconBg: "bg-sky-50"
    },
    {
      id: "waiting",
      title: "מחכה לתשלום",
      amount: kpis.outstanding,
      icon: Wallet,
      amountColor: "text-slate-900 dark:text-slate-100",
      filter: "invoiced" as FilterType,
      highlight: false,
      iconColor: "text-orange-400 dark:text-orange-400",
      iconBg: "bg-orange-50"
    },
    {
      id: "paid",
      title: "התקבל החודש",
      amount: kpis.totalPaid,
      icon: TrendingUp,
      amountColor: "text-[#2ecc71]", // Brand Green
      filter: "paid" as FilterType,
      highlight: false,
      hasTrend: true,
      iconColor: "text-[#2ecc71]",
      iconBg: "bg-emerald-50"
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4" dir="rtl">
      {cards.map((card) => {
        const isActive = activeFilter === card.filter;

        // Define active styles based on filter type
        let activeClass = "";
        if (isActive) {
          switch (card.filter) {
            case "all":
              activeClass = "ring-1 ring-slate-900 dark:ring-slate-400 bg-white dark:bg-card";
              break;
            case "ready-to-invoice":
              activeClass = "ring-1 ring-sky-500 bg-white dark:bg-card";
              break;
            case "invoiced":
              activeClass = "ring-1 ring-orange-500 bg-white dark:bg-card";
              break;
            case "paid":
              activeClass = "ring-1 ring-emerald-500 bg-white dark:bg-card";
              break;
          }
        }

        return (
          <Card
            key={card.id}
            className={cn(
              "cursor-pointer transition-all shadow-sm hover:shadow-md border border-slate-100 dark:border-border relative overflow-hidden h-[100px] sm:h-[120px]",
              isActive ? activeClass : "bg-white dark:bg-card hover:bg-slate-50/50 dark:hover:bg-muted"
            )}
            onClick={() => onFilterClick?.(card.filter)}
          >
            <CardContent className="p-3 sm:p-4 h-full flex flex-col justify-between">
              {/* Top Right: Title */}
              <div className="text-right">
                <span className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-normal block">
                  {card.title}
                </span>
                {/* Bottom Right: Amount */}
                <div className={cn("text-2xl sm:text-[34px] font-normal font-numbers tracking-tight mt-1", card.amountColor)} dir="ltr">
                  <span className="text-base sm:text-xl">₪</span> {card.amount.toLocaleString("he-IL")}
                </div>
              </div>

              {/* Bottom Left: Icon */}
              <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4">
                <card.icon className={cn("h-3 w-3", card.iconColor)} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
