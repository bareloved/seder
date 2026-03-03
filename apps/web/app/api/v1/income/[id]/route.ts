import { NextRequest } from "next/server";
import { requireAuth } from "../../_lib/middleware";
import { apiSuccess, apiError } from "../../_lib/response";
import { NotFoundError } from "../../_lib/errors";
import {
  updateIncomeEntry,
  deleteIncomeEntry,
} from "@/app/income/data";
import { updateIncomeEntrySchema } from "@seder/shared";
import { db } from "@/db/client";
import { incomeEntries } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;

    const [entry] = await db
      .select()
      .from(incomeEntries)
      .where(and(eq(incomeEntries.id, id), eq(incomeEntries.userId, userId)));

    if (!entry) {
      throw new NotFoundError("Income entry");
    }

    return apiSuccess(entry);
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const parsed = updateIncomeEntrySchema.parse(body);
    const entry = await updateIncomeEntry({ ...parsed, id, userId });
    return apiSuccess(entry);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth();
    const { id } = await params;
    const deleted = await deleteIncomeEntry(id, userId);
    if (!deleted) {
      throw new NotFoundError("Income entry");
    }
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
