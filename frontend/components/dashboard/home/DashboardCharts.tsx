"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/format";

const PURPLE = "#C77DFF";
const PURPLE_SOFT = "#9B7FCA";

export function RevenueTrendChart({
  data,
  loading,
}: {
  data: { day: string; total: number }[];
  loading: boolean;
}) {
  const rows = data
    .map((x) => ({ day: String(x.day).slice(5), total: Number(x.total || 0) }))
    .slice(-30);

  const total = rows.reduce((acc, r) => acc + r.total, 0);
  const avg = rows.length > 0 ? total / rows.length : 0;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111118] p-5 lg:col-span-2">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-400">Ingresos últimos 30 días</p>
          <p className="mt-1 text-lg font-bold text-white">{formatMoney(total)}</p>
        </div>
        <span className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-slate-400">
          Media diaria: {formatMoney(avg)}
        </span>
      </div>
      <div className="h-60">
        {loading ? (
          <div className="h-full animate-pulse rounded-lg bg-white/5" />
        ) : rows.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Aún no hay ventas para mostrar.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows}>
              <defs>
                <linearGradient id="purpleFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PURPLE} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={PURPLE} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="day" tick={{ fill: "#7A7A85", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fill: "#7A7A85", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
              />
              <Tooltip
                contentStyle={{
                  background: "#0f111a",
                  border: "1px solid rgba(199,125,255,0.25)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
                labelStyle={{ color: "#E0AAFF", fontWeight: 600 }}
                formatter={(v: number) => [formatMoney(v), "Ingresos"]}
              />
              <Area type="monotone" dataKey="total" stroke={PURPLE} strokeWidth={2.2} fill="url(#purpleFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export function RevenueBreakdownChart({
  data,
}: {
  data: { eventId: string; eventTitle: string; tickets: number; tables: number }[];
}) {
  const totals = data.reduce(
    (acc, r) => ({ tickets: acc.tickets + r.tickets, tables: acc.tables + r.tables }),
    { tickets: 0, tables: 0 }
  );
  const sum = totals.tickets + totals.tables;
  const pieData = [
    { name: "Entradas", value: totals.tickets, color: PURPLE },
    { name: "Mesas / reservas", value: totals.tables, color: PURPLE_SOFT },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#111118] p-5">
      <p className="text-xs uppercase tracking-wider text-slate-400">Mix de ventas</p>
      <p className="mt-1 text-lg font-bold text-white">{sum.toLocaleString("es-ES")} transacciones</p>
      <div className="mt-3 h-40">
        {sum === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">Sin datos aún.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={64}
                paddingAngle={3}
                stroke="none"
              >
                {pieData.map((p) => (
                  <Cell key={p.name} fill={p.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0f111a",
                  border: "1px solid rgba(199,125,255,0.25)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      <ul className="mt-3 space-y-2">
        {pieData.map((p) => {
          const pctVal = sum > 0 ? Math.round((p.value / sum) * 100) : 0;
          return (
            <li key={p.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                {p.name}
              </span>
              <span className="text-slate-400">
                <span className="tabular-nums text-white">{p.value}</span>
                <span className="ml-1.5 text-xs">({pctVal}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
