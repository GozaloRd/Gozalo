import { NextResponse } from "next/server";

const COOKIE_NAME = "token";
const MAX_AGE = 60 * 60 * 24 * 7;

function looksLikeJwt(s: unknown): s is string {
  return (
    typeof s === "string" &&
    s.length > 20 &&
    s.length < 12000 &&
    s.split(".").length >= 2 &&
    !s.includes(";")
  );
}

function secureCookie(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded === "https") return true;
  return process.env.NODE_ENV === "production";
}

/**
 * Fija la cookie de sesión en el servidor (HttpOnly) para que el middleware
 * y las peticiones RSC la reciban. El cliente sigue usando localStorage + Bearer.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const token =
    typeof body === "object" && body !== null && "token" in body
      ? (body as { token: unknown }).token
      : undefined;
  if (!looksLikeJwt(token)) {
    return NextResponse.json({ error: "Token inválido" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  const secure = secureCookie(request);
  res.cookies.set({
    name: COOKIE_NAME,
    value: token,
    path: "/",
    maxAge: MAX_AGE,
    sameSite: "lax",
    httpOnly: true,
    secure,
  });
  return res;
}

export async function DELETE(req: Request) {
  const res = NextResponse.json({ ok: true });
  const secure = secureCookie(req);
  res.cookies.set({
    name: COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    httpOnly: true,
    secure,
  });
  return res;
}
