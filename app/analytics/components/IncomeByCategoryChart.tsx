"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { CategoryDataPoint, MetricType } from "../types";
import { formatCurrency } from "@/app/income/utils";

interface IncomeByCategoryChartProps {
  data: CategoryDataPoint[];
  metricType: MetricType;
}

// Color palette for categories
const COLORS = [
  "hsl(var(--primary))",
  "hsl(222 47% 25%)", // Darker primary variant
  "hsl(210 40% 60%)", // Medium blue
  "hsl(222 47% 45%)", // Another primary variant
  "hsl(215 16% 65%)", // Lighter variant
  "hsl(var(--muted-foreground))", // For "Other"
];

export function IncomeByCategoryChart({ data, metricType }: IncomeByCategoryChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>הכנסות לפי קטגוריה</CardTitle>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>הכנסות לפי קטגוריה</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) =>
                metricType === "amount" ? `₪${value.toLocaleString("he-IL")}` : value
              }
            />
            <YAxis
              type="category"
              dataKey="categoryName"
              tick={{ fontSize: 12 }}
              width={90}
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
            <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
