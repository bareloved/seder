import { desc } from "drizzle-orm";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf-8");
  envConfig.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

// Now import the db client (which expects process.env.DATABASE_URL to be set)
import { db } from "@/db/client";
import { incomeEntries } from "@/db/schema";

async function backup() {
  console.log("Starting backup...");
  
  try {
    const entries = await db.select().from(incomeEntries).orderBy(desc(incomeEntries.date));
    
    if (entries.length === 0) {
      console.log("No entries found to backup.");
      return;
    }

    // Convert to CSV
    const headers = Object.keys(entries[0]).join(",");
    const rows = entries.map(entry => {
      return Object.values(entry).map(value => {
        if (value === null) return "";
        if (value instanceof Date) return value.toISOString();
        if (typeof value === "string" && value.includes(",")) return `"${value}"`;
        return String(value);
      }).join(",");
    });
    
    const csv = [headers, ...rows].join("\n");
    
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = path.join(backupDir, `income_entries_backup_${timestamp}.csv`);
    
    fs.writeFileSync(filename, csv);
    
    console.log(`✅ Backup completed successfully! Saved to: ${filename}`);
    console.log(`Total entries backed up: ${entries.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Backup failed:", error);
    process.exit(1);
  }
}

backup();

