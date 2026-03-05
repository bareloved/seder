"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NeedsAttentionJob } from "../types";
import { formatCurrency, formatDate } from "@/app/income/utils";
import { ExternalLink, PartyPopper } from "lucide-react";
import { useRouter } from "next/navigation";

interface NeedsAttentionTableProps {
  jobs: NeedsAttentionJob[];
}

export function NeedsAttentionTable({ jobs }: NeedsAttentionTableProps) {
  const router = useRouter();

  if (jobs.length === 0) {
    return (
      <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200/60 dark:border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-border">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">דורש טיפול</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400">
          <PartyPopper className="h-8 w-8 mb-3 text-emerald-500" />
          <p className="font-medium">כל העבודות מטופלות!</p>
        </div>
      </div>
    );
  }

  const handleOpenJob = () => {
    router.push(`/income`);
  };

  return (
    <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-slate-200/60 dark:border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-border">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">
          דורש טיפול <span className="text-slate-500 font-normal">({jobs.length})</span>
        </h3>
      </div>

      {/* Mobile: Card view */}
      <div className="md:hidden p-4 space-y-3">
        {jobs.map((job) => (
          <div
            key={job.id}
            className="bg-slate-50 dark:bg-muted/50 rounded-lg p-4 border border-slate-100 dark:border-border"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{job.clientName}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{job.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleOpenJob}
                  className="shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-100 font-numbers">
                  {formatCurrency(job.amount)}
                </span>
                <span className="text-sm text-slate-500 dark:text-slate-400 font-numbers">
                  {formatDate(job.date)}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">{job.status}</Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-right text-slate-600 dark:text-slate-400 font-medium">לקוח</TableHead>
              <TableHead className="text-right text-slate-600 dark:text-slate-400 font-medium">תיאור</TableHead>
              <TableHead className="text-right text-slate-600 dark:text-slate-400 font-medium">סכום</TableHead>
              <TableHead className="text-right text-slate-600 dark:text-slate-400 font-medium">סטטוס</TableHead>
              <TableHead className="text-right text-slate-600 dark:text-slate-400 font-medium">תאריך</TableHead>
              <TableHead className="text-right text-slate-600 dark:text-slate-400 font-medium w-[80px]">פעולה</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job) => (
              <TableRow key={job.id} className="hover:bg-slate-50 dark:hover:bg-muted/50">
                <TableCell className="font-medium text-slate-800 dark:text-slate-100">{job.clientName}</TableCell>
                <TableCell className="max-w-[200px] truncate text-slate-600 dark:text-slate-300">{job.description}</TableCell>
                <TableCell className="font-semibold text-slate-800 dark:text-slate-100 font-numbers">{formatCurrency(job.amount)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{job.status}</Badge>
                </TableCell>
                <TableCell className="text-slate-500 dark:text-slate-400 font-numbers">{formatDate(job.date)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenJob}
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  >
                    <ExternalLink className="h-4 w-4 ml-1" />
                    פתח
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
