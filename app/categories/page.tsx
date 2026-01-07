import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAllUserCategories } from "./data";
import { CategoryManager } from "./components";
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// Loading component
function CategoryPageSkeleton() {
  return (
    <div className="min-h-screen paper-texture" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </div>
    </div>
  );
}

// Server component for data fetching
async function CategoryPageContent({ userId }: { userId: string }) {
  const categories = await getAllUserCategories(userId);

  return (
    <div className="min-h-screen paper-texture" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Back link */}
        <Link
          href="/income"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה להכנסות
        </Link>

        {/* Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <CategoryManager initialCategories={categories} />
        </div>
      </div>
    </div>
  );
}

// Main page component
export default async function CategoriesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <CategoryPageContent userId={session.user.id} />
    </Suspense>
  );
}
