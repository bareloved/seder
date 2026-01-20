"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { IncomeEntry, DisplayStatus, STATUS_CONFIG, DEFAULT_VAT_RATE, VatType } from "../types";
import { getDisplayStatus, getTodayDateString, getWorkStatus, getMoneyStatus } from "../utils";
import { SplitStatusPill } from "./SplitStatusPill";
import { IncomeDetailEdit } from "./income-drawer/IncomeDetailEdit";
import type { Category, Client } from "@/db/schema";

interface IncomeDetailDialogProps {
  entry: IncomeEntry | null;
  categories: Category[];
  clients: Client[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAsPaid: (id: string) => void;
  onMarkInvoiceSent: (id: string) => void;
  onUpdate: (entry: IncomeEntry) => void;
  onAdd: (entry: IncomeEntry & { status?: DisplayStatus; vatType?: VatType }) => void;
  defaultDateForNew?: string;
  initialFocusField?: "description" | "amount" | "clientName";
}

export function IncomeDetailDialog({
  entry,
  categories,
  clients,
  isOpen,
  onClose,
  onMarkAsPaid,
  onMarkInvoiceSent,
  onUpdate,
  onAdd,
  defaultDateForNew,
  initialFocusField,
}: IncomeDetailDialogProps) {
  // If not open, don't render anything (avoids flash of default content)
  if (!isOpen) return null;

  const isNew = !entry;
  
  const effectiveEntry: IncomeEntry = entry || {
    id: "new",
    date: defaultDateForNew || getTodayDateString(),
    description: "",
    clientName: "",
    amountGross: 0,
    amountPaid: 0,
    vatRate: DEFAULT_VAT_RATE,
    includesVat: false,
    invoiceStatus: "draft",
    paymentStatus: "unpaid",
    category: "",
    notes: "",
  };

  const displayStatus = getDisplayStatus(effectiveEntry);
  const statusConfig = displayStatus ? STATUS_CONFIG[displayStatus] : null;
  const workStatus = getWorkStatus(effectiveEntry);
  const moneyStatus = getMoneyStatus(effectiveEntry);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-full sm:max-w-md max-h-[90vh] overflow-y-auto font-sans"
        dir="rtl"
      >
        <DialogHeader className="pb-3 border-b border-slate-200 dark:border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {isNew ? "עבודה חדשה" : "פרטי עבודה"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {isNew ? "הוספת רשומת הכנסה חדשה" : "צפייה ועריכת פרטי הכנסה"}
            </DialogDescription>
            {!isNew && (
              <SplitStatusPill
                workStatus={workStatus}
                moneyStatus={moneyStatus}
                isInteractive={false}
              />
            )}
          </div>
        </DialogHeader>

          <IncomeDetailEdit
            entry={effectiveEntry}
            categories={categories}
            clients={clients}
            onSave={(updatedEntry) => {
              if (isNew) {
                onAdd(updatedEntry);
              } else {
                onUpdate(updatedEntry);
              }
              onClose();
            }}
            onClose={onClose}
            onMarkAsPaid={onMarkAsPaid}
            onMarkInvoiceSent={onMarkInvoiceSent}
            initialFocusField={initialFocusField}
          />
      </DialogContent>
    </Dialog>
  );
}
