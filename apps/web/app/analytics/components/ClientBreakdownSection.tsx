"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ExpandableSection } from "./ExpandableSection";
import { MiniSparkline } from "./MiniSparkline";
import { formatCurrency } from "@/app/income/utils";
import type { ClientBreakdownItem, AnalyticsPeriod } from "../types";

const COLORS = [
  "#0ea5e9", // Sky blue
  "#22c55e", // Green
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#9ca3af", // Gray (for "Other")
];

interface ClientBreakdownSectionProps {
  clients: ClientBreakdownItem[] | null;
  isLoading: boolean;
  error: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
  period: AnalyticsPeriod;
}

export function ClientBreakdownSection({
  clients,
  isLoading,
  error,
  isExpanded,
  onToggle,
  onRetry,
  period,
}: ClientBreakdownSectionProps) {
  const totalAmount = clients?.reduce((sum, c) => sum + c.amount, 0) ?? 0;

  return (
    <ExpandableSection
      title="לפי לקוח"
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={clients && clients.length > 0 ? `${clients.length} לקוחות` : undefined}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {!clients || clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
          <p className="text-sm">אין נתונים להצגה</p>
        </div>
      ) : (
        <div className="p-3 sm:p-4">
          {/* Donut Chart */}
          <div className="flex justify-center mb-3">
            <div dir="ltr">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={clients}
                    dataKey="amount"
                    nameKey="clientName"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {clients.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), ""]}
                    separator=""
                    contentStyle={{
                      direction: "rtl",
                      backgroundColor: "var(--color-card, white)",
                      border: "1px solid var(--color-border, #e2e8f0)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Center total */}
          <div className="text-center mb-3">
            <p className="text-[10px] text-slate-400">סה״כ</p>
            <p className="text-base font-semibold font-numbers text-slate-800 dark:text-slate-100" dir="ltr">
              <span className="text-xs">₪</span> {totalAmount.toLocaleString("he-IL")}
            </p>
          </div>

          {/* Legend List */}
          <div className="space-y-2">
            {clients.map((client, index) => (
              <div
                key={client.clientName}
                className="flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {client.clientName}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {client.count} עבודות
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {period === "yearly" && client.monthlyAmounts && (
                    <MiniSparkline
                      data={client.monthlyAmounts}
                      color={COLORS[index % COLORS.length]}
                    />
                  )}
                  <span className="text-sm font-semibold font-numbers text-slate-800 dark:text-slate-100 w-[80px] text-end">
                    {formatCurrency(client.amount)}
                  </span>
                  <span className="text-[10px] font-numbers text-slate-400 w-[36px] text-end">
                    {client.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ExpandableSection>
  );
}
