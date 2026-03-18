"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Phone,
  DollarSign,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClientWithAnalytics } from "../types";

interface ClientEntry {
  id: string;
  date: string;
  description: string;
  amountGross: string | number;
  invoiceStatus: string;
  paymentStatus: string;
}

interface ClientDetailPanelProps {
  client: ClientWithAnalytics;
}

const statusLabels: Record<string, { label: string; bg: string; text: string }> = {
  paid: { label: "שולם", bg: "bg-emerald-50 dark:bg-emerald-900/30", text: "text-emerald-600 dark:text-emerald-400" },
  sent: { label: "נשלח", bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
  draft: { label: "טיוטה", bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-500 dark:text-slate-400" },
};

function getStatusDisplay(invoiceStatus: string, paymentStatus: string) {
  if (paymentStatus === "paid") return statusLabels.paid;
  if (invoiceStatus === "sent") return statusLabels.sent;
  return statusLabels.draft;
}

export function ClientDetailPanel({ client }: ClientDetailPanelProps) {
  const [showAllTime, setShowAllTime] = useState(false);
  const [entries, setEntries] = useState<ClientEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  // Fetch recent entries when client changes
  useEffect(() => {
    let cancelled = false;
    setEntries([]);
    setEntriesLoading(true);

    fetch(`/api/v1/income?clientId=${client.id}`, { credentials: "same-origin" })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) {
          setEntries(json.data ?? []);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setEntriesLoading(false);
      });

    return () => { cancelled = true; };
  }, [client.id]);

  // Stats grid items — this year by default
  const statsGrid = [
    { label: "החודש", value: formatCurrency(client.thisMonthRevenue) },
    { label: "השנה", value: formatCurrency(client.thisYearRevenue) },
    { label: "עבודות השנה", value: String(client.thisYearJobCount) },
    { label: "ממוצע לעבודה", value: formatCurrency(client.averagePerJob) },
    { label: "מהכנסות השנה", value: `${client.incomePercentage}%` },
    ...(client.outstandingAmount > 0
      ? [{ label: "ממתין לתשלום", value: formatCurrency(client.outstandingAmount), isWarning: true }]
      : []),
  ];

  const allTimeStats = [
    { label: "סה״כ כל הזמנים", value: formatCurrency(client.totalEarned) },
    { label: "סה״כ עבודות", value: String(client.jobCount) },
    ...(client.avgDaysToPayment !== null
      ? [{ label: "זמן תשלום ממוצע", value: `\u200F${Math.round(client.avgDaysToPayment)} ימים` }]
      : []),
    ...(client.latePaymentRate > 0
      ? [{ label: "אחוז איחורים", value: `${client.latePaymentRate}%`, isWarning: true }]
      : []),
  ];

  const trendIcon = client.activityTrend === "up" ? "↑" : client.activityTrend === "down" ? "↓" : "→";
  const trendColor = client.activityTrend === "up"
    ? "text-emerald-600"
    : client.activityTrend === "down"
      ? "text-red-500"
      : "text-slate-400";

  return (
    <div className="space-y-4">
      {/* Header — name + contact */}
      <div className="pb-3 border-b border-slate-200/60 dark:border-border">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <span className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
              {client.name.charAt(0)}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {client.name}
            </h2>
            {client.paymentHealth !== "good" && (
              <span className={cn(
                "inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded",
                client.paymentHealth === "warning"
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {client.paymentHealth === "warning" ? "לתשומת לב" : "בעייתי"}
              </span>
            )}
          </div>
        </div>

        {/* Contact buttons */}
        <div className="flex items-center gap-2 mt-3">
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Phone className="h-3 w-3" />
              חייג
            </a>
          )}
          {client.email && (
            <a
              href={`mailto:${client.email}`}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/30 transition-colors"
            >
              <Mail className="h-3 w-3" />
              אימייל
            </a>
          )}
          {client.defaultRate && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <DollarSign className="h-3 w-3" />
              תעריף: {formatCurrency(parseFloat(client.defaultRate))}
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid — 2 columns like iOS */}
      <div className="grid grid-cols-2 gap-2">
        {statsGrid.map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-50/80 dark:bg-muted/30 rounded-lg p-3 text-center"
          >
            <p className={cn(
              "text-xl font-semibold font-numbers",
              (stat as { isWarning?: boolean }).isWarning
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-900 dark:text-white"
            )}>
              {stat.value}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Last active */}
      {client.lastActiveMonths !== null && (
        <div className="text-center">
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            {client.lastActiveMonths === 0 ? "החודש" : client.lastActiveMonths === 1 ? "לפני חודש" : `לפני ${client.lastActiveMonths} חודשים`}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">עבודה אחרונה</p>
        </div>
      )}

      {/* All-time toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAllTime(!showAllTime)}
        className="w-full h-8 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 gap-1"
      >
        {showAllTime ? "הסתר נתוני כל הזמנים" : "הצג נתוני כל הזמנים"}
        {showAllTime ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {showAllTime && (
        <div className="grid grid-cols-2 gap-2">
          {allTimeStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-slate-50/80 dark:bg-muted/30 rounded-lg p-3 text-center"
            >
              <p className={cn(
                "text-xl font-semibold font-numbers",
                (stat as { isWarning?: boolean }).isWarning
                  ? "text-red-500 dark:text-red-400"
                  : "text-slate-900 dark:text-white"
              )}>
                {stat.value}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Jobs */}
      <div className="pt-3 border-t border-slate-200/60 dark:border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            עבודות אחרונות
          </h3>
          {client.activityTrend && (
            <span className={cn("text-xs flex items-center gap-1", trendColor)}>
              <span>{trendIcon}</span>
              {client.activityTrend === "up" ? "יותר עבודות לאחרונה" : client.activityTrend === "down" ? "פחות עבודות לאחרונה" : "יציב"}
            </span>
          )}
        </div>

        {entriesLoading ? (
          <div className="flex items-center justify-center py-6">
            <div className="relative">
              <div className="w-6 h-6 rounded-full border-2 border-slate-200 dark:border-border" />
              <div className="absolute top-0 left-0 w-6 h-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            </div>
          </div>
        ) : entries.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">אין עבודות</p>
        ) : (
          <div className="space-y-1.5">
            {entries.map((entry) => {
              const status = getStatusDisplay(entry.invoiceStatus, entry.paymentStatus);
              const amount = typeof entry.amountGross === "string" ? parseFloat(entry.amountGross) : entry.amountGross;
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 py-1.5 text-sm"
                >
                  <span className="text-xs text-slate-400 font-numbers w-[38px] shrink-0" dir="ltr">
                    {formatDate(entry.date)}
                  </span>
                  <span className="flex-1 truncate text-slate-700 dark:text-slate-300">
                    {entry.description}
                  </span>
                  <span className="font-numbers text-sm font-medium text-slate-800 dark:text-slate-100 shrink-0" dir="ltr">
                    ₪{amount.toLocaleString("he-IL")}
                  </span>
                  <span className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0",
                    status.bg,
                    status.text
                  )}>
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes */}
      {client.notes && (
        <div className="pt-3 border-t border-slate-200/60 dark:border-border">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-2">
            <FileText className="h-3.5 w-3.5" />
            הערות
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50/80 dark:bg-muted/30 rounded-lg p-3">
            {client.notes}
          </p>
        </div>
      )}
    </div>
  );
}
