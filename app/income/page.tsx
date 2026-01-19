import { Suspense } from "react";
import { getIncomeEntriesForMonth, getIncomeAggregatesForMonth, getUniqueClients, getMonthPaymentStatuses, hasGoogleCalendarConnection } from "./data";
import { getUserCategories } from "@/app/categories/data";
import { getUserClients } from "@/app/clients/data";
import IncomePageClient from "./IncomePageClient";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Force dynamic rendering - don't pre-render during build
// This avoids needing DATABASE_URL at build time
export const dynamic = "force-dynamic";

// Loading component for Suspense
// Loading component for Suspense
function IncomePageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950" dir="rtl">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-slate-200 dark:border-slate-800" />
          <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">טוען נתונים...</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">אנא המתן רגע</p>
        </div>
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
  const [entries, aggregates, clientNames, clientRecords, categories, monthStatuses, isGoogleConnected] = await Promise.all([
    getIncomeEntriesForMonth({ year, month, userId, limit, offset }),
    getIncomeAggregatesForMonth({ year, month, userId }),
    getUniqueClients(userId),
    getUserClients(userId),
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
      clients={clientNames}
      clientRecords={clientRecords}
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
