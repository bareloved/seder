"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

interface NeedsAttentionTableProps {
  jobs: NeedsAttentionJob[];
}

export function NeedsAttentionTable({ jobs }: NeedsAttentionTableProps) {
  const router = useRouter();

  if (jobs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>דורש טיפול</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            כל העבודות מטופלות! 🎉
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleOpenJob = (jobId: string) => {
    // Navigate to income page (jobs are shown there)
    // In the future, could open a detail dialog or navigate to a specific job view
    router.push(`/income`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>דורש טיפול ({jobs.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile: Card view */}
        <div className="md:hidden space-y-3">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{job.clientName}</p>
                      <p className="text-sm text-muted-foreground">{job.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenJob(job.id)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{formatCurrency(job.amount)}</span>
                    <span className="text-sm text-muted-foreground">{formatDate(job.date)}</span>
                  </div>
                  <Badge variant="outline">{job.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop: Table view */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">לקוח</TableHead>
                <TableHead className="text-right">תיאור</TableHead>
                <TableHead className="text-right">סכום</TableHead>
                <TableHead className="text-right">סטטוס</TableHead>
                <TableHead className="text-right">תאריך</TableHead>
                <TableHead className="text-right w-[80px]">פעולה</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.clientName}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{job.description}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(job.amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{job.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(job.date)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenJob(job.id)}
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
      </CardContent>
    </Card>
  );
}
