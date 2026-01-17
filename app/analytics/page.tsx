import { Suspense } from "react";
import { getAnalyticsData } from "./data";
import AnalyticsPageClient from "./AnalyticsPageClient";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasGoogleCalendarConnection } from "@/app/income/data";

// Force dynamic rendering - don't pre-render during build
export const dynamic = "force-dynamic";

// Loading component for Suspense
function AnalyticsPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F2F5] dark:bg-slate-950/50" dir="rtl">
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
async function AnalyticsPageContent({
  userId,
  user,
}: {
  userId: string;
  user: { name: string | null; email: string; image: string | null };
}) {
  // Fetch all data for the current year +/- 3 years (to support client-side filtering)
  const now = new Date();
  const startYear = now.getFullYear() - 3;
  const endYear = now.getFullYear() + 3;
  const startDate = new Date(startYear, 0, 1); // Jan 1st of start year
  const endDate = new Date(endYear, 11, 31); // Dec 31st of end year

  // Fetch analytics data and google connection status in parallel
  const [entries, isGoogleConnected] = await Promise.all([
    getAnalyticsData(userId, startDate, endDate),
    hasGoogleCalendarConnection(userId),
  ]);

  return (
    <AnalyticsPageClient
      initialEntries={entries}
      user={user}
      isGoogleConnected={isGoogleConnected}
    />
  );
}

// Main page component (server component)
export default async function AnalyticsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <AnalyticsPageContent
        userId={session.user.id}
        user={{
          name: session.user.name ?? null,
          email: session.user.email,
          image: session.user.image ?? null,
        }}
      />
    </Suspense>
  );
}
