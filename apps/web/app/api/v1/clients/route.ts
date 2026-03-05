import { NextRequest } from "next/server";
import { requireAuth } from "../_lib/middleware";
import { apiSuccess, apiError } from "../_lib/response";
import { getUserClients, getClientsWithAnalytics, createClient } from "@/app/clients/data";
import { createClientSchema } from "@seder/shared";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const analytics = request.nextUrl.searchParams.get("analytics") === "true";

    if (analytics) {
      const clients = await getClientsWithAnalytics(userId);
      return apiSuccess(clients);
    }

    const clients = await getUserClients(userId);
    return apiSuccess(clients);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    const body = await request.json();
    const parsed = createClientSchema.parse(body);
    const client = await createClient({ ...parsed, userId });
    return apiSuccess(client, 201);
  } catch (error) {
    return apiError(error);
  }
}
