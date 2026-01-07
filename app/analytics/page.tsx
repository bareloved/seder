import { Suspense } from "react";
import { getAnalyticsData } from "./data";
import AnalyticsPageClient from "./AnalyticsPageClient";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDateRangeFromPreset } from "./utils";

// Force dynamic rendering - don't pre-render during build
export const dynamic = "force-dynamic";

// Loading component for Suspense
function AnalyticsPageSkeleton() {
  return (
    <div className="min-h-screen" dir="rtl">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        {/* Header skeleton */}
        <div className="h-16 bg-muted rounded-lg animate-pulse" />

        {/* KPI cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[400px] bg-muted rounded-lg animate-pulse" />
          <div className="h-[400px] bg-muted rounded-lg animate-pulse" />
        </div>

        {/* Table skeleton */}
        <div className="h-96 bg-muted rounded-lg animate-pulse" />
      </div>
    </div>
  );
}

// Server component for data fetching
async function AnalyticsPageContent({ userId }: { userId: string }) {
  // Fetch all data for the current year (to support client-side filtering)
  // This keeps V1 simple - no need to refetch on date range change
  const dateRange = getDateRangeFromPreset("this-year");

  // Fetch analytics data
  const entries = await getAnalyticsData(userId, dateRange.start, dateRange.end);

  return <AnalyticsPageClient initialEntries={entries} />;
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
      <AnalyticsPageContent userId={session.user.id} />
    </Suspense>
  );
}
