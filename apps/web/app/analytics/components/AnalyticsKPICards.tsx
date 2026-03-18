"use client";

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Briefcase, AlertCircle, Wallet, Receipt, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IncomeAggregates } from "../types";
import { formatCurrency } from "@/app/income/utils";

interface AnalyticsKPICardsProps {
  aggregates: IncomeAggregates | null;
  isLoading: boolean;
}

export function AnalyticsKPICards({ aggregates, isLoading }: AnalyticsKPICardsProps) {
  if (isLoading || !aggregates) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4" dir="rtl">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-white dark:bg-card shadow-sm border border-slate-100 dark:border-border h-[100px] sm:h-[120px] animate-pulse">
            <CardContent className="p-3 sm:p-4 h-full flex flex-col justify-between">
              <div className="h-3 w-20 bg-slate-200 dark:bg-muted rounded" />
              <div className="h-7 w-28 bg-slate-200 dark:bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const trend = aggregates.trend;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;

  const cards = [
    {
      id: "total-gross",
      title: "הכנסה ברוטו",
      amount: aggregates.totalGross,
      icon: TrendingUp,
      amountColor: "text-slate-900 dark:text-slate-100",
      iconColor: "text-slate-400 dark:text-slate-500",
    },
    {
      id: "total-paid",
      title: "שולם",
      amount: aggregates.totalPaid,
      icon: Wallet,
      amountColor: "text-[#059669] dark:text-[#34d399]",
      iconColor: "text-[#059669] dark:text-[#34d399]",
    },
    {
      id: "outstanding",
      title: "ממתין לתשלום",
      amount: aggregates.outstanding,
      icon: AlertCircle,
      amountColor: aggregates.outstanding > 0 ? "text-orange-600" : "text-slate-900 dark:text-slate-100",
      iconColor: "text-orange-400 dark:text-orange-400",
    },
    {
      id: "jobs-count",
      title: "עבודות",
      amount: aggregates.jobsCount,
      icon: Briefcase,
      amountColor: "text-slate-900 dark:text-slate-100",
      iconColor: "text-sky-500 dark:text-sky-400",
      isCount: true,
    },
    {
      id: "vat-total",
      title: "מע״מ",
      amount: aggregates.vatTotal,
      icon: Receipt,
      amountColor: "text-slate-900 dark:text-slate-100",
      iconColor: "text-violet-500 dark:text-violet-400",
    },
    {
      id: "trend",
      title: "מגמה",
      amount: trend,
      icon: TrendIcon,
      amountColor: trend > 0 ? "text-[#059669] dark:text-[#34d399]" : trend < 0 ? "text-red-600" : "text-slate-500",
      iconColor: trend > 0 ? "text-[#059669] dark:text-[#34d399]" : trend < 0 ? "text-red-500" : "text-slate-400",
      isCount: true,
      isTrend: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4" dir="rtl">
      {cards.map((card) => (
        <Card
          key={card.id}
          className="bg-white dark:bg-card shadow-sm hover:shadow-md border border-slate-100 dark:border-border relative overflow-hidden h-[100px] sm:h-[120px] transition-all"
        >
          <CardContent className="p-3 sm:p-4 h-full flex flex-col justify-between">
            {/* Title */}
            <div className="text-right">
              <span className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-normal block">
                {card.title}
              </span>
              {/* Amount */}
              <div
                className={cn(
                  "text-2xl sm:text-[34px] font-normal font-numbers tracking-tight mt-1",
                  card.amountColor
                )}
                dir="ltr"
              >
                {card.isTrend ? (
                  <>{card.amount > 0 ? "+" : ""}{card.amount}%</>
                ) : card.isCount ? (
                  <>{card.amount.toLocaleString("he-IL")}</>
                ) : (
                  <>
                    <span className="text-base sm:text-xl">₪</span>{" "}
                    {card.amount.toLocaleString("he-IL")}
                  </>
                )}
              </div>
            </div>

            {/* Icon - absolute bottom-left (physical left, matching income page) */}
            <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4">
              <card.icon className={cn("h-3 w-3", card.iconColor)} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
