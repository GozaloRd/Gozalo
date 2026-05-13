const TOKEN_KEY = "gozalo_token";
const COOKIE_NAME = "token";
const COOKIE_AGE_SECONDS = 60 * 60 * 24 * 7;

function readTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((x) => x.startsWith(`${COOKIE_NAME}=`))
    ?.split("=")[1];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function persistSessionCookie(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ token }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function setLegacyReadableCookie(token: string) {
  if (typeof window === "undefined") return;
  const secure = window.location.protocol === "https:";
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${COOKIE_AGE_SECONDS}`,
    "SameSite=Lax",
    ...(secure ? (["Secure"] as const) : []),
  ];
  document.cookie = parts.join("; ");
}

/** Persiste sesión: localStorage + cookie HttpOnly vía mismo origen (+ fallback legacy si falla la ruta API). */
export async function setAuthToken(token: string): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  const ok = await persistSessionCookie(token);
  if (!ok) setLegacyReadableCookie(token);
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || readTokenFromCookie();
}

async function clearSessionCookie(): Promise<void> {
  try {
    await fetch("/api/auth/session", {
      method: "DELETE",
      credentials: "same-origin",
    });
  } catch {
    /* noop */
  }
}

export async function clearAuthToken(): Promise<void> {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  await clearSessionCookie();
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax",
    ...(secure ? (["Secure"] as const) : []),
  ];
  document.cookie = parts.join("; ");
}
