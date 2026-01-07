"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { TimeSeriesDataPoint, MetricType } from "../types";
import { formatCurrency } from "@/app/income/utils";

interface IncomeOverTimeChartProps {
  data: TimeSeriesDataPoint[];
  metricType: MetricType;
}

export function IncomeOverTimeChart({ data, metricType }: IncomeOverTimeChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>הכנסות לאורך זמן</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            אין נתונים לתקופה זו
          </div>
        </CardContent>
      </Card>
    );
  }

  const dataKey = metricType === "amount" ? "amount" : "count";
  const yAxisLabel = metricType === "amount" ? "סכום (₪)" : "מספר עבודות";

  return (
    <Card>
      <CardHeader>
        <CardTitle>הכנסות לאורך זמן</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              reversed={true} // RTL support
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) =>
                metricType === "amount" ? `₪${value.toLocaleString("he-IL")}` : value
              }
            />
            <Tooltip
              formatter={(value) =>
                metricType === "amount" && typeof value === "number"
                  ? formatCurrency(value)
                  : value
              }
              labelStyle={{ direction: "rtl" }}
              contentStyle={{ direction: "rtl" }}
            />
            <Bar dataKey={dataKey} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
