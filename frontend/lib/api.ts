import { getAuthToken } from "./authToken";

const BASE =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
/** Por defecto 45s: registro/login y dashboard pueden superar 12s en local o API fría. */
const API_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 45000);

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
    const name = (e as { name?: string })?.name;
    if (name === "AbortError") {
      throw new Error("La solicitud tardó demasiado. Intenta de nuevo.");
    }
    if (e instanceof TypeError) {
      throw new Error(
        "No se pudo conectar con el servidor. Comprueba que la API esté en marcha (NEXT_PUBLIC_API_URL)."
      );
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
