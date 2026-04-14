"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play, Pencil, Trash2, Repeat } from "lucide-react";
import type { RollingJob } from "@seder/shared";
import { pauseRollingJobAction, resumeRollingJobAction } from "@/app/rolling-jobs/actions";
import { toast } from "sonner";

interface RollingJobListProps {
  jobs: RollingJob[];
  onEdit: (job: RollingJob) => void;
  onDelete: (job: RollingJob) => void;
  onChanged: () => void;
}

function formatCadence(job: RollingJob): string {
  const c = job.cadence;
  if (c.kind === "daily") return `כל ${c.interval === 1 ? "יום" : `${c.interval} ימים`}`;
  if (c.kind === "weekly") {
    const names = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
    const days = c.weekdays.map((d) => names[d]).join(", ");
    return c.interval === 1 ? `שבועי: ${days}` : `כל ${c.interval} שבועות: ${days}`;
  }
  return `חודשי ביום ${c.dayOfMonth}${c.interval > 1 ? ` (כל ${c.interval} חודשים)` : ""}`;
}

export function RollingJobList({ jobs, onEdit, onDelete, onChanged }: RollingJobListProps) {
  const togglePause = async (job: RollingJob) => {
    const res = job.isActive
      ? await pauseRollingJobAction(job.id)
      : await resumeRollingJobAction(job.id);
    if (res.success) {
      toast.success(job.isActive ? "הסדרה הושהתה" : "הסדרה חודשה");
      onChanged();
    } else {
      toast.error("פעולה נכשלה");
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-10 px-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
          <Repeat className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
          אין סדרות
        </p>
        <p className="text-xs text-slate-400 mt-1">
          צור סדרה חדשה כדי לעקוב אחר הכנסות חוזרות
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2" dir="rtl">
      {jobs.map((job) => (
        <li
          key={job.id}
          className={`bg-slate-50 dark:bg-slate-800/40 rounded-lg p-3 flex items-center gap-3 transition-opacity ${
            job.isActive ? "" : "opacity-60"
          }`}
        >
          <div className="h-8 w-8 shrink-0 rounded-full bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center">
            <Repeat className="h-4 w-4 text-[#2ecc71]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                {job.title}
              </span>
              {!job.isActive && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  מושהה
                </span>
              )}
              {job.sourceCalendarRecurringEventId && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
                  יומן
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {formatCadence(job)} · ₪{job.amountGross} · {job.clientName}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => togglePause(job)}
              title={job.isActive ? "השהה" : "חדש"}
              className="h-8 w-8 text-slate-500 hover:text-slate-700"
            >
              {job.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onEdit(job)}
              title="ערוך"
              className="h-8 w-8 text-slate-500 hover:text-slate-700"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onDelete(job)}
              title="מחק"
              className="h-8 w-8 text-slate-500 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
