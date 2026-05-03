import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type UserRole = "admin" | "customer" | "venue_owner" | "staff" | null;

function getTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get("token")?.value;
  if (cookieToken) return cookieToken;

  const auth = request.headers.get("authorization");
  if (!auth) return null;
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim();
  return token || null;
}

function roleFromPayload(payload: Record<string, unknown>): UserRole {
  const role = payload.role;
  if (role === "admin" || role === "customer" || role === "venue_owner" || role === "staff") {
    return role;
  }
  return null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

function getRole(request: NextRequest): UserRole {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return roleFromPayload(payload);
}

function isPublicBypass(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/registro" ||
    pathname === "/eventos" ||
    pathname.startsWith("/eventos/") ||
    pathname === "/collage" ||
    pathname.startsWith("/collage/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/images")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicBypass(pathname)) return NextResponse.next();

  const token = getTokenFromRequest(request);
  const role = getRole(request);
  const isProtected =
    pathname.startsWith("/checkout/") || pathname.startsWith("/reservar/") || pathname.startsWith("/dashboard");

  if (isProtected && !token) {
    return redirectTo(request, "/login");
  }

  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard/admin")) {
    if (role === "admin") return NextResponse.next();
    if (role === "venue_owner" || role === "staff") return redirectTo(request, "/dashboard");
    if (role === "customer") return redirectTo(request, "/dashboard/cliente");
    return redirectTo(request, "/login");
  }

  if (pathname.startsWith("/dashboard/cliente")) {
    if (role === "customer") return NextResponse.next();
    if (role === "admin") return redirectTo(request, "/dashboard/admin");
    if (role === "venue_owner" || role === "staff") return redirectTo(request, "/dashboard");
    return redirectTo(request, "/login");
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    if (role === "venue_owner" || role === "staff") return NextResponse.next();
    if (role === "admin") return redirectTo(request, "/dashboard/admin");
    if (role === "customer") return redirectTo(request, "/dashboard/cliente");
    return redirectTo(request, "/login");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/checkout/:path*", "/reservar/:path*"],
};
