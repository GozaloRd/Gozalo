"use client";

import { useEffect, useState } from "react";
import { EmptyModuleState } from "@/components/dashboard/EmptyModuleState";
import { GlassCard } from "@/components/dashboard/GlassCard";
import { useDashboard } from "@/contexts/DashboardContext";
import { fetchDashboardEvents } from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";
import Link from "next/link";

type Tt = { id: string; name: string; price: string | number; quantityTotal?: number; soldCount?: number };
type Ev = {
  id: string;
  title: string;
  startAt: string;
  status?: string;
  ticketTypes?: Tt[];
  metricas?: { vendidas?: number };
};

export default function DashboardTicketsPage() {
  const { venueId } = useDashboard();
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venueId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = (await fetchDashboardEvents("all", venueId)) as { data?: Ev[] };
        const rows = (res.data ?? []).filter((ev) => ev.status !== "cancelled");
        if (!cancelled) setEvents(rows);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [venueId]);

  if (loading) {
    return <p className="text-slate-500">Cargando entradas…</p>;
  }

  if (!events.length) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold text-gozalo-cream">Entradas y tipos</h1>
        <EmptyModuleState
          title="Sin eventos próximos"
          description="Crea un evento publicado y define tipos de entrada (General, VIP…) con precio y cupo."
          actionHref="/dashboard/eventos"
          actionLabel="Ir a eventos"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gozalo-cream">Entradas y tipos</h1>
        <p className="mt-1 text-sm text-slate-400">Precios, cupos y ventas por evento</p>
      </div>
      <div className="space-y-4">
        {events.map((ev) => (
          <GlassCard key={ev.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-medium text-white">{ev.title}</h2>
                <p className="text-xs text-slate-500">
                  {new Date(ev.startAt).toLocaleString("es-DO", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <Link href="/dashboard/eventos" className="text-xs text-[#B39CD8]/90 hover:underline">
                Editar evento
              </Link>
            </div>
            {ev.ticketTypes && ev.ticketTypes.length > 0 ? (
              <ul className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
                {ev.ticketTypes.map((tt) => (
                  <li
                    key={tt.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300"
                  >
                    <span>{tt.name}</span>
                    <span className="text-[#D4C2EE]/90">{formatMoney(Number(tt.price))}</span>
                    <span className="text-xs text-slate-500">
                      {tt.soldCount ?? 0} / {tt.quantityTotal ?? "∞"} vendidos
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Sin tipos de entrada — añádelos al editar el evento.</p>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
