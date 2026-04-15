"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db, withAdminBypass } from "@/db/client";
import { feedback, user, siteConfig, session, account, categories, clients, incomeEntries, userSettings, deviceTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail, escapeHtml } from "@/lib/email";
import { isAdminEmail } from "@/lib/admin";

async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session || !isAdminEmail(session.user.email)) {
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

  if (!process.env.CRON_SECRET) {
    throw new Error("CRON_SECRET is not configured");
  }

  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3001";
  const res = await fetch(`${baseUrl}/api/cron/backup`, {
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
      "x-manual-trigger": "true",
    },
  });

  if (!res.ok) {
    throw new Error("Backup failed");
  }

  return await res.json();
}

export async function getAutoBackupEnabled(): Promise<boolean> {
  await requireAdmin();
  const [config] = await db
    .select({ value: siteConfig.value })
    .from(siteConfig)
    .where(eq(siteConfig.key, "auto_backup_enabled"));
  return config?.value === "true";
}

export async function setAutoBackupEnabled(enabled: boolean) {
  await requireAdmin();
  await db
    .insert(siteConfig)
    .values({ key: "auto_backup_enabled", value: String(enabled), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: siteConfig.key,
      set: { value: String(enabled), updatedAt: new Date() },
    });
}


// ===== USER MANAGEMENT =====

export async function verifyUserEmail(userId: string) {
  await requireAdmin();
  await db
    .update(user)
    .set({ emailVerified: true })
    .where(eq(user.id, userId));
}

export async function deleteUser(userId: string) {
  await requireAdmin();

  // Prevent self-deletion
  const adminSession = await auth.api.getSession({
    headers: await headers(),
  });
  if (adminSession?.user.id === userId) {
    throw new Error("Cannot delete your own account");
  }

  // Delete from tables without cascade (order matters for FK constraints)
  await withAdminBypass(async (tx) => {
    await tx.delete(incomeEntries).where(eq(incomeEntries.userId, userId));
    await tx.delete(categories).where(eq(categories.userId, userId));
    await tx.delete(clients).where(eq(clients.userId, userId));
    await tx.delete(userSettings).where(eq(userSettings.userId, userId));
    await tx.delete(session).where(eq(session.userId, userId));
    await tx.delete(account).where(eq(account.userId, userId));
    // Tables with onDelete cascade (feedback, deviceTokens, dismissedNudges) will auto-delete
    await tx.delete(user).where(eq(user.id, userId));
  });
}

// ===== FEEDBACK MANAGEMENT =====

export async function deleteFeedback(feedbackId: string) {
  await requireAdmin();
  await withAdminBypass(async (tx) => {
    await tx.delete(feedback).where(eq(feedback.id, feedbackId));
  });
}

export async function setFeedbackStatus(feedbackId: string, status: "unread" | "read" | "in_progress" | "done" | "replied") {
  await requireAdmin();
  await withAdminBypass(async (tx) => {
    await tx
      .update(feedback)
      .set({ status })
      .where(eq(feedback.id, feedbackId));
  });
}

export async function replyToFeedback(feedbackId: string, reply: string) {
  await requireAdmin();

  if (!reply || reply.trim().length === 0) {
    throw new Error("Reply cannot be empty");
  }

  // Get the feedback and user info
  const fb = await withAdminBypass(async (tx) => {
    const [row] = await tx
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
    return row;
  });

  if (!fb || !fb.userEmail) {
    throw new Error("Feedback not found");
  }

  // Update feedback status
  await withAdminBypass(async (tx) => {
    await tx
      .update(feedback)
      .set({
        status: "replied",
        adminReply: reply.trim(),
        repliedAt: new Date(),
      })
      .where(eq(feedback.id, feedbackId));
  });

  // Send reply email to user
  const safeReply = escapeHtml(reply);
  const safeMessage = escapeHtml(fb.message);

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

const PUSH_PRESETS: Record<string, { title: string; body: string; data: Record<string, unknown> }> = {
  overdue: {
    title: "יש לך חשבונית שלא שולמה מעל 30 יום",
    body: "לקוח לדוגמה - הופעה בבית שמש (₪2,500)",
    data: { type: "nudge", nudgeType: "overdue" },
  },
  weekly_uninvoiced: {
    title: "עבודות ממתינות לחשבונית",
    body: "3 עבודות מהשבוע האחרון עדיין בלי חשבונית",
    data: { type: "nudge", nudgeType: "weekly_uninvoiced" },
  },
  calendar_sync: {
    title: "חודש חדש!",
    body: "יש ביומן עבודות לסנכרן עם סדר?",
    data: { type: "nudge", nudgeType: "calendar_sync" },
  },
  unpaid_check: {
    title: "סוף חודש!",
    body: "יש עבודות ששולמו כבר ולא סומנו?",
    data: { type: "nudge", nudgeType: "unpaid_check" },
  },
};

export async function sendTestPush(preset: string | null, customTitle?: string, customBody?: string) {
  await requireAdmin();

  if (!process.env.APNS_KEY_ID || !process.env.APNS_TEAM_ID || !process.env.APNS_PRIVATE_KEY) {
    throw new Error("הגדרות APNS חסרות — בדקו את משתני הסביבה");
  }

  const TEST_USER_EMAIL = "bareloved@gmail.com";
  const [testUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, TEST_USER_EMAIL))
    .limit(1);

  if (!testUser) {
    throw new Error("משתמש הבדיקה לא נמצא");
  }

  const tokens = await withAdminBypass(async (tx) =>
    tx
      .select()
      .from(deviceTokens)
      .where(eq(deviceTokens.userId, testUser.id))
  );

  if (tokens.length === 0) {
    throw new Error("אין מכשיר רשום לקבלת התראות");
  }

  let title: string;
  let body: string;
  let data: Record<string, unknown>;

  if (preset && PUSH_PRESETS[preset]) {
    ({ title, body, data } = PUSH_PRESETS[preset]);
  } else {
    title = customTitle || "בדיקה 🔔";
    body = customBody || "זו הודעת בדיקה מסדר";
    data = { type: "test" };
  }

  // Dynamic import to avoid bundler issues with node:http2
  const { sendPushToUser: send } = await import("@/lib/pushNotifications");

  await send(testUser.id, title, body, data);
}
