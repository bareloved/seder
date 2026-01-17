"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, Briefcase, AlertCircle } from "lucide-react";
import type { AnalyticsKPI } from "../types";

interface AnalyticsKPICardsProps {
  kpi: AnalyticsKPI;
}

export function AnalyticsKPICards({ kpi }: AnalyticsKPICardsProps) {
  const cards = [
    {
      id: "total-income",
      title: "הכנסה כוללת",
      amount: kpi.totalIncome,
      icon: TrendingUp,
      amountColor: "text-slate-900",
      iconColor: "text-emerald-500",
    },
    {
      id: "jobs-count",
      title: "עבודות",
      amount: kpi.jobsCount,
      icon: Briefcase,
      amountColor: "text-sky-600",
      iconColor: "text-sky-500",
      isCount: true,
    },
    {
      id: "unpaid",
      title: "ממתין לתשלום",
      amount: kpi.unpaidAmount,
      icon: AlertCircle,
      amountColor: "text-orange-600",
      iconColor: "text-orange-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" dir="rtl">
      {cards.map((card) => (
        <Card
          key={card.id}
          className="bg-white shadow-sm hover:shadow-md border border-slate-100 relative overflow-hidden h-[120px] transition-all"
        >
          <CardContent className="p-4 h-full flex flex-col justify-between">
            {/* Top Right: Title */}
            <div className="text-right">
              <span className="text-base text-slate-600 font-normal block">
                {card.title}
              </span>
              {/* Bottom Right: Amount */}
              <div className={cn("text-[34px] font-normal font-numbers tracking-tight mt-1", card.amountColor)} dir="ltr">
                {card.isCount ? (
                  card.amount.toLocaleString("he-IL")
                ) : (
                  <>
                    <span className="text-xl">₪</span> {card.amount.toLocaleString("he-IL")}
                  </>
                )}
              </div>
            </div>

            {/* Bottom Left: Icon */}
            <div className="absolute bottom-4 left-4">
              <card.icon className={cn("h-3 w-3", card.iconColor)} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
