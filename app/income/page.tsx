import { Suspense } from "react";
import { getIncomeEntriesForMonth, getIncomeAggregatesForMonth, getUniqueClients, getMonthPaymentStatuses } from "./data";
import IncomePageClient from "./IncomePageClient";

// Force dynamic rendering - don't pre-render during build
// This avoids needing DATABASE_URL at build time
export const dynamic = "force-dynamic";

// Loading component for Suspense
function IncomePageSkeleton() {
  return (
    <div className="min-h-screen paper-texture" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header skeleton */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 px-4 py-3 shadow-sm h-16 animate-pulse" />
        
        {/* KPI cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 rounded-lg h-32 animate-pulse"
            />
          ))}
        </div>

        {/* Table skeleton */}
        <div className="bg-white dark:bg-slate-900 rounded-lg h-96 animate-pulse" />
      </div>
    </div>
  );
}

// Server component for data fetching
async function IncomePageContent({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  // Fetch data in parallel
  const [entries, aggregates, clients, monthStatuses] = await Promise.all([
    getIncomeEntriesForMonth({ year, month }),
    getIncomeAggregatesForMonth({ year, month }),
    getUniqueClients(),
    getMonthPaymentStatuses(year),
  ]);

  return (
    <IncomePageClient
      year={year}
      month={month}
      dbEntries={entries}
      aggregates={aggregates}
      clients={clients}
      monthPaymentStatuses={monthStatuses}
    />
  );
}

// Main page component (server component)
export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  // Await search params (Next.js 15+ requirement)
  const params = await searchParams;
  
  // Get current date for defaults
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  // Parse year and month from search params, with defaults
  const year = params.year ? parseInt(params.year, 10) : currentYear;
  const month = params.month ? parseInt(params.month, 10) : currentMonth;

  // Validate year and month
  const validYear = isNaN(year) || year < 2000 || year > 2100 ? currentYear : year;
  const validMonth = isNaN(month) || month < 1 || month > 12 ? currentMonth : month;

  return (
    <Suspense fallback={<IncomePageSkeleton />}>
      <IncomePageContent year={validYear} month={validMonth} />
    </Suspense>
  );
}
