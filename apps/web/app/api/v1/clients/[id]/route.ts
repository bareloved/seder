import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { updateClient, archiveClient, unarchiveClient } from "@/app/clients/data";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    if (body.action === "archive") {
      const client = await archiveClient(id, userId);
      return apiSuccess(client);
    }
    if (body.action === "unarchive") {
      const client = await unarchiveClient(id, userId);
      return apiSuccess(client);
    }

    const client = await updateClient({ id, userId, ...body });
    return apiSuccess(client);
  } catch (error) {
    return apiError(error);
  }
}
