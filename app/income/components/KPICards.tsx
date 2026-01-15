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
      amountColor: "text-slate-900",
      filter: "all" as FilterType,
      highlight: false,
      iconColor: "text-slate-400",
      iconBg: "bg-slate-50"
    },
    {
      id: "to-invoice",
      title: "לשלוח חשבונית",
      amount: kpis.readyToInvoice,
      icon: FileText,
      amountColor: "text-slate-900",
      filter: "ready-to-invoice" as FilterType,
      highlight: true, // Special blue border
      iconColor: "text-sky-500",
      iconBg: "bg-sky-50"
    },
    {
      id: "waiting",
      title: "מחכה לתשלום",
      amount: kpis.outstanding,
      icon: Wallet,
      amountColor: "text-slate-900",
      filter: "invoiced" as FilterType,
      highlight: false,
      iconColor: "text-orange-400",
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
      {cards.map((card) => {
        const isActive = activeFilter === card.filter;

        return (
          <Card
            key={card.id}
            className={cn(
              "cursor-pointer transition-all shadow-sm hover:shadow-md border-0 relative overflow-hidden",
              card.highlight
                ? "ring-2 ring-sky-400 shadow-sky-100"
                : "bg-white"
            )}
            onClick={() => onFilterClick?.(card.filter)}
          >
            {/* Special highlight background tint if needed */}
            {card.highlight && <div className="absolute inset-0 bg-sky-50/30 pointer-events-none" />}

            <CardContent className="p-5 flex flex-col items-center justify-center relative z-10 h-[100px]">
              <span className="text-sm font-medium text-slate-500 mb-1">
                {card.title}
              </span>
              <div className={cn("text-3xl font-bold font-numbers tracking-tight", card.amountColor)}>
                {formatCurrency(card.amount)}
              </div>

              {/* Icon positioned absolute bottom-left (LTR perspective) or bottom-right? 
                  In the image, the icons are bottom-left relative to the card box.
                  For RTL, bottom-left is the left side. */}
              <div className="absolute bottom-3 left-3">
                {card.hasTrend ? (
                  <TrendingUp className="h-4 w-4 text-[#2ecc71]" />
                ) : (
                  <card.icon className={cn("h-4 w-4 opacity-70", card.iconColor)} />
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
