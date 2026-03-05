import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { getUserCategories, createCategory } from "@/app/categories/data";
import { createCategorySchema } from "@seder/shared";

export async function GET() {
  try {
    const userId = await requireAuth();
    const categories = await getUserCategories(userId);
    return apiSuccess(categories);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = createCategorySchema.parse(body);
    const category = await createCategory({ ...parsed, userId });
    return apiSuccess(category, 201);
  } catch (error) {
    return apiError(error);
  }
}
