/**
 * Misma resolución de URL de imagen pública en servidor y cliente
 * (caché del pie, fetch del servidor, next/image).
 */
export function getPublicImageAbsoluteUrl(src: string): string {
  if (!src || !src.trim()) return src;
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  const api = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(
    /\/$/,
    ""
  );
  if (src.startsWith("/")) return `${api}${src}`;
  if (typeof window !== "undefined") {
    return new URL(src, window.location.origin).href;
  }
  return src;
}
