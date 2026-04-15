import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { withAdminBypass } from "@/db/client";
import { feedback, user, incomeEntries, session, account, userSettings, categories, clients, deviceTokens } from "@/db/schema";
import { desc, eq, count, sql, gte } from "drizzle-orm";
import { isAdminEmail } from "@/lib/admin";
import AdminPageClient from "./AdminPageClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (!authSession || !isAdminEmail(authSession.user.email)) {
    redirect("/income");
  }

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Run all queries in parallel
  const [
    feedbackList,
    usersList,
    lastActiveData,
    googleConnectedData,
    onboardingData,
    categoryCounts,
    clientCounts,
    mobileRegisteredData,
    newUsersThisWeekData,
    totalEntriesData,
    activeUsersData,
  ] = await withAdminBypass(async (tx) =>
    Promise.all([
      // Feedback with user info
      tx
        .select({
          id: feedback.id,
          message: feedback.message,
          category: feedback.category,
          platform: feedback.platform,
          status: feedback.status,
          adminReply: feedback.adminReply,
          repliedAt: feedback.repliedAt,
          createdAt: feedback.createdAt,
          userId: feedback.userId,
          userName: user.name,
          userEmail: user.email,
        })
        .from(feedback)
        .leftJoin(user, eq(feedback.userId, user.id))
        .orderBy(desc(feedback.createdAt)),

      // Users with entry counts
      tx
        .select({
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          createdAt: user.createdAt,
          entryCount: count(incomeEntries.id),
        })
        .from(user)
        .leftJoin(incomeEntries, eq(user.id, incomeEntries.userId))
        .groupBy(user.id)
        .orderBy(desc(user.createdAt)),

      // Last active per user
      tx
        .select({
          userId: session.userId,
          lastActive: sql<string>`MAX(${session.updatedAt})`,
        })
        .from(session)
        .groupBy(session.userId),

      // Google connected users
      tx
        .select({ userId: account.userId })
        .from(account)
        .where(eq(account.providerId, "google")),

      // Onboarding status
      tx
        .select({
          userId: userSettings.userId,
          onboardingCompleted: userSettings.onboardingCompleted,
        })
        .from(userSettings),

      // Category count per user
      tx
        .select({ userId: categories.userId, count: count() })
        .from(categories)
        .groupBy(categories.userId),

      // Client count per user
      tx
        .select({ userId: clients.userId, count: count() })
        .from(clients)
        .groupBy(clients.userId),

      // Mobile registered users
      tx
        .select({ userId: deviceTokens.userId })
        .from(deviceTokens)
        .groupBy(deviceTokens.userId),

      // Stats: new users this week
      tx.select({ count: count() }).from(user).where(gte(user.createdAt, weekAgo)),

      // Stats: total entries
      tx.select({ count: count() }).from(incomeEntries),

      // Stats: active users this month
      tx
        .select({ count: sql<number>`count(distinct ${incomeEntries.userId})` })
        .from(incomeEntries)
        .where(gte(incomeEntries.createdAt, monthStart)),
    ])
  );

  // Build user details map
  const googleSet = new Set(googleConnectedData.map((g) => g.userId));
  const mobileSet = new Set(mobileRegisteredData.map((m) => m.userId));
  const lastActiveMap = Object.fromEntries(lastActiveData.map((l) => [l.userId, l.lastActive]));
  const onboardingMap = Object.fromEntries(onboardingData.map((o) => [o.userId, o.onboardingCompleted]));
  const categoryMap = Object.fromEntries(categoryCounts.map((c) => [c.userId, Number(c.count)]));
  const clientMap = Object.fromEntries(clientCounts.map((c) => [c.userId, Number(c.count)]));

  const userDetails: Record<string, {
    lastActive: string | null;
    googleConnected: boolean;
    onboardingCompleted: boolean;
    categoryCount: number;
    clientCount: number;
    mobileRegistered: boolean;
  }> = {};

  for (const u of usersList) {
    userDetails[u.id] = {
      lastActive: lastActiveMap[u.id] || null,
      googleConnected: googleSet.has(u.id),
      onboardingCompleted: onboardingMap[u.id] ?? false,
      categoryCount: categoryMap[u.id] ?? 0,
      clientCount: clientMap[u.id] ?? 0,
      mobileRegistered: mobileSet.has(u.id),
    };
  }

  const unreadFeedback = feedbackList.filter((f) => f.status === "unread").length;

  const stats = {
    totalUsers: usersList.length,
    newUsersThisWeek: Number(newUsersThisWeekData[0]?.count || 0),
    activeUsersThisMonth: Number(activeUsersData[0]?.count || 0),
    unreadFeedback,
  };

  return (
    <AdminPageClient
      feedback={feedbackList.map((f) => ({
        ...f,
        createdAt: f.createdAt.toISOString(),
        repliedAt: f.repliedAt?.toISOString() || null,
      }))}
      users={usersList.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        entryCount: Number(u.entryCount),
      }))}
      userDetails={userDetails}
      stats={stats}
      user={{
        name: authSession.user.name,
        email: authSession.user.email,
        image: authSession.user.image ?? null,
      }}
    />
  );
}
