// Extract the client IP from common proxy headers.
// Works behind Vercel / standard reverse proxies.
export function getClientIp(req: Request | { headers: Headers }): string {
  const h = req.headers;
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip")?.trim() || "127.0.0.1";
}

export function getUserAgent(req: Request | { headers: Headers }): string | null {
  return req.headers.get("user-agent");
}
