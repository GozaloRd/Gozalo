"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { GlassCard } from "@/components/dashboard/GlassCard";
import { useDashboard } from "@/contexts/DashboardContext";
import { fetchReports } from "@/lib/dashboardApi";
import { formatMoney } from "@/lib/format";

const COLORS = ["#2979FF", "#FF1744", "#10B981", "#A78BFA"];

export default function DashboardReportesPage() {
  const { venueId } = useDashboard();
  const [period, setPeriod] = useState<"hoy" | "semana" | "mes" | "custom">("mes");
  const [data, setData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!venueId) return;
    (async () => {
      try {
        const r = await fetchReports(venueId);
        setData(r as Record<string, unknown>);
      } catch {
        setData(null);
      }
    })();
  }, [venueId, period]);

  const daily = (data?.ventasDiariasUltimos30 as { day?: string; total?: string }[]) || [];
  const lineData = daily.slice(-14).map((d) => ({
    name: String(d.day || "").slice(5),
    ingresos: Number(d.total) || 0,
  }));
  const barCompare = [
    { name: "Reservas", v: Number((data?.ingresosPorTipoRD as { reservas?: number })?.reservas ?? 0) },
    { name: "Tickets", v: Number((data?.ingresosPorTipoRD as { tickets?: number })?.tickets ?? 0) },
  ];
  const payMethods =
    (data?.metodosDePago as { method?: string; total?: string }[])?.map((m) => ({
      name: m.method || "—",
      value: Number(m.total) || 0,
    })) || [];
  const byEvent =
    (data?.ventasPorEvento as { title?: string; id?: string; total?: string }[])?.map((e) => ({
      evento: e.title || e.id || "—",
      total: Number(e.total) || 0,
    })) || [];
  const waiters =
    (data?.rankingCamareros as { nombre?: string; ventas?: string }[])?.map((w) => ({
      nombre: w.nombre || "—",
      ventas: Number(w.ventas) || 0,
    })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Reportes</h1>
          <p className="text-sm text-slate-400">Ingresos, desempeño y métodos de pago</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["hoy", "semana", "mes", "custom"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                period === p
                  ? "bg-[#2979FF]/30 text-[#93C5FD]"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {p === "custom" ? "Personalizado" : p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h2 className="text-sm font-semibold text-[#2979FF]">Ingresos (línea)</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ background: "#12121c", border: "1px solid rgba(255,255,255,0.1)" }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <Line type="monotone" dataKey="ingresos" stroke="#2979FF" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <h2 className="text-sm font-semibold text-[#FF1744]">Reservas vs tickets (ingresos RD$)</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barCompare}>
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Bar dataKey="v" fill="#FF1744" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassCard className="p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-white">Métodos de pago</h2>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={payMethods}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {payMethods.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white">Ranking camareros</h2>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">#</th>
                <th className="py-2">Nombre</th>
                <th className="py-2 text-right">Ventas</th>
              </tr>
            </thead>
            <tbody>
              {waiters.length === 0 ? (
                <tr className="border-t border-white/[0.06]">
                  <td colSpan={3} className="py-3 text-center text-slate-500">
                    Sin datos aún.
                  </td>
                </tr>
              ) : (
                waiters.map((w, i) => (
                  <tr key={w.nombre} className="border-t border-white/[0.06]">
                    <td className="py-2 text-slate-500">{i + 1}</td>
                    <td className="py-2 text-white">{w.nombre}</td>
                    <td className="py-2 text-right text-[#5B9DFF]">{formatMoney(w.ventas)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <h2 className="text-sm font-semibold text-white">Ingresos por evento</h2>
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Evento</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {byEvent.length === 0 ? (
              <tr className="border-t border-white/[0.06]">
                <td colSpan={2} className="py-3 text-center text-slate-500">
                  Sin datos aún.
                </td>
              </tr>
            ) : (
              byEvent.map((row, i) => (
                <tr key={i} className="border-t border-white/[0.06]">
                  <td className="py-2 text-slate-300">{(row as { evento?: string }).evento}</td>
                  <td className="py-2 text-right text-white">
                    {formatMoney(Number((row as { total?: number }).total))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </GlassCard>

      <button
        type="button"
        onClick={() => {
          const blob = new Blob([JSON.stringify(data || {}, null, 2)], { type: "application/json" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `reporte-gozalo-${Date.now()}.json`;
          a.click();
        }}
        className="rounded-xl border border-[#2979FF]/40 px-6 py-3 text-sm font-semibold text-[#7CB0FF]"
      >
        Exportar reporte (JSON)
      </button>
    </div>
  );
}
