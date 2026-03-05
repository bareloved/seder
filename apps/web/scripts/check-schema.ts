import { db } from "@/db/client";
import { sql } from "drizzle-orm";

async function checkSchema() {
  try {
    // Check user table structure
    const userTable = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'user'
      ORDER BY ordinal_position;
    `);

    console.log("\n=== USER TABLE SCHEMA ===");
    console.log(userTable.rows);

    // Check account table structure
    const accountTable = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'account'
      ORDER BY ordinal_position;
    `);

    console.log("\n=== ACCOUNT TABLE SCHEMA ===");
    console.log(accountTable.rows);

    // Check if there are any users
    const userCount = await db.execute(sql`SELECT COUNT(*) as count FROM "user"`);
    console.log("\n=== USER COUNT ===");
    console.log(userCount.rows);

    // Check if there are any accounts
    const accountCount = await db.execute(sql`SELECT COUNT(*) as count FROM "account"`);
    console.log("\n=== ACCOUNT COUNT ===");
    console.log(accountCount.rows);

    // Check for any credential accounts
    const credentialAccounts = await db.execute(sql`
      SELECT provider_id, COUNT(*) as count
      FROM "account"
      GROUP BY provider_id
    `);
    console.log("\n=== ACCOUNTS BY PROVIDER ===");
    console.log(credentialAccounts.rows);

    process.exit(0);
  } catch (error) {
    console.error("Error checking schema:", error);
    process.exit(1);
  }
}

checkSchema();
