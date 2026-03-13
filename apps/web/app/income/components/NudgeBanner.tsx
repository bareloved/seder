"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, X, Clock, FileText, Wallet, Calendar, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dismissNudgeAction, snoozeNudgeAction } from "../actions-nudges";
import type { Nudge } from "@/lib/nudges/types";

interface NudgeBannerProps {
  nudges: Nudge[];
}

const nudgeIcon: Record<string, typeof FileText> = {
  uninvoiced: FileText,
  batch_invoice: FileText,
  overdue_payment: Wallet,
  way_overdue: AlertTriangle,
  partial_stale: Wallet,
  unlogged_calendar: Calendar,
  month_end: Clock,
};

const nudgeColor: Record<string, string> = {
  uninvoiced: "text-sky-600 bg-sky-50",
  batch_invoice: "text-sky-600 bg-sky-50",
  overdue_payment: "text-orange-600 bg-orange-50",
  way_overdue: "text-red-600 bg-red-50",
  partial_stale: "text-orange-600 bg-orange-50",
  unlogged_calendar: "text-purple-600 bg-purple-50",
  month_end: "text-amber-600 bg-amber-50",
};

export function NudgeBanner({ nudges }: NudgeBannerProps) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [localDismissed, setLocalDismissed] = useState<Set<string>>(new Set());

  const visibleNudges = nudges.filter((n) => !localDismissed.has(n.id));

  if (visibleNudges.length === 0) return null;

  function handleDismiss(nudge: Nudge) {
    setLocalDismissed((prev) => new Set(prev).add(nudge.id));
    startTransition(() => {
      dismissNudgeAction(nudge.nudgeType, nudge.entryId, nudge.periodKey);
    });
  }

  function handleSnooze(nudge: Nudge) {
    setLocalDismissed((prev) => new Set(prev).add(nudge.id));
    startTransition(() => {
      snoozeNudgeAction(nudge.nudgeType, nudge.entryId, nudge.periodKey);
    });
  }

  return (
    <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl mb-4" dir="rtl">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-start"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span className="font-medium text-amber-900 text-sm">
            {visibleNudges.length} פריטים דורשים טיפול
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-amber-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-amber-600" />
        )}
      </button>

      {/* Expandable list */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {visibleNudges.map((nudge) => {
            const Icon = nudgeIcon[nudge.nudgeType] || FileText;
            const colorClass = nudgeColor[nudge.nudgeType] || "text-slate-600 bg-slate-50";

            return (
              <div
                key={nudge.id}
                className="flex items-center gap-3 bg-white rounded-lg p-3 border border-slate-100"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">
                    {nudge.title}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {nudge.description}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 px-2 text-slate-400 hover:text-slate-600"
                    onClick={() => handleSnooze(nudge)}
                    disabled={isPending}
                  >
                    <Clock className="w-3 h-3 me-1" />
                    אח״כ
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7 w-7 p-0 text-slate-400 hover:text-slate-600"
                    onClick={() => handleDismiss(nudge)}
                    disabled={isPending}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
