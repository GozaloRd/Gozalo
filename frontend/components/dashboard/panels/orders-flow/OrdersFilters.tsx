"use client";

const BTN =
  "min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/40";

export type OrdersFilterState = {
  period: "today" | "week" | "month";
  status: "all" | "completed" | "pending" | "refunded";
  type: "all" | "tickets" | "mesas";
  eventId: string | null;
};

export function OrdersFilters({
  value,
  onChange,
  events,
  eventsLoading,
  search,
  debouncedSearch,
  onSearchChange,
}: {
  value: OrdersFilterState;
  onChange: (next: OrdersFilterState) => void;
  events: { id: string; title: string }[];
  eventsLoading: boolean;
  search: string;
  debouncedSearch: string;
  onSearchChange: (q: string) => void;
}) {
  const chip = (active: boolean) =>
    active
      ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-200"
      : "border-zinc-700 bg-zinc-950/50 text-slate-400 hover:border-zinc-600";

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Período</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["today", "Hoy"],
              ["week", "Semana"],
              ["month", "Mes"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`${BTN} ${chip(value.period === k)}`}
              onClick={() => onChange({ ...value, period: k })}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
          <span className="text-slate-400">Hoy</span> solo incluye filas creadas desde medianoche de hoy. Reservas u órdenes de días
          anteriores aparecen con <span className="text-slate-400">Semana</span> o <span className="text-slate-400">Mes</span>.
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Estado</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Todas"],
              ["completed", "✅ Completadas"],
              ["pending", "⏳ Pendientes"],
              ["refunded", "↩️ Reembolsadas"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`${BTN} ${chip(value.status === k)}`}
              onClick={() => onChange({ ...value, status: k })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Tipo</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "Todas"],
              ["tickets", "🎟️ Tickets"],
              ["mesas", "🪑 Mesas"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`${BTN} ${chip(value.type === k)}`}
              onClick={() => onChange({ ...value, type: k })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="orders-event" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Evento
        </label>
        <select
          id="orders-event"
          disabled={eventsLoading}
          value={value.eventId ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              eventId: e.target.value.length ? e.target.value : null,
            })
          }
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
        >
          <option value="">Todos los eventos</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="orders-search" className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Buscar
        </label>
        <input
          id="orders-search"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cliente, ID o monto"
          autoComplete="off"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
        />
        {debouncedSearch !== search ? (
          <p className="mt-1 text-[10px] text-slate-600">Esperando…</p>
        ) : null}
      </div>
    </div>
  );
}
