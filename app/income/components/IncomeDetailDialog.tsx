"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { IncomeEntry, DisplayStatus, STATUS_CONFIG } from "../types";
import { getDisplayStatus } from "../utils";
import { IncomeDetailEdit } from "./income-drawer/IncomeDetailEdit";

interface IncomeDetailDialogProps {
  entry: IncomeEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsPaid: (id: string) => void;
  onMarkInvoiceSent: (id: string) => void;
  onUpdate: (entry: IncomeEntry) => void;
  onStatusChange: (id: string, status: DisplayStatus) => void;
}

export function IncomeDetailDialog({
  entry,
  isOpen,
  onClose,
  onMarkAsPaid,
  onMarkInvoiceSent,
  onUpdate,
  onStatusChange,
}: IncomeDetailDialogProps) {
  if (!entry) return null;

  const displayStatus = getDisplayStatus(entry);
  const statusConfig = displayStatus ? STATUS_CONFIG[displayStatus] : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader className="pb-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
              פרטי עבודה
            </DialogTitle>
            {statusConfig && (
              <Badge
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full font-medium border",
                  statusConfig.bgClass,
                  statusConfig.textClass,
                  statusConfig.borderClass
                )}
              >
                {statusConfig.label}
              </Badge>
            )}
          </div>
        </DialogHeader>

          <IncomeDetailEdit
            entry={entry}
            onSave={(updatedEntry) => {
              onUpdate(updatedEntry);
            onClose();
            }}
          onClose={onClose}
            onStatusChange={onStatusChange}
            onMarkAsPaid={onMarkAsPaid}
            onMarkInvoiceSent={onMarkInvoiceSent}
          />
      </DialogContent>
    </Dialog>
  );
}
