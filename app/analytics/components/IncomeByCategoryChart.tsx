"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { CategoryDataPoint, MetricType } from "../types";
import { formatCurrency } from "@/app/income/utils";

interface IncomeByCategoryChartProps {
  data: CategoryDataPoint[];
  metricType: MetricType;
}

// Vibrant, readable color palette for categories
const COLORS = [
  "#0ea5e9", // Sky blue
  "#22c55e", // Green
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#84cc16", // Lime
];

export function IncomeByCategoryChart({ data, metricType }: IncomeByCategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">הכנסות לפי קטגוריה</h3>
        </div>
        <div className="h-[300px] flex items-center justify-center text-slate-500 dark:text-slate-400">
          אין נתונים לתקופה זו
        </div>
      </div>
    );
  }

  const dataKey = metricType === "amount" ? "amount" : "count";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-800 overflow-hidden transition-all hover:shadow-md">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">הכנסות לפי קטגוריה</h3>
      </div>
      <div className="p-4">
        {/* Wrap in LTR to prevent RTL interference with chart coordinates */}
        <div dir="ltr">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 20, left: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={{ stroke: "#cbd5e1" }}
                axisLine={{ stroke: "#cbd5e1" }}
                tickFormatter={(value) =>
                  metricType === "amount" ? `₪${value.toLocaleString("he-IL")}` : value
                }
              />
              <YAxis
                type="category"
                dataKey="categoryName"
                tick={{ fontSize: 12, fill: "#334155" }}
                tickLine={false}
                axisLine={false}
                width={100}
                orientation="left"
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
              <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
