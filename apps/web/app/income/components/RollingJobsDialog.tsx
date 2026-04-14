"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RollingJobForm } from "./rolling-jobs/RollingJobForm";
import { DeleteRollingJobDialog } from "./rolling-jobs/DeleteRollingJobDialog";
import type { Cadence, RollingJob } from "@seder/shared";
import type { Client, Category } from "@/db/schema";
import { listRollingJobsAction } from "@/app/rolling-jobs/actions";

function normalizeJob(row: {
  id: string;
  userId: string;
  isActive: boolean;
  title: string;
  description: string;
  clientId: string | null;
  clientName: string;
  categoryId: string | null;
  amountGross: string;
  vatRate: string;
  includesVat: boolean;
  defaultInvoiceStatus: string;
  cadence: unknown;
  startDate: string;
  endDate: string | null;
  sourceCalendarRecurringEventId: string | null;
  sourceCalendarId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): RollingJob {
  return {
    id: row.id,
    userId: row.userId,
    isActive: row.isActive,
    title: row.title,
    description: row.description,
    clientId: row.clientId,
    clientName: row.clientName,
    categoryId: row.categoryId,
    amountGross: row.amountGross,
    vatRate: row.vatRate,
    includesVat: row.includesVat,
    defaultInvoiceStatus: row.defaultInvoiceStatus as RollingJob["defaultInvoiceStatus"],
    cadence: row.cadence as Cadence,
    startDate: row.startDate,
    endDate: row.endDate,
    sourceCalendarRecurringEventId: row.sourceCalendarRecurringEventId,
    sourceCalendarId: row.sourceCalendarId,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

interface RollingJobsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Client[];
  categories: Category[];
  initialPrefill?: Partial<RollingJob>;
  initialEditJobId?: string;
}

type Mode =
  | { kind: "loading" }
  | { kind: "create" }
  | { kind: "edit"; job: RollingJob };

export function RollingJobsDialog({
  open,
  onOpenChange,
  clients,
  categories,
  initialPrefill,
  initialEditJobId,
}: RollingJobsDialogProps) {
  const [mode, setMode] = React.useState<Mode>({ kind: "loading" });
  const [deleting, setDeleting] = React.useState<RollingJob | null>(null);

  React.useEffect(() => {
    if (!open) return;

    if (initialPrefill) {
      setMode({ kind: "create" });
      return;
    }

    if (initialEditJobId) {
      setMode({ kind: "loading" });
      listRollingJobsAction().then((res) => {
        if (!res.success) return;
        const jobs = res.jobs.map(normalizeJob);
        const target = jobs.find((j) => j.id === initialEditJobId);
        if (target) {
          setMode({ kind: "edit", job: target });
        } else {
          onOpenChange(false);
        }
      });
      return;
    }

    // Fallback — shouldn't happen in the new flow.
    setMode({ kind: "create" });
  }, [open, initialPrefill, initialEditJobId, onOpenChange]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          dir="rtl"
          className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto font-sans"
        >
          <DialogHeader className="pb-3 border-b border-slate-200 dark:border-border">
            <DialogTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {mode.kind === "loading" && "טוען..."}
              {mode.kind === "create" && "אירוע חוזר חדש"}
              {mode.kind === "edit" && `עריכת סדרה: ${mode.job.title}`}
            </DialogTitle>
          </DialogHeader>

          {mode.kind === "loading" && (
            <p className="text-sm text-slate-400 text-center p-6">טוען...</p>
          )}

          {mode.kind === "create" && (
            <RollingJobForm
              clients={clients}
              categories={categories}
              initial={initialPrefill}
              onSaved={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          )}

          {mode.kind === "edit" && (
            <RollingJobForm
              initial={mode.job}
              clients={clients}
              categories={categories}
              onDelete={() => setDeleting(mode.job)}
              onSaved={() => onOpenChange(false)}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteRollingJobDialog
        job={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => { setDeleting(null); onOpenChange(false); }}
      />
    </>
  );
}
