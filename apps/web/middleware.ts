import { NextRequest, NextResponse } from "next/server";
import { CONSENT_COOKIE } from "@/lib/consent-cookie";
import { TERMS_VERSION } from "@seder/shared";

// Routes that require an authenticated, consented user. Anything else (public
// marketing, /sign-in, /privacy, /terms, /api/auth, /auth/callback, etc.) is
// excluded from the matcher below.
const PROTECTED_PREFIXES = [
  "/income",
  "/analytics",
  "/categories",
  "/clients",
  "/rolling-jobs",
  "/settings",
  "/admin",
];

// Cookie set by Better Auth when a session exists. Name is configurable, but
// Better Auth's default in this project is `better-auth.session_token`.
const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only gate the protected app routes — middleware runs on the matcher list,
  // but be defensive in case the matcher widens accidentally.
  if (!PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // No session = let the page's own redirect-to-/sign-in handler run. We don't
  // want the consent gate to mask an auth-required redirect.
  const hasSession = SESSION_COOKIE_NAMES.some((n) => req.cookies.has(n));
  if (!hasSession) {
    return NextResponse.next();
  }

  // Cookie matches current TERMS_VERSION = consented + up to date. Pass.
  const consentCookie = req.cookies.get(CONSENT_COOKIE)?.value;
  if (consentCookie === TERMS_VERSION) {
    return NextResponse.next();
  }

  // Otherwise route to the interstitial. Carry the original path so we can
  // bounce back after consent.
  const url = req.nextUrl.clone();
  url.pathname = "/auth/consent";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/income/:path*",
    "/analytics/:path*",
    "/categories/:path*",
    "/clients/:path*",
    "/rolling-jobs/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/income",
    "/analytics",
    "/categories",
    "/clients",
    "/rolling-jobs",
    "/settings",
    "/admin",
  ],
};
