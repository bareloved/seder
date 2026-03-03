import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { updateCategory, archiveCategory, unarchiveCategory } from "@/app/categories/data";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Handle archive/unarchive actions
    if (body.action === "archive") {
      const category = await archiveCategory(id, userId);
      return apiSuccess(category);
    }
    if (body.action === "unarchive") {
      const category = await unarchiveCategory(id, userId);
      return apiSuccess(category);
    }

    const category = await updateCategory({ id, userId, ...body });
    return apiSuccess(category);
  } catch (error) {
    return apiError(error);
  }
}
