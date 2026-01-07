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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">הכנסה כוללת</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(kpi.totalIncome)}</div>
          <p className="text-xs text-muted-foreground mt-1">סך כל ההכנסות בתקופה</p>
        </CardContent>
      </Card>

      {/* Jobs Count */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">עבודות</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpi.jobsCount}</div>
          <p className="text-xs text-muted-foreground mt-1">מספר עבודות בתקופה</p>
        </CardContent>
      </Card>

      {/* Unpaid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ממתין לתשלום</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(kpi.unpaidAmount)}</div>
          <p className="text-xs text-muted-foreground mt-1">סכום שטרם שולם</p>
        </CardContent>
      </Card>
    </div>
  );
}
