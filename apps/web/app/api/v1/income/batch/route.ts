import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { ValidationError } from "../../_lib/errors";
import {
  batchDeleteIncomeEntries,
  batchUpdateIncomeEntries,
} from "@/app/income/data";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const { action, ids, updates } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError("ids must be a non-empty array");
    }

    if (action === "delete") {
      const count = await batchDeleteIncomeEntries(ids, userId);
      return apiSuccess({ deletedCount: count });
    }
    if (action === "update") {
      const count = await batchUpdateIncomeEntries(ids, userId, updates);
      return apiSuccess({ updatedCount: count });
    }
    throw new ValidationError("Invalid batch action. Use 'delete' or 'update'.");
  } catch (error) {
    return apiError(error);
  }
}
