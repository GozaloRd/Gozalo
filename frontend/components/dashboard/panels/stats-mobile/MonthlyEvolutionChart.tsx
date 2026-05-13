"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MonthlyEvolutionPoint } from "@/lib/statsMobileDerive";
import { formatMoney } from "@/lib/format";
import { StatsEmptyState } from "@/components/dashboard/panels/stats-mobile/StatsEmptyState";

export function MonthlyEvolutionChart({ points }: { points: MonthlyEvolutionPoint[] }) {
  const showAttLine = points.some((p) => p.attendanceHint > 0);

  if (points.length < 2) {
    const noMonths = points.length === 0;
    return (
      <StatsEmptyState
        className="min-h-[160px]"
        title={noMonths ? "Aún no hay evolución mensual" : "Hace falta un mes más de historia"}
        reason={
          noMonths
            ? "No hay ingresos agrupados por mes en el historial del informe (suele pasar al empezar o sin ventas registradas)."
            : "Con solo un mes con ventas no podemos dibujar una tendencia entre meses."
        }
        action={
          noMonths
            ? "Registra ventas y pagos; cuando haya actividad en meses distintos, verás la curva aquí."
            : "Cuando tengas ventas en al menos dos meses, el gráfico se activará solo."
        }
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="h-44 w-full min-h-[176px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis
              yAxisId="left"
              tick={{ fill: "#71717a", fontSize: 9 }}
              tickFormatter={(v) => (Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v))}
            />
            {showAttLine ? (
              <YAxis yAxisId="right" orientation="right" tick={{ fill: "#52525b", fontSize: 9 }} />
            ) : null}
            <Tooltip
              contentStyle={{
                background: "#18181b",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) =>
                name === "attendanceHint"
                  ? [String(value), "Asist. (estim.)"]
                  : [formatMoney(value), "Ingresos"]
              }
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              name="Ingresos"
              stroke="#EC4899"
              strokeWidth={2}
              dot={{ r: 3, fill: "#EC4899" }}
              activeDot={{ r: 5 }}
            />
            {showAttLine ? (
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="attendanceHint"
                name="attendanceHint"
                stroke="#A855F7"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 4"
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
