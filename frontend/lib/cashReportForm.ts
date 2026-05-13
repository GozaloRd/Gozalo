/** Tipos y utilidades compartidas: reporte manual de caja (misma lógica que `/dashboard/caja`). */

export type MethodSlice = { cash: string; card: string; transfer: string };

export type BreakdownNums = {
  entradas: { cash: number; card: number; transfer: number; other: number };
  mesas: { cash: number; card: number; transfer: number; other: number };
  consumo: { cash: number; card: number; transfer: number; other: number };
};

export const emptySlice = (): MethodSlice => ({ cash: "", card: "", transfer: "" });

export function parseSlice(s: MethodSlice) {
  return {
    cash: Math.max(0, Number(s.cash || 0)),
    card: Math.max(0, Number(s.card || 0)),
    transfer: Math.max(0, Number(s.transfer || 0)),
    other: 0,
  };
}

export function buildBreakdown(e: MethodSlice, m: MethodSlice, c: MethodSlice): BreakdownNums {
  return {
    entradas: parseSlice(e),
    mesas: parseSlice(m),
    consumo: parseSlice(c),
  };
}

export function sumBreakdown(b: BreakdownNums) {
  let cash = 0;
  let card = 0;
  let transfer = 0;
  let other = 0;
  for (const ch of Object.values(b)) {
    cash += ch.cash;
    card += ch.card;
    transfer += ch.transfer;
    other += ch.other;
  }
  return { cash, card, transfer, other, grand: cash + card + transfer + other };
}

export function channelTotal(b: BreakdownNums, key: keyof BreakdownNums) {
  const x = b[key];
  return x.cash + x.card + x.transfer + x.other;
}

export function sliceSubtotal(s: MethodSlice) {
  return Math.max(0, Number(s.cash || 0)) + Math.max(0, Number(s.card || 0)) + Math.max(0, Number(s.transfer || 0));
}
