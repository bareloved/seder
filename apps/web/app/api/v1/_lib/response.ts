import { NextResponse } from "next/server";
import { ApiError } from "./errors";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  console.error("Unhandled API error:", error);
  return NextResponse.json(
    { success: false, error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
