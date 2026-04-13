import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RateLimitError } from "@/app/api/v1/_lib/errors";

const hasUpstash =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : undefined;

type WindowDuration = `${number} ${"ms" | "s" | "m" | "h" | "d"}`;

function makeLimiter(
  prefix: string,
  max: number,
  window: WindowDuration
): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, window),
    analytics: true,
    prefix,
  });
}

// 10 requests per 60 seconds per IP
export const authRatelimit = makeLimiter("ratelimit:auth", 10, "60 s");

// Per-endpoint limits for /api/v1/*
// Generous windows — the goal is to stop abuse, not slow legitimate use.
export const feedbackRatelimit = makeLimiter("ratelimit:feedback", 5, "60 s");
export const calendarImportRatelimit = makeLimiter(
  "ratelimit:calendar-import",
  10,
  "60 s"
);
export const deviceRegisterRatelimit = makeLimiter(
  "ratelimit:devices",
  5,
  "60 s"
);

/**
 * Enforce a per-user rate limit. No-op if Upstash is not configured.
 * Throws RateLimitError (handled by apiError) when the limit is exceeded.
 */
export async function enforceUserRateLimit(
  limiter: Ratelimit | null,
  userId: string
): Promise<void> {
  if (!limiter) return;
  const { success } = await limiter.limit(userId);
  if (!success) {
    throw new RateLimitError();
  }
}
