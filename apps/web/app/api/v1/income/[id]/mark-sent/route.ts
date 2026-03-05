import { NextRequest } from "next/server";
import { requireAuth } from "../../../_lib/middleware";
import { apiSuccess, apiError } from "../../../_lib/response";
import { markInvoiceSent } from "@/app/income/data";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const entry = await markInvoiceSent(id, userId);
    return apiSuccess(entry);
  } catch (error) {
    return apiError(error);
  }
}
