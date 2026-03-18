"use client";

import { FileText, Send, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ExpandableSection } from "./ExpandableSection";
import { formatCurrency } from "@/app/income/utils";
import type { AttentionResponse } from "../types";
import Link from "next/link";

interface InvoiceTrackingSectionProps {
  attention: AttentionResponse | null;
  isLoading: boolean;
  error: string | null;
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
}

const statusConfig = {
  draft: { label: "טיוטות", icon: FileText, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-800/50", border: "border-slate-200 dark:border-slate-700" },
  sent: { label: "נשלחו", icon: Send, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800" },
  overdue: { label: "באיחור", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800" },
};

export function InvoiceTrackingSection({
  attention,
  isLoading,
  error,
  isExpanded,
  onToggle,
  onRetry,
}: InvoiceTrackingSectionProps) {
  const totalCount = attention
    ? attention.summary.drafts.count + attention.summary.sent.count + attention.summary.overdue.count
    : 0;

  return (
    <ExpandableSection
      title="מעקב חשבוניות"
      isExpanded={isExpanded}
      onToggle={onToggle}
      badge={totalCount > 0 ? `${totalCount} פריטים` : undefined}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
    >
      {!attention || totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
          <CheckCircle2 className="h-8 w-8 mb-3 text-emerald-500" />
          <p className="font-medium">הכל מטופל!</p>
        </div>
      ) : (
        <div className="p-3 sm:p-4 space-y-3">
          {/* Summary Counters */}
          <div className="grid grid-cols-3 gap-2">
            {(["draft", "sent", "overdue"] as const).map((key) => {
              const bucket = key === "draft" ? attention.summary.drafts : key === "sent" ? attention.summary.sent : attention.summary.overdue;
              const config = statusConfig[key];
              const Icon = config.icon;
              return (
                <div
                  key={key}
                  className={cn(
                    "rounded-lg border p-2.5 text-center",
                    config.bg,
                    config.border
                  )}
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Icon className={cn("h-3 w-3", config.color)} />
                    <span className={cn("text-[10px] font-medium", config.color)}>
                      {config.label}
                    </span>
                  </div>
                  <p className={cn("text-base font-semibold font-numbers", config.color)}>
                    {bucket.count}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-numbers">
                    {formatCurrency(bucket.amount)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Items List */}
          {attention.items.length > 0 && (
            <div className="space-y-2">
              {attention.items.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-slate-50/70 dark:bg-muted/30 border border-slate-100 dark:border-border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {item.clientName || "ללא לקוח"}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1.5 py-0 shrink-0",
                          item.status === "draft" && "border-slate-300 text-slate-500",
                          item.status === "sent" && "border-orange-300 text-orange-600",
                          item.status === "overdue" && "border-red-300 text-red-600"
                        )}
                      >
                        {statusConfig[item.status].label}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold font-numbers text-slate-700 dark:text-slate-200">
                      {formatCurrency(item.amountGross)}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <Link href="/income">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </ExpandableSection>
  );
}
