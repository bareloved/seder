import { NextRequest, NextResponse } from "next/server";
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { authRatelimit } from "@/lib/ratelimit";

const authHandler = toNextJsHandler(auth);

const RATE_LIMITED_PATHS = [
  "/sign-in",
  "/sign-up",
  "/reset-password",
  "/email-otp",
  "/verify-email",
];

async function withRateLimit(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<Response>
) {
  const pathname = new URL(req.url).pathname.replace("/api/auth", "");
  const shouldLimit = RATE_LIMITED_PATHS.some((p) => pathname.startsWith(p));

  if (shouldLimit) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const { success } = await authRatelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { success: false, error: "נסה שוב מאוחר יותר", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }
  }

  return handler(req);
}

export async function GET(req: NextRequest) {
  return withRateLimit(req, authHandler.GET!);
}

export async function POST(req: NextRequest) {
  return withRateLimit(req, authHandler.POST!);
}
