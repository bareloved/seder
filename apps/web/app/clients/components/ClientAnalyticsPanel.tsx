"use client";

import * as React from "react";
import {
  TrendingUp,
  Calendar,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  FileText,
  DollarSign,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientWithAnalytics } from "../types";

interface ClientAnalyticsPanelProps {
  client: ClientWithAnalytics | null;
}

export function ClientAnalyticsPanel({ client }: ClientAnalyticsPanelProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!client) {
    return (
      <div className="bg-white dark:bg-muted rounded-xl shadow-sm border border-slate-200 dark:border-border p-6">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>בחר לקוח כדי לראות את הנתונים שלו</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-muted rounded-xl shadow-sm border border-slate-200 dark:border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-border">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {client.name}
        </h2>

        {/* Contact Info */}
        <div className="mt-2 space-y-1">
          {client.email && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Mail className="h-3.5 w-3.5" />
              <a href={`mailto:${client.email}`} className="hover:text-blue-600" dir="ltr">
                {client.email}
              </a>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Phone className="h-3.5 w-3.5" />
              <a href={`tel:${client.phone}`} className="hover:text-blue-600" dir="ltr">
                {client.phone}
              </a>
            </div>
          )}
          {client.defaultRate && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <DollarSign className="h-3.5 w-3.5" />
              <span>תעריף: {formatCurrency(parseFloat(client.defaultRate))}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 space-y-4">
        {/* Total Earned */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <TrendingUp className="h-4 w-4" />
            סה״כ הכנסות
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrency(client.totalEarned)}
          </span>
        </div>

        {/* This Month */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Calendar className="h-4 w-4" />
            החודש
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrency(client.thisMonthRevenue)}
          </span>
        </div>

        {/* This Year */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Calendar className="h-4 w-4" />
            השנה
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrency(client.thisYearRevenue)}
          </span>
        </div>

        <div className="border-t border-slate-100 dark:border-border pt-4" />

        {/* Job Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Briefcase className="h-4 w-4" />
            מספר עבודות
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">
            {client.jobCount}
          </span>
        </div>

        {/* Average Per Job */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <TrendingUp className="h-4 w-4" />
            ממוצע לעבודה
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">
            {formatCurrency(client.averagePerJob)}
          </span>
        </div>

        {/* Avg Days to Payment */}
        {client.avgDaysToPayment !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Clock className="h-4 w-4" />
              זמן תשלום ממוצע
            </div>
            <span className="font-semibold text-slate-900 dark:text-white">
              {Math.round(client.avgDaysToPayment)} ימים
            </span>
          </div>
        )}

        {/* Outstanding & Overdue */}
        {(client.outstandingAmount > 0 || client.overdueInvoices > 0) && (
          <>
            <div className="border-t border-slate-100 dark:border-border pt-4" />

            {client.outstandingAmount > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  ממתין לתשלום
                </div>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {formatCurrency(client.outstandingAmount)}
                </span>
              </div>
            )}

            {client.overdueInvoices > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  חשבוניות באיחור
                </div>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {client.overdueInvoices}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="p-4 border-t border-slate-200 dark:border-border">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
            <FileText className="h-4 w-4" />
            הערות
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {client.notes}
          </p>
        </div>
      )}
    </div>
  );
}
