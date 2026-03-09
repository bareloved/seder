import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { db } from "@/db/client";
import {
  incomeEntries,
  categories,
  clients,
  session,
  account,
  userSettings,
  user,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE() {
  try {
    const userId = await requireAuth();

    // Delete all user data in correct order (respecting foreign keys)
    await db.transaction(async (tx) => {
      // 1. Delete income entries (has FKs to categories, clients, user)
      await tx.delete(incomeEntries).where(eq(incomeEntries.userId, userId));

      // 2. Delete categories (FK to user)
      await tx.delete(categories).where(eq(categories.userId, userId));

      // 3. Delete clients (FK to user)
      await tx.delete(clients).where(eq(clients.userId, userId));

      // 4. Delete sessions (FK to user)
      await tx.delete(session).where(eq(session.userId, userId));

      // 5. Delete accounts (FK to user)
      await tx.delete(account).where(eq(account.userId, userId));

      // 6. Delete user settings (FK to user)
      await tx.delete(userSettings).where(eq(userSettings.userId, userId));

      // 7. Delete user (parent - delete last)
      await tx.delete(user).where(eq(user.id, userId));
    });

    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
