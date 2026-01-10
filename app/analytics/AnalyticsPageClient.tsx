"use client";

import { useState, useMemo } from "react";
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
}

export default function AnalyticsPageClient({ initialEntries }: AnalyticsPageClientProps) {
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("specific-month");
  const [metricType, setMetricType] = useState<MetricType>("amount");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
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
    <div
      className="min-h-screen paper-texture print:bg-white"
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-28 space-y-3 sm:space-y-4 md:space-y-6 md:pb-8">
        {/* Header with filters */}
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

        {/* KPI Cards */}
        <AnalyticsKPICards kpi={analyticsData.kpi} />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <IncomeOverTimeChart data={analyticsData.timeSeriesData} metricType={metricType} />
          <IncomeByCategoryChart data={analyticsData.categoryData} metricType={metricType} />
        </div>

        {/* Needs Attention Table */}
        <NeedsAttentionTable jobs={analyticsData.needsAttentionJobs} />
      </div>
    </div>
  );
}
