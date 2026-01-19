import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getClientsWithAnalytics, findDuplicateClientNames } from "./data";
import { ClientsPageClient } from "./ClientsPageClient";

export default async function ClientsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const [clients, duplicates] = await Promise.all([
    getClientsWithAnalytics(session.user.id),
    findDuplicateClientNames(session.user.id),
  ]);

  return (
    <ClientsPageClient
      initialClients={clients}
      initialDuplicates={duplicates}
      user={session.user}
    />
  );
}
