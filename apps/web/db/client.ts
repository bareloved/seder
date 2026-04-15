import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
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
    // Replace weaker SSL modes with verify-full to silence pg v8 deprecation warning
    const connectionString = process.env.DATABASE_URL.replace(
      /sslmode=(require|prefer|verify-ca)\b/,
      "sslmode=verify-full"
    );
    pool = new Pool({
      connectionString,
      ssl: true,
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

/**
 * Drizzle transaction handle type — use in callbacks for withUser/withAdminBypass.
 * Prefer using the tx param directly rather than re-typing it.
 */
export type DbTx = Parameters<Parameters<DbType["transaction"]>[0]>[0];

/**
 * Run a block of queries inside a transaction scoped to a single user.
 * Sets `app.user_id` via SET LOCAL so that RLS policies on user-scoped
 * tables permit rows matching the given userId and deny all others.
 *
 * ALWAYS use the `tx` parameter for queries inside the callback — using
 * the outer `db` would run queries outside the transaction (no GUC set,
 * RLS denies, returns 0 rows).
 */
export async function withUser<T>(
  userId: string,
  fn: (tx: DbTx) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.user_id = ${userId}`);
    return fn(tx);
  });
}

/**
 * Run a block of queries inside a transaction that bypasses RLS entirely.
 * Use for admin/cron paths that legitimately operate across users
 * (admin dashboard, user deletion, cross-user analytics).
 *
 * Never use this to paper over a missing withUser wrapper — it defeats
 * the isolation guarantee for that code path.
 */
export async function withAdminBypass<T>(
  fn: (tx: DbTx) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL app.bypass_rls = 'on'`);
    return fn(tx);
  });
}

// Export schema for convenience
export { schema };
