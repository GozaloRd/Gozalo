/** Zona fija para que SSR (Node) y el navegador produzcan el mismo texto → sin errores de hidratación. */
const EVENT_TZ = "America/Santo_Domingo";

export function formatEventDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-DO", {
    timeZone: EVENT_TZ,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
