import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "./errors";

export async function requireAuth(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }
  return session.user.id;
}
