"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LineDatum } from "./types";

const ANIM_MS = 1200;

export function StatsLineChart({
  data,
  showSecondLine,
  showArea,
  yMax,
  height = 260,
}: {
  data: LineDatum[];
  /** Línea punteada indigo (proyección / tendencia) */
  showSecondLine?: boolean;
  showArea?: boolean;
  /** Si se omite, Recharts escala solo */
  yMax?: number;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.1)" horizontal vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} />
          <YAxis
            domain={yMax != null ? [0, yMax] : ["auto", "auto"]}
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
            labelStyle={{ color: "rgba(255,255,255,0.7)" }}
          />
          {showArea ? (
            <Area
              type="monotone"
              dataKey="value"
              stroke="transparent"
              fill="rgba(236,72,153,0.08)"
              fillOpacity={1}
              isAnimationActive
              animationDuration={ANIM_MS}
              animationEasing="ease-out"
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#ec4899"
            strokeWidth={2.5}
            dot={{ fill: "#ec4899", r: showArea ? 3 : 4 }}
            activeDot={{ r: 6 }}
            isAnimationActive
            animationDuration={ANIM_MS}
            animationEasing="ease-out"
          />
          {showSecondLine ? (
            <Line
              type="monotone"
              dataKey="secondary"
              stroke="#818cf8"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ fill: "#818cf8", r: 3 }}
              isAnimationActive
              animationDuration={ANIM_MS}
              animationEasing="ease-out"
            />
          ) : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
