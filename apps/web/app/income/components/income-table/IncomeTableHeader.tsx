"use client";

import * as React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export type SortColumn = "date" | "description" | "amount" | "client" | "category" | "status";

interface IncomeTableHeaderProps {
  sortColumn: SortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: SortColumn) => void;
}

function SortableHeader({
  column,
  currentColumn,
  direction,
  onSort,
  children,
  className,
}: {
  column: SortColumn;
  currentColumn: SortColumn;
  direction: "asc" | "desc";
  onSort: (column: SortColumn) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const isActive = column === currentColumn;

  return (
    <button
      onClick={() => onSort(column)}
      className={`flex items-center gap-0.5 hover:text-slate-800 dark:hover:text-slate-200 transition-colors ${className || ""}`}
    >
      <span>{children}</span>
      {isActive ? (
        direction === "desc" ? (
          <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUp className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-40" />
      )}
    </button>
  );
}

export function IncomeTableHeader({
  sortColumn,
  sortDirection,
  onSort,
}: IncomeTableHeaderProps) {
  return (
    <TableHeader>
      <TableRow className="bg-slate-50 dark:bg-muted/50 border-b border-slate-200 dark:border-border hover:bg-slate-50 dark:hover:bg-muted/50">
        <TableHead className="w-[50px] text-right text-xs font-medium text-slate-600 dark:text-slate-400 py-3 pr-3">
          <div className="flex items-center justify-end">
            <SortableHeader column="date" currentColumn={sortColumn} direction={sortDirection} onSort={onSort}>
              תאריך
            </SortableHeader>
          </div>
        </TableHead>
        <TableHead className="w-[30%] text-right text-xs font-medium text-slate-600 dark:text-slate-400 py-3 pr-1">
          <SortableHeader column="description" currentColumn={sortColumn} direction={sortDirection} onSort={onSort} className="justify-end">
            תיאור
          </SortableHeader>
        </TableHead>
        <TableHead className="w-[120px] py-3 px-2 text-xs font-medium text-slate-600 dark:text-slate-400">
          <div className="flex justify-end">
            <SortableHeader column="amount" currentColumn={sortColumn} direction={sortDirection} onSort={onSort}>
              סכום
            </SortableHeader>
          </div>
        </TableHead>
        <TableHead className="w-[80px] text-right text-xs font-medium text-slate-600 dark:text-slate-400 py-3">
          <SortableHeader column="client" currentColumn={sortColumn} direction={sortDirection} onSort={onSort} className="justify-end">
            לקוח
          </SortableHeader>
        </TableHead>
        <TableHead className="w-[80px] text-right text-xs font-medium text-slate-600 dark:text-slate-400 py-3">
          <SortableHeader column="category" currentColumn={sortColumn} direction={sortDirection} onSort={onSort} className="justify-end">
            קטגוריה
          </SortableHeader>
        </TableHead>
        <TableHead className="w-[70px] text-right text-xs font-medium text-slate-600 dark:text-slate-400 py-3">
          <SortableHeader column="status" currentColumn={sortColumn} direction={sortDirection} onSort={onSort} className="justify-end">
            סטטוס
          </SortableHeader>
        </TableHead>
        <TableHead className="w-[90px] text-right text-xs font-medium text-slate-600 dark:text-slate-400 py-3 print:hidden">
          פעולות
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}

