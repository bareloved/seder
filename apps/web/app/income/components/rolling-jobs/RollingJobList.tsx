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
      <p className="text-sm text-muted-foreground p-4 text-center">
        אין סדרות. לחץ "יצירת סדרה חדשה" כדי להתחיל.
      </p>
    );
  }

  return (
    <ul className="space-y-2" dir="rtl">
      {jobs.map((job) => (
        <li
          key={job.id}
          className={`rounded border p-3 flex items-center gap-3 ${
            job.isActive ? "" : "opacity-60"
          }`}
        >
          <Repeat className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{job.title}</span>
              {!job.isActive && (
                <span className="text-xs rounded bg-muted px-1.5 py-0.5">מושהה</span>
              )}
              {job.sourceCalendarRecurringEventId && (
                <span className="text-xs rounded bg-muted px-1.5 py-0.5">מקושר ליומן</span>
              )}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {formatCadence(job)} · ₪{job.amountGross} · {job.clientName}
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={() => togglePause(job)} title={job.isActive ? "השהה" : "חדש"}>
            {job.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(job)} title="ערוך">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(job)} title="מחק">
            <Trash2 className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
