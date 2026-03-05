import { NextRequest } from "next/server";
import { db } from "@/db/client";
import { incomeEntries } from "@/db/schema";
import { and, eq, lt, sql } from "drizzle-orm";
import { sendPushToUser } from "@/lib/pushNotifications";
import { apiSuccess, apiError } from "../../v1/_lib/response";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Find entries with invoiceStatus = 'sent' and paymentStatus = 'unpaid'
    // where the date is more than 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = thirtyDaysAgo.toISOString().split("T")[0];

    const overdueEntries = await db
      .select({
        userId: incomeEntries.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.invoiceStatus, "sent"),
          eq(incomeEntries.paymentStatus, "unpaid"),
          lt(incomeEntries.date, cutoffDate)
        )
      )
      .groupBy(incomeEntries.userId);

    let notificationsSent = 0;

    for (const row of overdueEntries) {
      await sendPushToUser(
        row.userId,
        "תשלומים באיחור",
        `יש לך ${row.count} חשבוניות שלא שולמו מעל 30 יום`,
        { type: "overdue", count: row.count }
      );
      notificationsSent++;
    }

    return apiSuccess({ notificationsSent });
  } catch (error) {
    return apiError(error);
  }
}
