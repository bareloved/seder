import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "./errors";

export async function requireAuth(): Promise<string> {
  const headersList = await headers();

  // Check for service token (for external app access)
  const authHeader = headersList.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const serviceToken = process.env.SEDER_API_TOKEN;
    const serviceUserId = process.env.SEDER_API_USER_ID;
    if (serviceToken && serviceUserId && token === serviceToken) {
      return serviceUserId;
    }
  }

  // Fall back to session auth (web/iOS apps)
  const session = await auth.api.getSession({ headers: headersList });
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session.user.id;
}
