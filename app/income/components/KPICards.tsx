"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Wallet, FileText, CalendarDays, TrendingUp, TrendingDown } from "lucide-react";
import { KPIData, FilterType } from "../types";
import { formatCurrency, MONTH_NAMES } from "../utils";

interface KPICardsProps {
  kpis: KPIData;
  selectedMonth: number;
  onFilterClick?: (filter: FilterType) => void;
  activeFilter: FilterType;
}

export function KPICards({
  kpis,
  selectedMonth,
  onFilterClick,
  activeFilter,
}: KPICardsProps) {
  const monthName = MONTH_NAMES[selectedMonth];
  const carouselRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const handleScroll = React.useCallback(() => {
    const container = carouselRef.current;
    if (!container) return;

    const containerCenter =
      container.getBoundingClientRect().left + container.getBoundingClientRect().width / 2;

    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    Array.from(container.children).forEach((child, index) => {
      const rect = (child as HTMLElement).getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      const distance = Math.abs(center - containerCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  }, []);

  const scrollToCard = (index: number) => {
    const target = cardRefs.current[index];
    if (target) {
      target.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  };

  React.useEffect(() => {
    handleScroll();
  }, [handleScroll]);

  // Mobile compact KPI chip data
  const mobileKpis = [
    {
      key: "all" as FilterType,
      label: monthName,
      amount: kpis.thisMonth,
      color: "slate",
      badge: `${kpis.thisMonthCount}`,
    },
    {
      key: "ready-to-invoice" as FilterType,
      label: "לשלוח",
      amount: kpis.readyToInvoice,
      color: "sky",
      badge: `${kpis.readyToInvoiceCount}`,
    },
    {
      key: "invoiced" as FilterType,
      label: "ממתין",
      amount: kpis.outstanding,
      color: "orange",
      badge: kpis.overdueCount > 0 ? `${kpis.overdueCount} באיחור` : `${kpis.invoicedCount}`,
      badgeAlert: kpis.overdueCount > 0,
    },
    {
      key: "paid" as FilterType,
      label: "שולם",
      amount: kpis.totalPaid,
      color: "green",
      badge: `${kpis.trend >= 0 ? "+" : ""}${Math.round(kpis.trend)}%`,
    },
  ];

  const colorMap: Record<string, { bg: string; text: string; ring: string; badgeBg: string; badgeText: string }> = {
    orange: { bg: "bg-orange-50", text: "text-orange-600", ring: "ring-orange-500", badgeBg: "bg-orange-100", badgeText: "text-orange-700" },
    sky: { bg: "bg-sky-50", text: "text-sky-600", ring: "ring-sky-500", badgeBg: "bg-sky-100", badgeText: "text-sky-700" },
    green: { bg: "bg-green-50", text: "text-green-600", ring: "ring-green-500", badgeBg: "bg-green-100", badgeText: "text-green-700" },
    slate: { bg: "bg-slate-50", text: "text-slate-700", ring: "ring-slate-500", badgeBg: "bg-slate-100", badgeText: "text-slate-600" },
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════════════
          MOBILE: Larger, more tap-friendly KPI cards
          - Wider cards (min-w-[160px]) for better thumb targeting
          - Taller with more vertical padding (py-5)
          - Larger main number (text-lg) for scannability
          - 2-3 cards visible at once with peek effect
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div
        ref={carouselRef}
        onScroll={handleScroll}
        className="md:hidden flex gap-2.5 overflow-x-auto snap-x snap-mandatory -mx-3 px-3 pb-1 pt-1.5 scrollbar-hide"
      >
        {mobileKpis.map((kpi, index) => {
          const colors = colorMap[kpi.color];
          const isActive = activeFilter === kpi.key;
          return (
            <button
              key={kpi.key}
              ref={(el) => { cardRefs.current[index] = el; }}
              type="button"
              onClick={() => onFilterClick?.(kpi.key)}
              className={cn(
                // Larger touch target: wider min-width + more padding
                "min-w-[150px] flex-shrink-0 snap-center flex flex-col gap-1.5 px-4 py-5 rounded-xl border-2 transition-all active:scale-[0.97]",
                colors.bg,
                isActive 
                  ? `ring-2 ${colors.ring} shadow-md border-transparent` 
                  : "border-slate-200/60 dark:border-slate-700/40"
              )}
            >
              {/* Label row with badge */}
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{kpi.label}</span>
                <Badge
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 font-semibold font-numbers border-0",
                    kpi.badgeAlert ? "bg-red-100 text-red-600 animate-pulse" : `${colors.badgeBg} ${colors.badgeText}`
                  )}
                >
                  {kpi.badge}
                </Badge>
              </div>
              {/* Main amount - larger and dominant */}
              <span className={cn("text-xl font-bold tabular-nums font-numbers leading-tight text-right", colors.text)}>
                {formatCurrency(kpi.amount)}
              </span>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          DESKTOP: Full cards grid (unchanged)
          ═══════════════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-3 lg:grid-cols-4 print:grid print:grid-cols-4">
        {/* KPI 1: Outstanding */}
      <Card
        className={cn(
            "h-full bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm print:shadow-none print:border-slate-200 transition-all cursor-pointer hover:shadow-md active:scale-[0.98] lg:order-3",
          activeFilter === "invoiced" && "ring-2 ring-orange-500 bg-orange-50/50 dark:bg-orange-900/20 shadow-md"
        )}
        onClick={() => onFilterClick?.("invoiced")}
      >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">מחכה לתשלום</CardTitle>
            <div className="h-8 w-8 rounded-full bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-orange-500 dark:text-orange-400" />
          </div>
        </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-orange-500 dark:text-orange-400 tabular-nums font-numbers">
            {formatCurrency(kpis.outstanding)}
          </div>
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">חשבוניות שנשלחו וממתינות לתשלום</span>
              <div className="flex items-center gap-2 flex-wrap">
              {kpis.invoicedCount > 0 && (
                <Badge className="bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-300 border-0 text-[10px] px-1.5 py-0 font-medium font-numbers">
                  {kpis.invoicedCount} חשבוניות
                </Badge>
              )}
              {kpis.overdueCount > 0 && (
                <Badge className="bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300 border-0 text-[10px] px-1.5 py-0 font-medium font-numbers animate-pulse">
                  {kpis.overdueCount} באיחור
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

        {/* KPI 2: Ready to Invoice */}
        <Card
          className={cn(
            "h-full bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm print:shadow-none print:border-slate-200 transition-all cursor-pointer hover:shadow-md active:scale-[0.98] lg:order-2",
            activeFilter === "ready-to-invoice" && "ring-2 ring-sky-500 bg-sky-50/50 dark:bg-sky-900/20 shadow-md"
          )}
          onClick={() => onFilterClick?.("ready-to-invoice")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">לשלוח חשבונית</CardTitle>
            <div className="h-8 w-8 rounded-full bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
              <FileText className="h-4 w-4 text-sky-500 dark:text-sky-400" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-sky-500 dark:text-sky-400 tabular-nums font-numbers">
              {formatCurrency(kpis.readyToInvoice)}
            </div>
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">עבודות שבוצעו ועדיין לא נשלחה חשבונית</span>
              <Badge className="bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-300 border-0 text-[10px] px-1.5 py-0 font-medium w-fit font-numbers">
                {kpis.readyToInvoiceCount} עבודות
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Paid This Month */}
      <Card
        className={cn(
            "h-full bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm print:shadow-none print:border-slate-200 transition-all cursor-pointer hover:shadow-md active:scale-[0.98] lg:order-4",
          activeFilter === "paid" && "ring-2 ring-green-500 bg-green-50/50 dark:bg-green-900/20 shadow-md"
        )}
        onClick={() => onFilterClick?.("paid")}
      >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">התקבל החודש</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
            {kpis.trend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
            ) : (
                <TrendingDown className="h-4 w-4 text-red-400" />
            )}
          </div>
        </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-green-500 dark:text-green-400 tabular-nums font-numbers">
            {formatCurrency(kpis.totalPaid)}
          </div>
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">סכומים שהתקבלו בחודש זה</span>
            <Badge
              className={cn(
                  "border-0 text-[10px] px-1.5 py-0 font-medium font-numbers w-fit",
                kpis.trend >= 0
                  ? "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300"
                  : "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-300"
              )}
            >
                מחודש שעבר {kpis.trend >= 0 ? "+" : ""}{Math.round(kpis.trend)}%
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: This Month Total */}
        <Card
          className={cn(
            "h-full bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm print:shadow-none print:border-slate-200 transition-all cursor-pointer hover:shadow-md active:scale-[0.98] lg:order-1",
            activeFilter === "all" && "ring-2 ring-slate-500 bg-slate-50/50 dark:bg-slate-800/50 shadow-md"
          )}
          onClick={() => onFilterClick?.("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">סה״כ {monthName}</CardTitle>
            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <CalendarDays className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums font-numbers">
              {formatCurrency(kpis.thisMonth)}
            </div>
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">סך כל העבודות לחודש זה</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-numbers">
                כולל מע״מ: {formatCurrency(kpis.thisMonth * 1.18)}
              </span>
              <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-0 text-[10px] px-1.5 py-0 font-medium w-fit font-numbers">
                {kpis.thisMonthCount} עבודות
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>

      {/* Pager indicator for mobile carousel */}
      <div className="md:hidden flex justify-center gap-1.5 mt-1">
        {[0, 1, 2, 3].map((index) => (
          <button
            key={index}
            type="button"
            onClick={() => scrollToCard(index)}
            className={cn(
              "h-1.5 w-1.5 rounded-full transition-colors",
              activeIndex === index ? "bg-slate-700" : "bg-slate-300"
            )}
            aria-label={`מעבר לכרטיס ${index + 1}`}
          />
        ))}
      </div>
    </>
  );
}

