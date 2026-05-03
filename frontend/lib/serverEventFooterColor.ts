import { getColor } from "colorthief";
import { Buffer } from "node:buffer";
import {
  buildFooterThemeFromDominantRgb,
  type EventImageFooterTheme,
} from "@/lib/eventFooterTheme";
import { getPublicImageAbsoluteUrl } from "@/lib/publicImageUrl";

/**
 * Color dominante de la carátula (misma lógica que getColor en cliente) → tema del pie.
 */
export async function fetchFooterThemeForImageUrl(
  imageUrl: string
): Promise<EventImageFooterTheme | null> {
  const url = getPublicImageAbsoluteUrl(imageUrl);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    if (ab.byteLength < 80) return null;
    const nodeBuf = Buffer.from(ab);
    const c = await getColor(nodeBuf, { colorCount: 8, quality: 10 });
    if (!c) return null;
    const rgb = typeof c.array === "function" ? c.array() : null;
    if (!rgb || rgb.length < 3) return null;
    const [r, g, b] = rgb;
    return buildFooterThemeFromDominantRgb({ r, g, b });
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

type EvRow = { id: string; image: string | null | undefined };

/**
 * Precomputa temas en el request del servidor: el primer HTML ya trae el color del pie.
 * Limita imágenes únicas y concurrencia para no alargar TTFB.
 */
export async function precomputeServerFooterThemes(
  events: EvRow[],
  options?: { maxUniqueImages?: number; concurrency?: number }
): Promise<Record<string, EventImageFooterTheme>> {
  try {
    const maxU = options?.maxUniqueImages ?? 40;
    const conc = options?.concurrency ?? 4;
    const byUrl = new Map<string, EventImageFooterTheme>();
    const seen = new Set<string>();
    const uniqueUrls: string[] = [];
    for (const e of events) {
      if (!e?.image) continue;
      const abs = getPublicImageAbsoluteUrl(e.image);
      if (seen.has(abs)) continue;
      seen.add(abs);
      uniqueUrls.push(abs);
      if (uniqueUrls.length >= maxU) break;
    }
    for (let i = 0; i < uniqueUrls.length; i += conc) {
      const batch = uniqueUrls.slice(i, i + conc);
      const results = await Promise.all(
        batch.map(async (u) => {
          try {
            const theme = await fetchFooterThemeForImageUrl(u);
            return { u, theme } as const;
          } catch {
            return { u, theme: null } as const;
          }
        })
      );
      for (const { u, theme } of results) {
        if (theme) byUrl.set(u, theme);
      }
    }
    const byId: Record<string, EventImageFooterTheme> = {};
    for (const e of events) {
      if (!e?.image) continue;
      const abs = getPublicImageAbsoluteUrl(e.image);
      const t = byUrl.get(abs);
      if (t) byId[e.id] = t;
    }
    return byId;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error("[precomputeServerFooterThemes]", err);
    }
    return {};
  }
}
