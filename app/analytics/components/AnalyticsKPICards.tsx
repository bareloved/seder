"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/app/income/utils";
import type { AnalyticsKPI } from "../types";
import { TrendingUp, Briefcase, AlertCircle } from "lucide-react";

interface AnalyticsKPICardsProps {
  kpi: AnalyticsKPI;
}

export function AnalyticsKPICards({ kpi }: AnalyticsKPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Total Income */}
      <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">הכנסה כוללת</CardTitle>
          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums font-numbers">
            {formatCurrency(kpi.totalIncome)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">סך כל ההכנסות בתקופה</p>
        </CardContent>
      </Card>

      {/* Jobs Count */}
      <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-medium text-sky-600 dark:text-sky-400">עבודות</CardTitle>
          <div className="h-8 w-8 rounded-full bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
            <Briefcase className="h-4 w-4 text-sky-500 dark:text-sky-400" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold text-sky-500 dark:text-sky-400 tabular-nums font-numbers">
            {kpi.jobsCount}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">מספר עבודות בתקופה</p>
        </CardContent>
      </Card>

      {/* Unpaid */}
      <Card className="bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4">
          <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">ממתין לתשלום</CardTitle>
          <div className="h-8 w-8 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
            <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-400" />
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-2xl font-bold text-orange-500 dark:text-orange-400 tabular-nums font-numbers">
            {formatCurrency(kpi.unpaidAmount)}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">סכום שטרם שולם</p>
        </CardContent>
      </Card>
    </div>
  );
}
