"use client";

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
      <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200/60 dark:border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-border">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">הכנסות לאורך זמן</h3>
        </div>
        <div className="h-[300px] flex items-center justify-center text-slate-500 dark:text-slate-400">
          אין נתונים לתקופה זו
        </div>
      </div>
    );
  }

  const dataKey = metricType === "amount" ? "amount" : "count";

  return (
    <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200/60 dark:border-border overflow-hidden transition-all hover:shadow-md">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-border">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">הכנסות לאורך זמן</h3>
      </div>
      <div className="p-4">
        {/* Wrap in LTR to prevent RTL interference with chart coordinates */}
        <div dir="ltr">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 10, right: 20, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={{ stroke: "#cbd5e1" }}
                axisLine={{ stroke: "#cbd5e1" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={{ stroke: "#cbd5e1" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickFormatter={(value) =>
                  metricType === "amount" ? `₪${value.toLocaleString("he-IL")}` : value
                }
                width={60}
              />
              <Tooltip
                formatter={(value) => [
                  metricType === "amount" && typeof value === "number"
                    ? formatCurrency(value)
                    : value,
                  ""
                ]}
                separator=""
                labelStyle={{ direction: "rtl", color: "#334155" }}
                contentStyle={{
                  direction: "rtl",
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                }}
              />
              <Bar
                dataKey={dataKey}
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
