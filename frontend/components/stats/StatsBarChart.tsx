"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ANIM_MS = 1200;

export function StatsBarChart({
  data,
  dataKey,
  nameKey,
  yMax,
  height = 280,
}: {
  data: { name: string; value: number }[];
  dataKey?: string;
  nameKey?: string;
  yMax?: number;
  height?: number;
}) {
  const dk = dataKey ?? "value";
  const nk = nameKey ?? "name";
  return (
    <div style={{ height }} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 32 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.1)" horizontal vertical={false} />
          <XAxis
            dataKey={nk}
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            interval={0}
            angle={-12}
            textAnchor="end"
            height={48}
          />
          <YAxis
            domain={yMax != null ? [0, yMax] : [0, "auto"]}
            tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
            tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
          />
          <Tooltip
            contentStyle={{
              background: "#171717",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Bar
            dataKey={dk}
            fill="#ec4899"
            radius={[6, 6, 0, 0]}
            isAnimationActive
            animationDuration={ANIM_MS}
            animationEasing="ease-out"
            name="Ingresos"
          />
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-3 text-center text-[10px] text-white/40">■ Ingresos</p>
    </div>
  );
}
