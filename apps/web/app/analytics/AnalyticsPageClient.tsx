"use client";

import { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { AnalyticsPeriod } from "./types";
import { useAnalyticsData } from "./hooks/useAnalyticsData";
import { useSectionState } from "./hooks/useSectionState";
import { AnalyticsHeader } from "./components/AnalyticsHeader";
import { AnalyticsKPICards } from "./components/AnalyticsKPICards";
import { IncomeChartSection } from "./components/IncomeChartSection";
import { InvoiceTrackingSection } from "./components/InvoiceTrackingSection";
import { CategoryBreakdownSection } from "./components/CategoryBreakdownSection";
import { ClientBreakdownSection } from "./components/ClientBreakdownSection";
import { VATSummarySection } from "./components/VATSummarySection";

interface AnalyticsPageClientProps {
  user: { name: string | null; email: string; image: string | null };
}

export default function AnalyticsPageClient({ user }: AnalyticsPageClientProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState<AnalyticsPeriod>("monthly");

  const data = useAnalyticsData(selectedMonth, selectedYear, period);
  const { isSectionExpanded, toggleSection } = useSectionState();

  // When user clicks a bar in yearly chart, drill down to that month
  const handleMonthClick = useCallback((month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setPeriod("monthly");
  }, []);

  // Check if we have ANY data (aggregates loaded with at least one job)
  const hasData = data.aggregates.data && data.aggregates.data.jobsCount > 0;
  const isInitialLoad = data.isLoading && !data.aggregates.data;

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background pb-24 md:pb-20 font-sans" dir="rtl">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-2 sm:px-12 lg:px-20 py-3 sm:py-8 space-y-2 sm:space-y-3">
        {/* Header / Filters */}
        <section className="p-2 sm:p-3 rounded-xl bg-white dark:bg-card shadow-sm border border-slate-200/40 dark:border-slate-700/40">
          <div>
            <AnalyticsHeader
              period={period}
              onPeriodChange={setPeriod}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
          </div>
        </section>

        {/* Empty State */}
        {!isInitialLoad && !hasData && !data.aggregates.error ? (
          <section className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200/40 dark:border-slate-700/40 overflow-hidden">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-muted flex items-center justify-center mb-4">
                <BarChart3 className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-2">
                אין נתונים להצגה
              </p>
              <p className="text-gray-500 dark:text-slate-400 mb-6">
                הוסיפו הכנסות כדי לראות את הניתוחים
              </p>
              <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white h-10 px-4">
                <Link href="/income">עבור לדף הכנסות</Link>
              </Button>
            </div>
          </section>
        ) : (
          <>
            {/* KPI Cards */}
            <section>
              <AnalyticsKPICards
                aggregates={data.aggregates.data}
                isLoading={data.aggregates.isLoading}
              />
            </section>

            {/* Income Chart */}
            <section>
              <IncomeChartSection
                trends={data.trends.data}
                isLoading={data.trends.isLoading}
                error={data.trends.error}
                isExpanded={isSectionExpanded("incomeChart")}
                onToggle={() => toggleSection("incomeChart")}
                onRetry={() => data.retrySection("incomeChart")}
                period={period}
                onMonthClick={handleMonthClick}
              />
            </section>

            {/* Invoice Tracking (monthly only) */}
            {period === "monthly" && (
              <section>
                <InvoiceTrackingSection
                  attention={data.attention.data}
                  isLoading={data.attention.isLoading}
                  error={data.attention.error}
                  isExpanded={isSectionExpanded("invoiceTracking")}
                  onToggle={() => toggleSection("invoiceTracking")}
                  onRetry={() => data.retrySection("invoiceTracking")}
                />
              </section>
            )}

            {/* Category Breakdown */}
            <section>
              <CategoryBreakdownSection
                categories={data.categories.data}
                isLoading={data.categories.isLoading}
                error={data.categories.error}
                isExpanded={isSectionExpanded("categoryBreakdown")}
                onToggle={() => toggleSection("categoryBreakdown")}
                onRetry={() => data.retrySection("categoryBreakdown")}
                period={period}
              />
            </section>

            {/* Client Breakdown */}
            <section>
              <ClientBreakdownSection
                clients={data.clients.data}
                isLoading={data.clients.isLoading}
                error={data.clients.error}
                isExpanded={isSectionExpanded("clientBreakdown")}
                onToggle={() => toggleSection("clientBreakdown")}
                onRetry={() => data.retrySection("clientBreakdown")}
                period={period}
              />
            </section>

            {/* VAT Summary */}
            <section>
              <VATSummarySection
                aggregates={data.aggregates.data}
                isLoading={data.aggregates.isLoading}
                error={data.aggregates.error}
                isExpanded={isSectionExpanded("vatSummary")}
                onToggle={() => toggleSection("vatSummary")}
                onRetry={() => data.retrySection("vatSummary")}
              />
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-400">
        <div className="flex justify-center gap-6 mb-2">
          <Link href="/privacy" className="hover:text-slate-600 transition-colors">מדיניות פרטיות</Link>
          <Link href="/terms" className="hover:text-slate-600 transition-colors">תנאי שימוש</Link>
        </div>
        <p>© 2026 סדר</p>
      </footer>

      <MobileBottomNav />
    </div>
  );
}
