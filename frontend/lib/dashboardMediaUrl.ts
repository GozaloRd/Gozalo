/**
 * Las portadas del dashboard a veces vienen como rutas relativas (`/uploads/...`).
 * El navegador las pide contra el origen de Next (404); hay que prefijar la API.
 */
export function resolveDashboardMediaUrl(href: string | null | undefined): string | null {
  const u = href?.trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
  if (u.startsWith("/")) return `${base}${u}`;
  return `${base}/${u}`;
}
