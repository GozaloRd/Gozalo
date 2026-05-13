export function formatRD(value: number): string {
  return `RD$ ${Math.round(Number(value || 0)).toLocaleString("es-DO")}`;
}

const DO_TIMEZONE = "America/Santo_Domingo";

/** NBSP/NNBSP differ between Node and browsers and break React hydration if used raw. */
function normalizeLocaleText(s: string): string {
  return s
    .replace(/[\u00A0\u202F\u2007\uFEFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const s = new Intl.DateTimeFormat("es-DO", {
    timeZone: DO_TIMEZONE,
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
  return normalizeLocaleText(s);
}

export function formatEventTime(startIso: string, endIso?: string): string {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return "—";
  const timeFmt = new Intl.DateTimeFormat("es-DO", {
    timeZone: DO_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const startText = normalizeLocaleText(timeFmt.format(start));
  if (!endIso) return startText;
  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) return startText;
  const endText = normalizeLocaleText(timeFmt.format(end));
  return `${startText} — ${endText}`;
}

export function googleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
