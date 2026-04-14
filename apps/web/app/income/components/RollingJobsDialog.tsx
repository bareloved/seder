"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { RollingJobList } from "./rolling-jobs/RollingJobList";
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
}

type Mode = { kind: "list" } | { kind: "create" } | { kind: "edit"; job: RollingJob };

export function RollingJobsDialog({ open, onOpenChange, clients, categories, initialPrefill }: RollingJobsDialogProps) {
  const [mode, setMode] = React.useState<Mode>({ kind: "list" });
  const [jobs, setJobs] = React.useState<RollingJob[]>([]);
  const [deleting, setDeleting] = React.useState<RollingJob | null>(null);
  const [loading, setLoading] = React.useState(false);

  const reload = React.useCallback(async () => {
    setLoading(true);
    const res = await listRollingJobsAction();
    setLoading(false);
    if (res.success) setJobs(res.jobs.map(normalizeJob));
  }, []);

  React.useEffect(() => {
    if (open) {
      reload();
      if (initialPrefill) setMode({ kind: "create" });
      else setMode({ kind: "list" });
    }
  }, [open, initialPrefill, reload]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {mode.kind === "list" && "סדרות הכנסה"}
              {mode.kind === "create" && "יצירת סדרה חדשה"}
              {mode.kind === "edit" && `עריכת סדרה: ${mode.job.title}`}
            </DialogTitle>
          </DialogHeader>

          {mode.kind === "list" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setMode({ kind: "create" })}>
                  <Plus className="h-4 w-4 ms-1" />
                  סדרה חדשה
                </Button>
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground text-center p-4">טוען...</p>
              ) : (
                <RollingJobList
                  jobs={jobs}
                  onEdit={(job) => setMode({ kind: "edit", job })}
                  onDelete={(job) => setDeleting(job)}
                  onChanged={reload}
                />
              )}
            </div>
          )}

          {mode.kind === "create" && (
            <RollingJobForm
              clients={clients}
              categories={categories}
              initial={initialPrefill}
              onSaved={() => { setMode({ kind: "list" }); reload(); }}
              onCancel={() => setMode({ kind: "list" })}
            />
          )}

          {mode.kind === "edit" && (
            <RollingJobForm
              initial={mode.job}
              clients={clients}
              categories={categories}
              onSaved={() => { setMode({ kind: "list" }); reload(); }}
              onCancel={() => setMode({ kind: "list" })}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteRollingJobDialog
        job={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={() => { setDeleting(null); reload(); }}
      />
    </>
  );
}
