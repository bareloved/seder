import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import ConsentInterstitialClient from "./ConsentInterstitialClient";

export const dynamic = "force-dynamic";

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; from?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/sign-in");
  }
  const params = await searchParams;
  return (
    <Suspense>
      <ConsentInterstitialClient
        nextPath={params.next ?? "/income"}
        cameFromOAuth={params.from === "oauth"}
      />
    </Suspense>
  );
}
