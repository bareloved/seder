import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { reorderCategories } from "@/app/categories/data";
import { reorderCategoriesSchema } from "@seder/shared";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const reorders = reorderCategoriesSchema.parse(body);
    await reorderCategories(userId, reorders);
    return apiSuccess({ reordered: true });
  } catch (error) {
    return apiError(error);
  }
}
