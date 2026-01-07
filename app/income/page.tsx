import { Suspense } from "react";
import { getIncomeEntriesForMonth, getIncomeAggregatesForMonth, getUniqueClients, getMonthPaymentStatuses, hasGoogleCalendarConnection } from "./data";
import { getUserCategories } from "@/app/categories/data";
import IncomePageClient from "./IncomePageClient";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
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
  userId,
  user,
  limit,
  offset,
}: {
  year: number;
  month: number;
  userId: string;
  user: { name: string | null; email: string; image: string | null };
  limit?: number;
  offset?: number;
}) {
  // Fetch data in parallel
  const [entries, aggregates, clients, categories, monthStatuses, isGoogleConnected] = await Promise.all([
    getIncomeEntriesForMonth({ year, month, userId, limit, offset }),
    getIncomeAggregatesForMonth({ year, month, userId }),
    getUniqueClients(userId),
    getUserCategories(userId),
    getMonthPaymentStatuses(year, userId),
    hasGoogleCalendarConnection(userId),
  ]);

  return (
    <IncomePageClient
      year={year}
      month={month}
      dbEntries={entries}
      aggregates={aggregates}
      clients={clients}
      categories={categories}
      monthPaymentStatuses={monthStatuses}
      isGoogleConnected={isGoogleConnected}
      user={user}
    />
  );
}

// Main page component (server component)
export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{
    year?: string;
    month?: string;
    page?: string;
  }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  // Await search params (Next.js 15+ requirement)
  const params = await searchParams;

  // Get current date for defaults
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed

  // Parse year and month from search params, with defaults
  const year = params.year ? parseInt(params.year, 10) : currentYear;
  const month = params.month ? parseInt(params.month, 10) : currentMonth;
  const pageParam = params.page ? parseInt(params.page, 10) : 1;

  // Validate year and month
  const validYear = isNaN(year) || year < 2000 || year > 2100 ? currentYear : year;
  const validMonth = isNaN(month) || month < 1 || month > 12 ? currentMonth : month;
  const page = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;
  const pageSize = 500; // keep current behaviour (effectively first page)
  const offset = (page - 1) * pageSize;

  return (
    <Suspense fallback={<IncomePageSkeleton />}>
      <IncomePageContent
        year={validYear}
        month={validMonth}
        userId={session.user.id}
        user={{
          name: session.user.name ?? null,
          email: session.user.email,
          image: session.user.image ?? null,
        }}
        limit={pageSize}
        offset={offset}
      />
    </Suspense>
  );
}
