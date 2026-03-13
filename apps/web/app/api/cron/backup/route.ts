import { NextRequest, NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  // Match existing cron auth pattern (see /api/calendar/auto-sync)
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(
      `https://console.neon.tech/api/v2/projects/${process.env.NEON_PROJECT_ID}/branches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEON_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          branch: {
            name: `backup-${new Date().toISOString().split("T")[0]}`,
          },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Neon API error: ${res.status}`);
    }

    return NextResponse.json({
      success: true,
      date: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return NextResponse.json(
      { success: false, error: "Backup failed" },
      { status: 500 }
    );
  }
}
