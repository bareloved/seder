"use client";

import * as React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatCurrency, Currency, getDisplayStatus } from "../../utils";
import { IncomeEntry } from "../../types";

interface IncomeTableTotalsProps {
  entries: IncomeEntry[];
}

export function IncomeTableTotals({ entries }: IncomeTableTotalsProps) {
  // Calculate totals for visible entries
  const totals = React.useMemo(() => {
    const totalGross = entries.reduce((acc, e) => Currency.add(acc, e.amountGross), 0);
    const totalPaid = entries
      .filter((e) => getDisplayStatus(e) === "שולם")
      .reduce((acc, e) => Currency.add(acc, e.amountPaid), 0);
    const totalPending = entries
      .filter((e) => getDisplayStatus(e) !== "שולם")
      .reduce((acc, e) => Currency.add(acc, e.amountGross), 0);
    return { totalGross, totalPaid, totalPending };
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <TableRow className="bg-slate-100/70 dark:bg-slate-800/70 border-t-2 border-slate-200 dark:border-slate-700 hover:bg-slate-100/70 dark:hover:bg-slate-800/70">
      <TableCell className="py-4 font-bold text-sm text-slate-700 dark:text-slate-300">
        סה״כ
      </TableCell>
      <TableCell className="py-4 font-bold text-sm text-slate-700 dark:text-slate-300">
        {entries.length} עבודות
      </TableCell>
      <TableCell className="py-4 tabular-nums">
        <div className="flex flex-col gap-0.5">
          <span
            className="text-sm font-bold text-slate-800 dark:text-slate-200"
            dir="ltr"
          >
            {formatCurrency(totals.totalGross)}
          </span>
          {totals.totalPending > 0 && (
            <span
              className="text-xs font-medium text-amber-600 dark:text-amber-400"
              dir="ltr"
            >
              {formatCurrency(totals.totalPending)} ממתין
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-4" />
      <TableCell className="py-4">
        <span
          className="text-xs font-medium text-emerald-600 dark:text-emerald-400"
          dir="ltr"
        >
          {formatCurrency(totals.totalPaid)} התקבל
        </span>
      </TableCell>
      <TableCell className="py-4 print:hidden" />
    </TableRow>
  );
}
