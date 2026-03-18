"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { EnhancedMonthTrend, AnalyticsPeriod } from "../types";
import { ExpandableSection } from "./ExpandableSection";
import { formatCurrency } from "@/app/income/utils";

const MONTH_SHORT: Record<number, string> = {
  1: "ינו׳",
  2: "פבר׳",
  3: "מרץ",
  4: "אפר׳",
  5: "מאי",
  6: "יוני",
  7: "יולי",
  8: "אוג׳",
  9: "ספט׳",
  10: "אוק׳",
  11: "נוב׳",
  12: "דצמ׳",
};

const STATUS_COLORS: Record<string, string> = {
  "all-paid": "#22c55e",
  "has-unpaid": "#f59e0b",
  "empty": "#d1d5db",
};

interface IncomeChartSectionProps {
  trends: EnhancedMonthTrend[] | null;
  isLoading: boolean;
  error: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
  period: AnalyticsPeriod;
  onMonthClick?: (month: number, year: number) => void;
}

export function IncomeChartSection({
  trends,
  isLoading,
  error,
  isExpanded,
  onToggle,
  onRetry,
  period,
  onMonthClick,
}: IncomeChartSectionProps) {
  const totalGross = trends?.reduce((sum, t) => sum + t.totalGross, 0) ?? 0;

  const chartData = trends?.map((t) => ({
    ...t,
    label: MONTH_SHORT[t.month] ?? String(t.month),
    fill: STATUS_COLORS[t.status] ?? STATUS_COLORS.empty,
  })) ?? [];

  return (
    <ExpandableSection
      title="הכנסות לאורך זמן"
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={totalGross > 0 ? formatCurrency(totalGross) : undefined}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
          <p className="text-sm">אין נתונים להצגה</p>
        </div>
      ) : (
        <div className="p-3 sm:p-4">
          {/* Legend */}
          <div className="flex items-center gap-3 mb-3 text-[10px] text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS["all-paid"] }} />
              <span>הכל שולם</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STATUS_COLORS["has-unpaid"] }} />
              <span>יש חובות</span>
            </div>
          </div>

          <div dir="ltr">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={{ stroke: "#cbd5e1" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickLine={{ stroke: "#cbd5e1" }}
                  axisLine={{ stroke: "#cbd5e1" }}
                  tickFormatter={(value) => `₪${(value / 1000).toFixed(0)}k`}
                  width={55}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), ""]}
                  labelFormatter={(label) => label}
                  separator=""
                  contentStyle={{
                    direction: "rtl",
                    backgroundColor: "var(--color-card, white)",
                    border: "1px solid var(--color-border, #e2e8f0)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    fontSize: "13px",
                  }}
                />
                <Bar
                  dataKey="totalGross"
                  radius={[4, 4, 0, 0]}
                  cursor={period === "yearly" ? "pointer" : "default"}
                  onClick={(_data, index) => {
                    if (period === "yearly" && onMonthClick && chartData[index]) {
                      onMonthClick(chartData[index].month, chartData[index].year);
                    }
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </ExpandableSection>
  );
}
