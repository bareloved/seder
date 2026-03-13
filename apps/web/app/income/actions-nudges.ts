"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { dismissNudge } from "@/lib/nudges/queries";
import { revalidatePath } from "next/cache";

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function dismissNudgeAction(
  nudgeType: string,
  entryId: string | null,
  periodKey: string | null
) {
  const userId = await requireUserId();
  await dismissNudge(userId, nudgeType, entryId, periodKey, null);
  revalidatePath("/income");
}

export async function snoozeNudgeAction(
  nudgeType: string,
  entryId: string | null,
  periodKey: string | null
) {
  const userId = await requireUserId();
  const snoozeUntil = new Date();
  snoozeUntil.setDate(snoozeUntil.getDate() + 3);
  await dismissNudge(userId, nudgeType, entryId, periodKey, snoozeUntil);
  revalidatePath("/income");
}
