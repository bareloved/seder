import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Create a lazy connection pool
let pool: Pool | null = null;

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL environment variable is required. " +
      "Please set it in your .env.local file with your Neon Postgres connection string."
    );
  }
  
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Required for Neon
      },
    });
  }
  
  return pool;
}

// Create a lazy Drizzle instance
type DbType = ReturnType<typeof drizzle<typeof schema>>;
let drizzleInstance: DbType | null = null;

function getDb(): DbType {
  if (!drizzleInstance) {
    drizzleInstance = drizzle(getPool(), { schema });
  }
  return drizzleInstance;
}

// Export a proxy that lazily initializes the db
export const db = new Proxy({} as DbType, {
  get(_, prop) {
    const instance = getDb();
    return (instance as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Export schema for convenience
export { schema };
