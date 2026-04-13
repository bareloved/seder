import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { siteConfig } from "@/db/schema";
import { eq } from "drizzle-orm";

const MAX_BACKUPS = 5;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const CRON_SECRET = process.env.CRON_SECRET;
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = process.env.NEON_PROJECT_ID;
  const apiKey = process.env.NEON_API_KEY;

  if (!projectId || !apiKey) {
    return NextResponse.json({ success: false, error: "Missing Neon config" }, { status: 500 });
  }

  // Check if auto-backup is enabled (manual triggers bypass this check)
  const isManual = req.headers.get("x-manual-trigger") === "true";
  if (!isManual) {
    const [config] = await db
      .select({ value: siteConfig.value })
      .from(siteConfig)
      .where(eq(siteConfig.key, "auto_backup_enabled"));

    if (!config || config.value !== "true") {
      return NextResponse.json({ success: true, skipped: true, reason: "Auto-backup disabled" });
    }
  }

  const neonHeaders = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    // List existing branches and find backup branches
    const listRes = await fetch(
      `https://console.neon.tech/api/v2/projects/${projectId}/branches`,
      { headers: neonHeaders }
    );

    if (!listRes.ok) {
      throw new Error(`Failed to list branches: ${listRes.status}`);
    }

    const { branches } = await listRes.json();
    const backupBranches = branches
      .filter((b: { name: string }) => b.name.startsWith("backup-"))
      .sort((a: { created_at: string }, b: { created_at: string }) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

    // Delete oldest backups if we're at or over the limit
    const toDelete = backupBranches.slice(0, Math.max(0, backupBranches.length - MAX_BACKUPS + 1));
    for (const branch of toDelete) {
      await fetch(
        `https://console.neon.tech/api/v2/projects/${projectId}/branches/${branch.id}`,
        { method: "DELETE", headers: neonHeaders }
      );
    }

    // Create new backup branch
    const createRes = await fetch(
      `https://console.neon.tech/api/v2/projects/${projectId}/branches`,
      {
        method: "POST",
        headers: neonHeaders,
        body: JSON.stringify({
          branch: {
            name: `backup-${new Date().toISOString().split("T")[0]}`,
          },
        }),
      }
    );

    if (!createRes.ok) {
      throw new Error(`Neon API error: ${createRes.status}`);
    }

    return NextResponse.json({
      success: true,
      date: new Date().toISOString(),
      deleted: toDelete.length,
    });
  } catch (error) {
    console.error("Backup failed:", error);
    return NextResponse.json(
      { success: false, error: "Backup failed" },
      { status: 500 }
    );
  }
}
