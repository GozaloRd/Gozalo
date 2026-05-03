import { CURRENCY } from "./constants";

/**
 * Node (SSR) y el navegador pueden usar distintos caracteres Unicode en
 * toLocaleString (p. ej. espacio estrecho sin salto U+202F vs espacio normal),
 * provocando errores de hidratación aunque el texto se vea igual.
 */
function normalizeLocaleOutput(s: string): string {
  return s
    .replace(/\u202f/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\u2009/g, " ")
    .replace(/\u2007/g, " ");
}

export function formatMoney(amount: number) {
  return normalizeLocaleOutput(
    `${CURRENCY} ${amount.toLocaleString("es-DO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`
  );
}

const DATE_TIME_OPTS: Intl.DateTimeFormatOptions = {
  timeZone: "America/Santo_Domingo",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
};

export function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return normalizeLocaleOutput(d.toLocaleString("es-DO", DATE_TIME_OPTS));
}
