"use client";

import { cn } from "@/lib/utils";
import { ExpandableSection } from "./ExpandableSection";
import { MiniSparkline } from "./MiniSparkline";
import { formatCurrency } from "@/app/income/utils";
import type { CategoryBreakdownItem, AnalyticsPeriod } from "../types";

interface CategoryBreakdownSectionProps {
  categories: CategoryBreakdownItem[] | null;
  isLoading: boolean;
  error: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
  period: AnalyticsPeriod;
}

export function CategoryBreakdownSection({
  categories,
  isLoading,
  error,
  isExpanded,
  onToggle,
  onRetry,
  period,
}: CategoryBreakdownSectionProps) {
  return (
    <ExpandableSection
      title="לפי קטגוריה"
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={categories && categories.length > 0 ? `${categories.length} קטגוריות` : undefined}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {!categories || categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
          <p className="text-sm">אין נתונים להצגה</p>
        </div>
      ) : (
        <div className="p-3 sm:p-4 space-y-2.5">
          {categories.map((cat, index) => (
            <div key={cat.categoryId ?? `cat-${index}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.categoryColor }}
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {cat.categoryName}
                  </span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {cat.count} עבודות
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {period === "yearly" && cat.monthlyAmounts && (
                    <MiniSparkline data={cat.monthlyAmounts} color={cat.categoryColor} />
                  )}
                  <span className="text-sm font-semibold font-numbers text-slate-800 dark:text-slate-100 w-[80px] text-end">
                    {formatCurrency(cat.amount)}
                  </span>
                  <span className="text-[10px] font-numbers text-slate-400 w-[36px] text-end">
                    {cat.percentage}%
                  </span>
                </div>
              </div>
              {/* Percentage bar */}
              <div className="h-1.5 bg-slate-100 dark:bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500")}
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.categoryColor,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </ExpandableSection>
  );
}
