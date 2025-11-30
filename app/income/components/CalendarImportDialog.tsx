"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarDays, Loader2 } from "lucide-react";
import { MONTH_NAMES } from "../utils";

interface CalendarImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (year: number, month: number) => Promise<void>;
  defaultYear: number;
  defaultMonth: number;
}

export function CalendarImportDialog({
  isOpen,
  onClose,
  onImport,
  defaultYear,
  defaultMonth,
}: CalendarImportDialogProps) {
  const [selectedYear, setSelectedYear] = React.useState(defaultYear);
  const [selectedMonth, setSelectedMonth] = React.useState(defaultMonth);
  const [isImporting, setIsImporting] = React.useState(false);

  // Reset to defaults when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedYear(defaultYear);
      setSelectedMonth(defaultMonth);
    }
  }, [isOpen, defaultYear, defaultMonth]);

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await onImport(selectedYear, selectedMonth);
      onClose();
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-500" />
            ייבוא מהיומן
          </DialogTitle>
          <DialogDescription>
            בחר חודש לייבוא אירועים מיומן Google
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 py-4">
          {/* Month Selector */}
          <div className="flex-1">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              חודש
            </label>
            <Select
              value={selectedMonth.toString()}
              onValueChange={(v) => setSelectedMonth(parseInt(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MONTH_NAMES).map(([value, name]) => (
                  <SelectItem key={value} value={value}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Selector */}
          <div className="w-[100px]">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
              שנה
            </label>
            <Select
              value={selectedYear.toString()}
              onValueChange={(v) => setSelectedYear(parseInt(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isImporting}>
            ביטול
          </Button>
          <Button onClick={handleImport} disabled={isImporting}>
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                מייבא...
              </>
            ) : (
              <>
                <CalendarDays className="h-4 w-4 ml-2" />
                ייבא אירועים
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

