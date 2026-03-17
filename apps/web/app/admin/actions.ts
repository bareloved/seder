"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { feedback, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email";

const ADMIN_EMAIL = "bareloved@gmail.com";

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session || session.user.email !== ADMIN_EMAIL) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function fetchSentryHealth(): Promise<{
  errorCount24h: number;
  status: "green" | "amber" | "red";
}> {
  await requireAdmin();

  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;
  const token = process.env.SENTRY_AUTH_TOKEN;

  if (!org || !project || !token) {
    return { errorCount24h: -1, status: "green" };
  }

  try {
    const res = await fetch(
      `https://de.sentry.io/api/0/projects/${org}/${project}/issues/?query=is:unresolved&statsPeriod=24h&limit=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      return { errorCount24h: -1, status: "green" };
    }

    const totalHits = parseInt(res.headers.get("X-Hits") || "0", 10);
    const issues = await res.json();
    const count = totalHits || issues.length;

    return {
      errorCount24h: count,
      status: count === 0 ? "green" : count <= 5 ? "amber" : "red",
    };
  } catch {
    return { errorCount24h: -1, status: "green" };
  }
}

export async function triggerBackup() {
  await requireAdmin();

  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3001";
  const res = await fetch(`${baseUrl}/api/cron/backup`, {
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET || ""}`,
    },
  });

  if (!res.ok) {
    throw new Error("Backup failed");
  }

  return await res.json();
}

export async function markFeedbackAsRead(feedbackId: string) {
  await requireAdmin();
  await db
    .update(feedback)
    .set({ status: "read" })
    .where(eq(feedback.id, feedbackId));
}

export async function markFeedbackAsUnread(feedbackId: string) {
  await requireAdmin();
  await db
    .update(feedback)
    .set({ status: "unread" })
    .where(eq(feedback.id, feedbackId));
}

export async function deleteFeedback(feedbackId: string) {
  await requireAdmin();
  await db.delete(feedback).where(eq(feedback.id, feedbackId));
}

export async function markFeedbackAsDone(feedbackId: string) {
  await requireAdmin();
  await db
    .update(feedback)
    .set({ status: "read" })
    .where(eq(feedback.id, feedbackId));
}

export async function replyToFeedback(feedbackId: string, reply: string) {
  await requireAdmin();

  if (!reply || reply.trim().length === 0) {
    throw new Error("Reply cannot be empty");
  }

  // Get the feedback and user info
  const [fb] = await db
    .select({
      userId: feedback.userId,
      message: feedback.message,
      platform: feedback.platform,
      userEmail: user.email,
      userName: user.name,
    })
    .from(feedback)
    .leftJoin(user, eq(feedback.userId, user.id))
    .where(eq(feedback.id, feedbackId));

  if (!fb || !fb.userEmail) {
    throw new Error("Feedback not found");
  }

  // Update feedback status
  await db
    .update(feedback)
    .set({
      status: "replied",
      adminReply: reply.trim(),
      repliedAt: new Date(),
    })
    .where(eq(feedback.id, feedbackId));

  // Send reply email to user
  const safeReply = reply
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const safeMessage = fb.message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  await sendEmail({
    to: fb.userEmail,
    subject: "תגובה למשוב שלך — סדר",
    html: `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"></head>
<body style="margin: 0; padding: 0; font-family: 'Arial Hebrew', 'Heebo', -apple-system, BlinkMacSystemFont, Arial, sans-serif; background-color: #f4f4f5; direction: rtl;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 400px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #0f172a;">סדר</h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">&#x200F;תגובה למשוב שלך</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 16px; direction: rtl;">
              <p style="margin: 0; font-size: 13px; color: #94a3b8; direction: rtl; unicode-bidi: embed;">&#x200F;ההודעה שלך:</p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #64748b; background: #f8fafc; padding: 12px; border-radius: 8px; white-space: pre-wrap; direction: rtl; unicode-bidi: embed;">${safeMessage}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px; direction: rtl;">
              <p style="margin: 0; font-size: 13px; color: #94a3b8; direction: rtl; unicode-bidi: embed;">&#x200F;התגובה שלנו:</p>
              <p style="margin: 8px 0 0; font-size: 15px; color: #334155; line-height: 1.6; direction: rtl; unicode-bidi: embed;">${safeReply}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center; direction: rtl;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">&#x200F;סדר. כל הזכויות שמורות. © ${new Date().getFullYear()}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    text: `תגובה למשוב שלך — סדר\n\nההודעה שלך:\n${fb.message}\n\nהתגובה שלנו:\n${reply}`,
  });
}
