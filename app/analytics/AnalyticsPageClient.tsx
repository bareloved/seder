"use client";

import { useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import type { IncomeEntry } from "../income/types";
import type { DateRangePreset, MetricType, DateRange } from "./types";
import { AnalyticsHeader } from "./components/AnalyticsHeader";
import { AnalyticsKPICards } from "./components/AnalyticsKPICards";
import { IncomeOverTimeChart } from "./components/IncomeOverTimeChart";
import { IncomeByCategoryChart } from "./components/IncomeByCategoryChart";
import { NeedsAttentionTable } from "./components/NeedsAttentionTable";
import {
  getDateRangeFromPreset,
  groupEntriesByTime,
  groupEntriesByCategory,
  calculateKPIMetrics,
  getNeedsAttentionJobs,
} from "./utils";

interface AnalyticsPageClientProps {
  initialEntries: IncomeEntry[];
  user: { name: string | null; email: string; image: string | null };
  isGoogleConnected: boolean;
}

export default function AnalyticsPageClient({
  initialEntries,
  user,
  isGoogleConnected,
}: AnalyticsPageClientProps) {
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("specific-month");
  const [metricType, setMetricType] = useState<MetricType>("amount");
  const [customRange] = useState<DateRange | undefined>(undefined);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Calculate analytics data from entries
  const analyticsData = useMemo(() => {
    const dateRange = getDateRangeFromPreset(dateRangePreset, customRange, selectedMonth, selectedYear);

    // Filter entries by selected date range
    const filteredEntries = initialEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= dateRange.start && entryDate <= dateRange.end;
    });

    // KPI metrics
    const kpi = calculateKPIMetrics(filteredEntries);

    // Time series data (income over time)
    const timeSeriesData = groupEntriesByTime(filteredEntries, dateRange);

    // Category data (income by category)
    const categoryData = groupEntriesByCategory(filteredEntries);

    // Needs attention jobs
    const needsAttentionJobs = getNeedsAttentionJobs(filteredEntries);

    return {
      kpi,
      timeSeriesData,
      categoryData,
      needsAttentionJobs,
    };
  }, [initialEntries, dateRangePreset, customRange, selectedMonth, selectedYear]);

  return (
    <div className="min-h-screen bg-[#F0F2F5] dark:bg-background pb-20 font-sans" dir="rtl">
      <Navbar user={user} />

      <main className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-8 space-y-6">
        {/* Filters Toolbar */}
        <section className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200/60 dark:border-border overflow-hidden">
          <div className="p-4">
            <AnalyticsHeader
              dateRangePreset={dateRangePreset}
              onDateRangeChange={setDateRangePreset}
              metricType={metricType}
              onMetricTypeChange={setMetricType}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onMonthChange={setSelectedMonth}
              onYearChange={setSelectedYear}
            />
          </div>
        </section>

        {/* KPI Cards */}
        <section>
          <AnalyticsKPICards kpi={analyticsData.kpi} />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <IncomeOverTimeChart data={analyticsData.timeSeriesData} metricType={metricType} />
          <IncomeByCategoryChart data={analyticsData.categoryData} metricType={metricType} />
        </section>

        {/* Needs Attention Table */}
        <section>
          <NeedsAttentionTable jobs={analyticsData.needsAttentionJobs} />
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-400">
        <div className="flex justify-center gap-6 mb-2">
          <a href="#" className="hover:text-slate-600 transition-colors">הצהרת נגישות</a>
          <a href="#" className="hover:text-slate-600 transition-colors">מדיניות פרטיות</a>
          <a href="#" className="hover:text-slate-600 transition-colors">תנאי שימוש</a>
        </div>
        <p>© 2026 סדר - יוצאים לעצמאות</p>
      </footer>
    </div>
  );
}
