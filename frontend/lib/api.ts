import { getAuthToken } from "./authToken";

const BASE =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const API_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 12000);

export function getToken(): string | null {
  return getAuthToken();
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers, signal, ...rest } = options;
  const auth = token ?? getToken();
  const controller = signal ? null : new AbortController();
  const timeout = controller ? setTimeout(() => controller.abort(), API_TIMEOUT_MS) : null;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...rest,
      signal: signal ?? controller?.signal,
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
        ...headers,
      },
    });
  } catch (e) {
    if ((e as { name?: string })?.name === "AbortError") {
      throw new Error("La solicitud tardó demasiado. Intenta de nuevo.");
    }
    throw e;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  if (!res.ok) {
    let err: { error?: string } = {};
    try {
      err = await res.json();
    } catch {
      /* ignore */
    }
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
