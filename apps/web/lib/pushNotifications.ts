import { db } from "@/db/client";
import { deviceTokens } from "@/db/schema";
import { eq } from "drizzle-orm";

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  const tokens = await db
    .select()
    .from(deviceTokens)
    .where(eq(deviceTokens.userId, userId));

  if (tokens.length === 0) return;

  const messages: PushMessage[] = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data,
  }));

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(messages),
  });
}
