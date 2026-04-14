import { NextResponse } from "next/server";
import { ZodError } from "zod";
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
  if (error instanceof ZodError) {
    const first = error.issues[0];
    const field = first?.path.join(".") || "";
    const message = first?.message || "ולידציה נכשלה";
    return NextResponse.json(
      {
        success: false,
        error: field ? `${field}: ${message}` : message,
        code: "VALIDATION_ERROR",
        issues: error.issues,
      },
      { status: 400 }
    );
  }
  console.error("Unhandled API error:", error);
  return NextResponse.json(
    { success: false, error: "Internal server error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
