/** Línea compacta tipo: "Cupid · 20 may · 11:30 p. m." */
export function formatAccessEventLine(title: string, startAtIso: string, locale = "es-DO") {
  const d = new Date(startAtIso);
  if (Number.isNaN(d.getTime())) return title;
  const dateStr = d.toLocaleDateString(locale, { day: "numeric", month: "short" });
  const timeStr = d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  return `🎉 ${title} · ${dateStr} · ${timeStr}`;
}
