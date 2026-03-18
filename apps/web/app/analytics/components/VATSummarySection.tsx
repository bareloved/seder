"use client";

import { DEFAULT_VAT_RATE } from "@seder/shared";
import { ExpandableSection } from "./ExpandableSection";
import { formatCurrency } from "@/app/income/utils";
import type { IncomeAggregates } from "../types";

interface VATSummarySectionProps {
  aggregates: IncomeAggregates | null;
  isLoading: boolean;
  error: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
}

export function VATSummarySection({
  aggregates,
  isLoading,
  error,
  isExpanded,
  onToggle,
  onRetry,
}: VATSummarySectionProps) {
  const vatTotal = aggregates?.vatTotal ?? 0;
  const netAfterVat = aggregates ? aggregates.totalGross - aggregates.vatTotal : 0;

  return (
    <ExpandableSection
      title="סיכום מע״מ"
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={vatTotal > 0 ? formatCurrency(vatTotal) : undefined}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {!aggregates ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
          <p className="text-sm">אין נתונים להצגה</p>
        </div>
      ) : (
        <div className="p-3 sm:p-4">
          <div className="space-y-0">
            {/* Gross Income */}
            <div className="flex items-center justify-between py-2.5">
              <span className="text-sm text-slate-600 dark:text-slate-300">
                הכנסה ברוטו
              </span>
              <span className="text-sm font-semibold font-numbers text-slate-800 dark:text-slate-100" dir="ltr">
                {formatCurrency(aggregates.totalGross)}
              </span>
            </div>

            {/* VAT */}
            <div className="flex items-center justify-between py-2.5 border-t border-slate-100 dark:border-border">
              <span className="text-sm text-slate-600 dark:text-slate-300">
                מע״מ ({DEFAULT_VAT_RATE}%)
              </span>
              <span className="text-sm font-semibold font-numbers text-red-500" dir="ltr">
                −{formatCurrency(vatTotal)}
              </span>
            </div>

            {/* Net After VAT */}
            <div className="flex items-center justify-between py-2.5 border-t-2 border-slate-200 dark:border-border">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                נטו אחרי מע״מ
              </span>
              <span className="text-base font-semibold font-numbers text-[#059669] dark:text-[#34d399]" dir="ltr">
                <span className="text-xs">₪</span> {netAfterVat.toLocaleString("he-IL")}
              </span>
            </div>
          </div>
        </div>
      )}
    </ExpandableSection>
  );
}
