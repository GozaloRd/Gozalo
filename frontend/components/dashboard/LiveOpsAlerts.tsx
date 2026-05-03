"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { fetchOpsAlerts, type OpsAlert } from "@/lib/alertsApi";
import { useDashboard } from "@/contexts/DashboardContext";

const POLL_MS = 30_000;

function categoryIcon(category: OpsAlert["category"]) {
  switch (category) {
    case "aforo":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 3v18M5 21v-7a2 2 0 012-2h10a2 2 0 012 2v7" />
        </svg>
      );
    case "mesa":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="8" width="18" height="8" rx="1" />
          <path d="M6 16v4M18 16v4" />
        </svg>
      );
    case "caja":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18M8 14h3" />
        </svg>
      );
    case "evento":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v4M16 3v4" />
        </svg>
      );
  }
}

function severityTheme(sev: OpsAlert["severity"]) {
  if (sev === "danger") {
    return "border-rose-400/40 bg-rose-500/10 text-rose-100";
  }
  if (sev === "warn") {
    return "border-amber-400/40 bg-amber-500/10 text-amber-100";
  }
  return "border-[#C77DFF]/40 bg-[#C77DFF]/10 text-[#E0AAFF]";
}

function severityDot(sev: OpsAlert["severity"]) {
  if (sev === "danger") return "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.8)]";
  if (sev === "warn") return "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]";
  return "bg-[#C77DFF] shadow-[0_0_10px_rgba(199,125,255,0.6)]";
}

export default function LiveOpsAlerts() {
  const { venueId } = useDashboard();
  const [data, setData] = useState<OpsAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [compactOpen, setCompactOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!venueId) return;
    try {
      const res = await fetchOpsAlerts(venueId);
      setData(res.data);
      setLastUpdate(new Date(res.generatedAt));
    } catch {
      // silencioso: UI sigue mostrando lo anterior
    } finally {
      setLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    load();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(load, POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  const summary = useMemo(() => {
    const s = { danger: 0, warn: 0, info: 0 };
    for (const a of data) s[a.severity]++;
    return s;
  }, [data]);

  const warnAttentionCount = summary.danger + summary.warn;

  const compactBannerLabel =
    data.length > 0 ? (
      <span className="min-w-0 truncate font-medium text-white/90">{data[0]!.title}</span>
    ) : (
      <span className="font-medium text-white/75">Operación al día</span>
    );

  const compactBadge =
    data.length > 0 ? (
      <span className="shrink-0 rounded-md bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-200">
        {warnAttentionCount > 0 ? `${warnAttentionCount} atención${warnAttentionCount === 1 ? "" : "es"}` : `${data.length} alerta${data.length === 1 ? "" : "s"}`}
      </span>
    ) : (
      <span className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200/90">
        0
      </span>
    );

  if (loading && data.length === 0) {
    return (
      <>
        <div className="rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-slate-400 md:hidden">
          Cargando alertas…
        </div>
        <div className="hidden rounded-2xl border border-white/10 bg-[#111118] px-4 py-3 text-sm text-slate-400 md:block">
          Cargando alertas operativas…
        </div>
      </>
    );
  }

  return (
    <>
      {/* ——— Móvil &lt; md: banner compacto ——— */}
      <section className="relative z-[5] md:hidden" aria-label="Alertas operativas">
        {data.length === 0 ? (
          <div className="flex w-full items-center justify-between gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/5 px-3.5 py-3 text-[13px] text-emerald-100">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
              <span className="truncate">Sin alertas operativas</span>
            </span>
            {lastUpdate && (
              <span className="shrink-0 text-[11px] text-emerald-300/70">
                {lastUpdate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        ) : (
          <>
        <button
          type="button"
          onClick={() => setCompactOpen((o) => !o)}
          className="flex w-full items-center gap-2 rounded-2xl border border-white/[0.08] bg-[#1a1a1f] px-3.5 py-3 text-left transition active:scale-[0.98] motion-safe:duration-150"
        >
          <span className="grid min-w-0 flex-1 grid-cols-[1fr_auto_auto] items-center gap-2">
            <span className="flex min-w-0 items-center gap-2 border-r border-white/[0.06] pr-2">
              {compactBannerLabel}
            </span>
            <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden />
            {compactBadge}
          </span>
          <span
            className={`shrink-0 text-slate-500 transition-transform ${compactOpen ? "rotate-180" : ""}`}
            aria-hidden
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>
        {compactOpen && data.length > 0 && (
          <div className="mt-2 space-y-2">
            {data.map((a) => {
              const inner = (
                <div
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${severityTheme(a.severity)}`}
                >
                  <span className={`mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${severityDot(a.severity)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-tight">{a.title}</p>
                    <p className="mt-0.5 opacity-85 leading-snug">{a.detail}</p>
                  </div>
                  {a.href ? <span className="shrink-0 opacity-60">→</span> : null}
                </div>
              );
              return a.href ? (
                <Link key={a.id} href={a.href} className="block">
                  {inner}
                </Link>
              ) : (
                <div key={a.id}>{inner}</div>
              );
            })}
          </div>
        )}
          </>
        )}
      </section>

      {/* ——— Tablet+ vista completa ——— */}
      {data.length === 0 ? (
        <div className="hidden items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-200 md:flex">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            Todo bajo control. Sin alertas operativas.
          </span>
          {lastUpdate && (
            <span className="text-xs text-emerald-300/70">
              {lastUpdate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      ) : (
        <section className="hidden rounded-2xl border border-white/10 bg-[#0c0c12] p-4 md:block">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-white">
                <span
                  className={`h-2 w-2 rounded-full ${summary.danger > 0 ? "bg-rose-400 shadow-[0_0_10px_rgba(251,113,133,0.9)] animate-pulse" : "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.7)]"}`}
                />
                Alertas operativas ({data.length})
              </span>
              <div className="flex gap-1 text-xs">
                {summary.danger > 0 && (
                  <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-rose-200">
                    {summary.danger} crítica{summary.danger === 1 ? "" : "s"}
                  </span>
                )}
                {summary.warn > 0 && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-amber-200">
                    {summary.warn} atenci{summary.warn === 1 ? "ón" : "ones"}
                  </span>
                )}
                {summary.info > 0 && (
                  <span className="rounded-full bg-[#C77DFF]/20 px-2 py-0.5 text-[#E0AAFF]">
                    {summary.info} info
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {lastUpdate && (
                <span>
                  Últ. {lastUpdate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                type="button"
                onClick={() => setCollapsed((c) => !c)}
                className="rounded-md border border-white/10 px-2 py-1 transition-colors hover:border-[#C77DFF]/50 hover:text-white"
              >
                {collapsed ? "Mostrar" : "Ocultar"}
              </button>
            </div>
          </header>
          {!collapsed && (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {data.map((a) => {
                const content = (
                  <div
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-all hover:scale-[1.01] hover:shadow-lg ${severityTheme(a.severity)}`}
                  >
                    <span className={`mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full ${severityDot(a.severity)}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {categoryIcon(a.category)}
                        <span className="truncate">{a.title}</span>
                      </div>
                      <p className="mt-1 text-xs opacity-80 leading-relaxed">{a.detail}</p>
                    </div>
                    {a.href && <span className="text-xs opacity-60 flex-shrink-0">→</span>}
                  </div>
                );
                return a.href ? (
                  <Link key={a.id} href={a.href} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={a.id}>{content}</div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </>
  );
}
