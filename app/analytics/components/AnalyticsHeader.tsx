"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { DateRangePreset, MetricType } from "../types";
import { formatDateRangeLabel } from "../utils";

interface AnalyticsHeaderProps {
  dateRangePreset: DateRangePreset;
  onDateRangeChange: (preset: DateRangePreset) => void;
  metricType: MetricType;
  onMetricTypeChange: (metric: MetricType) => void;
}

export function AnalyticsHeader({
  dateRangePreset,
  onDateRangeChange,
  metricType,
  onMetricTypeChange,
}: AnalyticsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Title Row with Back Button */}
      <div className="flex items-center gap-3">
        <Link href="/income">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">אנליטיקה</h1>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">תקופה:</span>
          <Select
            value={dateRangePreset}
            onValueChange={(value) => onDateRangeChange(value as DateRangePreset)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">החודש</SelectItem>
              <SelectItem value="last-3-months">3 חודשים אחרונים</SelectItem>
              <SelectItem value="this-year">השנה</SelectItem>
              {/* Custom date range can be added later */}
            </SelectContent>
          </Select>
        </div>

        {/* Metric Toggle */}
        <div className="flex items-center gap-2 mr-auto">
          <span className="text-sm text-muted-foreground">מדד:</span>
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <Button
              variant={metricType === "amount" ? "default" : "outline"}
              size="sm"
              onClick={() => onMetricTypeChange("amount")}
              className="rounded-l-md rounded-r-none"
            >
              סכום
            </Button>
            <Button
              variant={metricType === "count" ? "default" : "outline"}
              size="sm"
              onClick={() => onMetricTypeChange("count")}
              className="rounded-r-md rounded-l-none"
            >
              מספר עבודות
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
