"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const ANIM_MS = 1200;

type Slice = { name: string; value: number; color: string };

export function StatsPieChart({
  data,
  height = 260,
}: {
  data: Slice[];
  height?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div style={{ height, width: "100%" }} className="min-w-[200px] max-w-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={92}
              paddingAngle={2}
              isAnimationActive
              animationDuration={ANIM_MS}
              animationEasing="ease-out"
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => [`RD$ ${v.toLocaleString("es-DO")}`, ""]}
              contentStyle={{
                background: "#171717",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-white/80">{d.name}</span>
            </span>
            <span className="tabular-nums text-white/60">
              {total > 0 ? `${Math.round((d.value / total) * 100)}%` : "0%"} · RD${" "}
              {Math.round(d.value).toLocaleString("es-DO")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
