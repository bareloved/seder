#!/usr/bin/env tsx
/**
 * Seed Demo Data
 *
 * Seeds realistic demo data into an existing user account
 * for the beta tutorial video recording.
 *
 * Usage: pnpm seed:demo
 *
 * Pass TARGET_EMAIL env to override (default: barrelloved@gmail.com)
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load env from apps/web/.env
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../apps/web/.env") });

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import * as schema from "../apps/web/db/schema";

const TARGET_EMAIL = process.env.TARGET_EMAIL || "barrelloved@gmail.com";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required. Set it in apps/web/.env");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL.replace(
      /sslmode=(require|prefer|verify-ca)\b/,
      "sslmode=verify-full"
    ),
    ssl: true,
  });

  const db = drizzle(pool, { schema });

  // 1. Find the target user
  console.log(`Looking up ${TARGET_EMAIL}...`);
  const users = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, TARGET_EMAIL));

  if (users.length === 0) {
    console.error(`User ${TARGET_EMAIL} not found in database.`);
    await pool.end();
    process.exit(1);
  }

  const userId = users[0].id;
  console.log(`Found user: ${users[0].name} (${userId})`);

  // 2. Delete old demo account if it exists
  const demoUser = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.email, "demo@seder.co.il"));

  if (demoUser.length > 0) {
    console.log("Deleting old demo@seder.co.il account...");
    const demoId = demoUser[0].id;
    await db.delete(schema.incomeEntries).where(eq(schema.incomeEntries.userId, demoId));
    await db.delete(schema.clients).where(eq(schema.clients.userId, demoId));
    await db.delete(schema.categories).where(eq(schema.categories.userId, demoId));
    await db.delete(schema.userSettings).where(eq(schema.userSettings.userId, demoId));
    await db.delete(schema.dismissedNudges).where(eq(schema.dismissedNudges.userId, demoId));
    await db.delete(schema.deviceTokens).where(eq(schema.deviceTokens.userId, demoId));
    await db.delete(schema.feedback).where(eq(schema.feedback.userId, demoId));
    await db.delete(schema.session).where(eq(schema.session.userId, demoId));
    await db.delete(schema.account).where(eq(schema.account.userId, demoId));
    await db.delete(schema.user).where(eq(schema.user.id, demoId));
    console.log("Deleted.");
  }

  // 3. Clear existing data for the target user (income, clients, categories)
  console.log("Clearing existing data...");
  await db.delete(schema.dismissedNudges).where(eq(schema.dismissedNudges.userId, userId));
  await db.delete(schema.incomeEntries).where(eq(schema.incomeEntries.userId, userId));
  await db.delete(schema.clients).where(eq(schema.clients.userId, userId));
  await db.delete(schema.categories).where(eq(schema.categories.userId, userId));

  // 4. Mark onboarding as completed
  const existingSettings = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId));

  if (existingSettings.length > 0) {
    await db
      .update(schema.userSettings)
      .set({ onboardingCompleted: true, onboardingCompletedAt: new Date() })
      .where(eq(schema.userSettings.userId, userId));
  } else {
    await db.insert(schema.userSettings).values({
      userId,
      onboardingCompleted: true,
      onboardingCompletedAt: new Date(),
    });
  }

  // 5. Create categories
  console.log("Creating categories...");
  const categoryData = [
    { name: "שיעורים", color: "amber", icon: "BookOpen", displayOrder: "1" },
    { name: "הופעות", color: "emerald", icon: "Sparkles", displayOrder: "2" },
    { name: "הקלטות", color: "sky", icon: "Mic2", displayOrder: "3" },
    { name: "ייעוץ", color: "purple", icon: "Briefcase", displayOrder: "4" },
  ];

  const insertedCategories = await db
    .insert(schema.categories)
    .values(categoryData.map((cat) => ({ userId, ...cat })))
    .returning();

  const catMap = Object.fromEntries(
    insertedCategories.map((c) => [c.name, c.id])
  );

  // 6. Create clients
  console.log("Creating clients...");
  const clientData = [
    { name: "מרכז המוזיקה תל אביב", phone: "03-5551234", defaultRate: "200.00", displayOrder: "1" },
    { name: "נועה לוי", phone: "052-1234567", notes: "שיעורי גיטרה, כל יום שלישי", defaultRate: "150.00", displayOrder: "2" },
    { name: "אולפני ברקן", phone: "09-7776543", defaultRate: "350.00", displayOrder: "3" },
    { name: "עירית רמת גן", email: "culture@ramat-gan.muni.il", defaultRate: "2500.00", displayOrder: "4" },
  ];

  const insertedClients = await db
    .insert(schema.clients)
    .values(clientData.map((client) => ({ userId, ...client })))
    .returning();

  const clientMap = Object.fromEntries(
    insertedClients.map((c) => [c.name, c.id])
  );

  // 7. Create income entries
  console.log("Creating income entries...");

  const entries = [
    // === January 2026 — all completed (green dot) ===
    {
      date: "2026-01-06",
      description: "שיעור גיטרה — נועה לוי",
      clientName: "נועה לוי",
      clientId: clientMap["נועה לוי"],
      amountGross: "150.00",
      amountPaid: "150.00",
      categoryId: catMap["שיעורים"],
      invoiceStatus: "paid" as const,
      paymentStatus: "paid" as const,
      paidDate: "2026-01-06",
    },
    {
      date: "2026-01-13",
      description: "שיעור גיטרה — נועה לוי",
      clientName: "נועה לוי",
      clientId: clientMap["נועה לוי"],
      amountGross: "150.00",
      amountPaid: "150.00",
      categoryId: catMap["שיעורים"],
      invoiceStatus: "paid" as const,
      paymentStatus: "paid" as const,
      paidDate: "2026-01-14",
    },
    {
      date: "2026-01-17",
      description: "הופעה — ערב ג׳אז",
      clientName: "מרכז המוזיקה תל אביב",
      clientId: clientMap["מרכז המוזיקה תל אביב"],
      amountGross: "1500.00",
      amountPaid: "1500.00",
      categoryId: catMap["הופעות"],
      invoiceStatus: "paid" as const,
      paymentStatus: "paid" as const,
      paidDate: "2026-01-22",
    },
    {
      date: "2026-01-21",
      description: "הקלטת גיטרות — ג׳ינגל",
      clientName: "אולפני ברקן",
      clientId: clientMap["אולפני ברקן"],
      amountGross: "700.00",
      amountPaid: "700.00",
      categoryId: catMap["הקלטות"],
      invoiceStatus: "paid" as const,
      paymentStatus: "paid" as const,
      paidDate: "2026-01-28",
    },
    {
      date: "2026-01-27",
      description: "שיעור גיטרה — נועה לוי",
      clientName: "נועה לוי",
      clientId: clientMap["נועה לוי"],
      amountGross: "150.00",
      amountPaid: "150.00",
      categoryId: catMap["שיעורים"],
      invoiceStatus: "paid" as const,
      paymentStatus: "paid" as const,
      paidDate: "2026-01-27",
    },

    // === February 2026 — mix of completed and uncompleted (red dot) ===
    {
      date: "2026-02-03",
      description: "שיעור גיטרה — נועה לוי",
      clientName: "נועה לוי",
      clientId: clientMap["נועה לוי"],
      amountGross: "150.00",
      amountPaid: "150.00",
      categoryId: catMap["שיעורים"],
      invoiceStatus: "paid" as const,
      paymentStatus: "paid" as const,
      paidDate: "2026-02-03",
    },
    {
      date: "2026-02-10",
      description: "שיעור גיטרה — נועה לוי",
      clientName: "נועה לוי",
      clientId: clientMap["נועה לוי"],
      amountGross: "150.00",
      amountPaid: "150.00",
      categoryId: catMap["שיעורים"],
      invoiceStatus: "paid" as const,
      paymentStatus: "paid" as const,
      paidDate: "2026-02-10",
    },
    {
      date: "2026-02-14",
      description: "הופעה — אירוע ולנטיין",
      clientName: "עירית רמת גן",
      clientId: clientMap["עירית רמת גן"],
      amountGross: "2000.00",
      amountPaid: "2000.00",
      categoryId: catMap["הופעות"],
      invoiceStatus: "paid" as const,
      paymentStatus: "paid" as const,
      paidDate: "2026-02-20",
    },
    {
      date: "2026-02-18",
      description: "הקלטת גיטרות — EP",
      clientName: "אולפני ברקן",
      clientId: clientMap["אולפני ברקן"],
      amountGross: "900.00",
      amountPaid: "0.00",
      categoryId: catMap["הקלטות"],
      invoiceStatus: "sent" as const,
      paymentStatus: "unpaid" as const,
      invoiceSentDate: "2026-02-19",
    },
    {
      date: "2026-02-22",
      description: "ייעוץ מוזיקלי — סטארטאפ",
      clientName: "מרכז המוזיקה תל אביב",
      clientId: clientMap["מרכז המוזיקה תל אביב"],
      amountGross: "600.00",
      amountPaid: "0.00",
      categoryId: catMap["ייעוץ"],
      invoiceStatus: "sent" as const,
      paymentStatus: "unpaid" as const,
      invoiceSentDate: "2026-02-23",
    },

    // === March 2026 ===
    // Calendar-imported entries (have calendarEventId)
    {
      date: "2026-03-03",
      description: "שיעור גיטרה — נועה לוי",
      clientName: "נועה לוי",
      clientId: clientMap["נועה לוי"],
      amountGross: "150.00",
      amountPaid: "150.00",
      categoryId: catMap["שיעורים"],
      invoiceStatus: "paid" as const,
      paymentStatus: "paid" as const,
      paidDate: "2026-03-03",
      calendarEventId: "cal-demo-001",
    },
    {
      date: "2026-03-05",
      description: "שיעור גיטרה — נועה לוי",
      clientName: "נועה לוי",
      clientId: clientMap["נועה לוי"],
      amountGross: "150.00",
      amountPaid: "150.00",
      categoryId: catMap["שיעורים"],
      invoiceStatus: "paid" as const,
      paymentStatus: "paid" as const,
      paidDate: "2026-03-05",
      calendarEventId: "cal-demo-002",
    },
    {
      date: "2026-03-10",
      description: "שיעור גיטרה — נועה לוי",
      clientName: "נועה לוי",
      clientId: clientMap["נועה לוי"],
      amountGross: "150.00",
      amountPaid: "0.00",
      categoryId: catMap["שיעורים"],
      invoiceStatus: "sent" as const,
      paymentStatus: "unpaid" as const,
      invoiceSentDate: "2026-03-11",
      calendarEventId: "cal-demo-003",
    },
    {
      date: "2026-03-14",
      description: "הופעה — פסטיבל אביב",
      clientName: "עירית רמת גן",
      clientId: clientMap["עירית רמת גן"],
      amountGross: "2500.00",
      amountPaid: "0.00",
      categoryId: catMap["הופעות"],
      invoiceStatus: "sent" as const,
      paymentStatus: "unpaid" as const,
      invoiceSentDate: "2026-03-15",
      calendarEventId: "cal-demo-004",
    },
    {
      date: "2026-03-20",
      description: "הופעה — ערב שירי משוררים",
      clientName: "מרכז המוזיקה תל אביב",
      clientId: clientMap["מרכז המוזיקה תל אביב"],
      amountGross: "1800.00",
      amountPaid: "1800.00",
      categoryId: catMap["הופעות"],
      invoiceStatus: "paid" as const,
      paymentStatus: "paid" as const,
      paidDate: "2026-03-22",
      calendarEventId: "cal-demo-005",
    },
    // Manual entries (no calendarEventId)
    {
      date: "2026-03-07",
      description: "הקלטת גיטרות — סינגל חדש",
      clientName: "אולפני ברקן",
      clientId: clientMap["אולפני ברקן"],
      amountGross: "1050.00",
      amountPaid: "1050.00",
      categoryId: catMap["הקלטות"],
      invoiceStatus: "paid" as const,
      paymentStatus: "paid" as const,
      paidDate: "2026-03-12",
    },
    {
      date: "2026-03-18",
      description: "ייעוץ מוזיקלי — אירוע חברה",
      clientName: "מרכז המוזיקה תל אביב",
      clientId: clientMap["מרכז המוזיקה תל אביב"],
      amountGross: "800.00",
      amountPaid: "400.00",
      categoryId: catMap["ייעוץ"],
      invoiceStatus: "sent" as const,
      paymentStatus: "partial" as const,
      invoiceSentDate: "2026-03-19",
    },
    {
      date: "2026-03-24",
      description: "הקלטת בס — אלבום",
      clientName: "אולפני ברקן",
      clientId: clientMap["אולפני ברקן"],
      amountGross: "700.00",
      amountPaid: "0.00",
      categoryId: catMap["הקלטות"],
      invoiceStatus: "draft" as const,
      paymentStatus: "unpaid" as const,
    },
    {
      date: "2026-03-26",
      description: "שיעור גיטרה — נועה לוי",
      clientName: "נועה לוי",
      clientId: clientMap["נועה לוי"],
      amountGross: "150.00",
      amountPaid: "0.00",
      categoryId: catMap["שיעורים"],
      invoiceStatus: "draft" as const,
      paymentStatus: "unpaid" as const,
      calendarEventId: "cal-demo-006",
    },
    {
      date: "2026-03-27",
      description: "הופעה — בית קפה רמת אביב",
      clientName: "מרכז המוזיקה תל אביב",
      clientId: clientMap["מרכז המוזיקה תל אביב"],
      amountGross: "1200.00",
      amountPaid: "0.00",
      categoryId: catMap["הופעות"],
      invoiceStatus: "draft" as const,
      paymentStatus: "unpaid" as const,
      calendarEventId: "cal-demo-007",
    },
  ];

  await db.insert(schema.incomeEntries).values(
    entries.map((entry) => ({
      userId,
      vatRate: "18.00",
      includesVat: true,
      ...entry,
    }))
  );

  // Summary
  console.log("");
  console.log(`Done! Demo data seeded into ${TARGET_EMAIL}`);
  console.log("");
  console.log("   4 categories (שיעורים, הופעות, הקלטות, ייעוץ)");
  console.log("   4 clients");
  console.log("   20 income entries across Jan-Mar 2026");
  console.log("      Jan: 5 entries, all paid (green dot)");
  console.log("      Feb: 5 entries, 3 paid + 2 unpaid (red dot)");
  console.log("      Mar: 10 entries, mixed statuses");
  console.log("");
  console.log("Re-run pnpm seed:demo anytime to reset.");
  console.log("");

  await pool.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
