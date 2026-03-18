"use client";

import { ChevronDown, ChevronLeft, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExpandableSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function ExpandableSection({
  title,
  isExpanded,
  onToggle,
  badge,
  isLoading,
  error,
  onRetry,
  children,
}: ExpandableSectionProps) {
  return (
    <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200/40 dark:border-slate-700/40 overflow-hidden transition-all">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 sm:px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          {!isExpanded && badge && (
            <span className="text-xs text-slate-400 dark:text-slate-500 font-numbers">{badge}</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-slate-400 transition-transform" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-slate-400 transition-transform" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-slate-100 dark:border-border">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-border" />
                  <div className="absolute top-0 left-0 w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                </div>
                <p className="text-xs text-slate-400">טוען...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <p className="text-xs text-red-500">{error}</p>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry();
                  }}
                  className="gap-2 h-8 text-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  נסה שוב
                </Button>
              )}
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}

/** Skeleton placeholder for a section while page is initially loading */
export function SectionSkeleton({ height = "h-[200px]" }: { height?: string }) {
  return (
    <div className={cn(
      "bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200/40 dark:border-slate-700/40 overflow-hidden animate-pulse",
      height
    )}>
      <div className="px-3 sm:px-4 py-3 flex items-center gap-2">
        <div className="h-4 w-28 bg-slate-200 dark:bg-muted rounded" />
      </div>
    </div>
  );
}
