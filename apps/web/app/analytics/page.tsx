import AnalyticsPageClient from "./AnalyticsPageClient";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Force dynamic rendering - don't pre-render during build
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <AnalyticsPageClient
      user={{
        name: session.user.name ?? null,
        email: session.user.email,
        image: session.user.image ?? null,
      }}
    />
  );
}
