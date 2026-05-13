"use client";

import { motion } from "framer-motion";
import {
  ChevronRight,
  Edit,
  Image,
  QrCode,
  Share2,
  TableProperties,
  Ticket,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { EventCardModel, EventDetailTab } from "./types";

export function EventDetailTabs({ event }: { event: EventCardModel }) {
  const [tab, setTab] = useState<EventDetailTab>("manage");
  const totalTicketRevenue = useMemo(
    () => event.ticketTypes.reduce((sum, row) => sum + row.sold * row.price, 0),
    [event.ticketTypes]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["manage", "Gestionar"],
            ["tickets", "Tickets"],
            ["tables", "Mesas"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium ${
              tab === id
                ? "border-orange-500/30 bg-orange-500/20 text-orange-400"
                : "border-white/10 bg-white/5 text-white/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "manage" ? (
        <div className="space-y-1">
          {[
            { id: "edit", Icon: Edit, label: "Editar informacion basica" },
            { id: "image", Icon: Image, label: "Cambiar flyer / imagen" },
            { id: "share", Icon: Share2, label: "Compartir evento" },
            { id: "qr", Icon: QrCode, label: "Ver codigo QR de acceso" },
            { id: "archive", Icon: Trash2, label: "Archivar evento", danger: true },
          ].map((action) => (
            <button
              key={action.id}
              type="button"
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-white/5 ${
                action.danger ? "hover:text-red-400" : "text-white/80"
              }`}
            >
              <span className="flex items-center gap-2">
                <action.Icon className="h-4 w-4" />
                <span className="text-sm">{action.label}</span>
              </span>
              <ChevronRight className="h-4 w-4 text-white/30" />
            </button>
          ))}
        </div>
      ) : null}

      {tab === "tickets" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <Ticket className="h-4 w-4 text-pink-400" />
              Tickets vendidos
            </p>
            <p className="text-xs text-white/50">
              {event.tickets} / {event.ticketTypes.reduce((sum, row) => sum + row.total, 0)} vendidos
            </p>
          </div>
          {event.ticketTypes.length === 0 ? (
            <p className="rounded-lg bg-white/5 p-3 text-sm text-white/50">No hay tipos de entrada configurados.</p>
          ) : (
            event.ticketTypes.map((row) => {
              const pct = row.total > 0 ? Math.min(100, Math.round((row.sold / row.total) * 100)) : 0;
              return (
                <div key={row.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-white">{row.name}</p>
                    <p className="text-sm text-white/60">RD$ {row.price.toLocaleString("es-DO")}</p>
                  </div>
                  <p className="mt-1 text-xs text-white/50">
                    {row.sold}/{row.total} vendidos - RD$ {(row.sold * row.price).toLocaleString("es-DO")}
                  </p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full bg-orange-500"
                    />
                  </div>
                </div>
              );
            })
          )}
          <p className="text-sm text-white/60">
            Total vendido: <strong className="text-white">{event.tickets}</strong>
          </p>
          <p className="text-sm text-white/60">
            Total ingresos (estim. por tipo):{" "}
            <strong className="text-white">RD$ {totalTicketRevenue.toLocaleString("es-DO")}</strong>
          </p>
        </div>
      ) : null}

      {tab === "tables" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              <TableProperties className="h-4 w-4 text-orange-400" />
              Reservas de mesa
            </p>
            <p className="text-xs text-white/50">
              {event.tableZones.reduce((sum, z) => sum + z.reserved, 0)} /{" "}
              {event.tableZones.reduce((sum, z) => sum + z.totalTables, 0)} reservadas
            </p>
          </div>
          {event.tableZones.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-sm text-white/50">Sin zonas configuradas para este evento</p>
              <button type="button" className="mt-2 text-sm font-medium text-orange-400">
                + Anadir zona
              </button>
            </div>
          ) : (
            event.tableZones.map((zone) => {
              const pct = zone.totalTables > 0 ? Math.round((zone.reserved / zone.totalTables) * 100) : 0;
              return (
                <div key={zone.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="font-semibold text-white">{zone.name}</p>
                  <p className="mt-1 text-xs text-white/50">
                    {zone.peoplePerTable} personas/mesa - RD$ {zone.minSpend.toLocaleString("es-DO")} minimo
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    {zone.reserved}/{zone.totalTables} reservadas ({pct}%)
                  </p>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                      className="h-full rounded-full bg-orange-500"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
