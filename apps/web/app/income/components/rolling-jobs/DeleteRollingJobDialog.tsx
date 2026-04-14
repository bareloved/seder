"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { RollingJob } from "@seder/shared";
import { deleteRollingJobAction } from "@/app/rolling-jobs/actions";
import { toast } from "sonner";

interface DeleteRollingJobDialogProps {
  job: RollingJob | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteRollingJobDialog({ job, onClose, onDeleted }: DeleteRollingJobDialogProps) {
  const [deleteFutureDrafts, setDeleteFutureDrafts] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const handleDelete = async () => {
    if (!job) return;
    setBusy(true);
    const res = await deleteRollingJobAction(job.id, { deleteFutureDrafts });
    setBusy(false);
    if (res.success) {
      toast.success("הסדרה נמחקה");
      onDeleted();
    } else {
      toast.error("מחיקה נכשלה");
    }
  };

  return (
    <Dialog open={!!job} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>מחיקת סדרה: {job?.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            הרשומות שכבר קיימות בעבר יישמרו תמיד. בחר מה לעשות ברשומות הטיוטה העתידיות:
          </p>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!deleteFutureDrafts}
                onChange={() => setDeleteFutureDrafts(false)}
              />
              <Label>שמור גם רשומות עתידיות</Label>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={deleteFutureDrafts}
                onChange={() => setDeleteFutureDrafts(true)}
              />
              <Label>מחק רשומות טיוטה עתידיות שלא שולמו</Label>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={busy}>
            {busy ? "מוחק..." : "מחק"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
