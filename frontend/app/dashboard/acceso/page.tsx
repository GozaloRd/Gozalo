"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import {
  fetchDashboardEvents,
  fetchDashboardReservations,
  fetchDashboardTables,
  fetchOccupancy,
  patchReservationStatus,
  scanAccess,
} from "@/lib/dashboardApi";

type EventOpt = { id: string; title: string; status?: string; publicado?: boolean };
type ReservationRow = {
  id: string;
  cliente?: { nombre?: string };
  evento?: { id?: string };
  mesa?: string;
  partySize?: number;
  estado?: string;
};
type TableRow = { id: string; zone: string; label: string; capacity?: number };

export default function DashboardAccesoPage() {
  const { venueId } = useDashboard();
  const [events, setEvents] = useState<EventOpt[]>([]);
  const [eventId, setEventId] = useState("");
  const [tables, setTables] = useState<TableRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [coverCode, setCoverCode] = useState("");
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [occ, setOcc] = useState<{ venueCapacity?: number; successfulScans?: number } | null>(null);
  const [manualByTable, setManualByTable] = useState<Record<string, number>>({});
  const scannerRef = useRef<{
    isScanning?: boolean;
    stop: () => Promise<void>;
    clear: () => void | Promise<void>;
  } | null>(null);

  const load = useCallback(async () => {
    if (!venueId) return;
    try {
      const ev = await fetchDashboardEvents("upcoming", venueId);
      const evRaw = (ev as { data?: EventOpt[] })?.data ?? [];
      const pub = evRaw.filter((e) => (e.publicado ?? e.status === "published"));
      setEvents(pub);
      const currentId = eventId || pub[0]?.id || "";
      setEventId(currentId);
      if (!currentId) {
        setTables([]);
        setReservations([]);
        return;
      }
      const [tb, rr, oo] = await Promise.all([
        fetchDashboardTables(currentId, venueId, { tableScope: "event" }),
        fetchDashboardReservations({ eventId: currentId, pageSize: "300" }, venueId),
        fetchOccupancy(currentId, venueId).catch(() => null),
      ]);
      setTables((tb as { mesas?: TableRow[] })?.mesas ?? []);
      setReservations((rr as { data?: ReservationRow[] })?.data ?? []);
      setOcc(oo as { venueCapacity?: number; successfulScans?: number } | null);
    } catch {
      setTables([]);
      setReservations([]);
    }
  }, [venueId, eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const tableBoard = useMemo(() => {
    const rows = tables.map((t) => {
      const linked = reservations.filter((r) => {
        const mesa = String(r.mesa ?? "").toLowerCase();
        return mesa.includes(t.label.toLowerCase()) || mesa.includes(`${t.zone} ${t.label}`.toLowerCase());
      });
      const checkedIn = linked.filter((r) => r.estado === "checked_in" || r.estado === "completed");
      const reserved = linked.filter((r) => r.estado === "pending" || r.estado === "confirmed");
      const inside = checkedIn.reduce((acc, r) => acc + Number(r.partySize ?? 0), 0);
      const reservedPeople = reserved.reduce((acc, r) => acc + Number(r.partySize ?? 0), 0);
      const cap = Number(t.capacity ?? 0);
      const missing = Math.max(0, reservedPeople - inside);
      const manual = Number(manualByTable[t.id] ?? 0);
      const manualInside = Math.max(0, inside + manual);
      const state = manualInside > 0 ? "ocupada" : reserved.length > 0 ? "reservada" : "libre";
      const occupancyPct = cap > 0 ? Math.min(100, Math.round((manualInside / cap) * 100)) : 0;
      return { ...t, state, inside, manualInside, reservedPeople, missing, cap, occupancyPct };
    });
    return rows;
  }, [tables, reservations, manualByTable]);

  const checkedInReservations = reservations.filter((r) => r.estado === "checked_in" || r.estado === "completed");
  const peopleInTables = checkedInReservations.reduce((acc, r) => acc + Number(r.partySize ?? 0), 0);
  const ticketScans = Number(occ?.successfulScans ?? 0);
  const totalAforo = ticketScans + peopleInTables;

  function updateManualCount(tableId: string, delta: number) {
    setManualByTable((prev) => {
      const current = Number(prev[tableId] ?? 0);
      const next = current + delta;
      return { ...prev, [tableId]: next };
    });
  }

  async function validateCover() {
    if (!coverCode.trim() || !eventId) return;
    try {
      const res = await scanAccess(coverCode.trim(), eventId, venueId);
      setScanMsg((res as { message?: string })?.message ?? "Cover validado");
      setCoverCode("");
      await load();
    } catch (e) {
      setScanMsg(e instanceof Error ? e.message : "Error validando cover");
    }
  }

  async function stopCamera() {
    try {
      const scanner = scannerRef.current;
      if (scanner) {
        if (scanner.isScanning) {
          await scanner.stop();
        }
        await scanner.clear();
        scannerRef.current = null;
      }
    } catch {
      // No interrumpimos la UI si falla al cerrar.
    } finally {
      setIsCameraOpen(false);
      setIsStartingCamera(false);
    }
  }

  async function startCamera() {
    if (!eventId) {
      setScanMsg("Selecciona un evento antes de escanear.");
      return;
    }
    setIsStartingCamera(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras.length) {
        setScanMsg("No se detectó ninguna cámara disponible.");
        setIsStartingCamera(false);
        return;
      }

      const scanner = new Html5Qrcode("cover-camera-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          if (!decodedText) return;
          await stopCamera();
          setCoverCode(decodedText);
          try {
            const res = await scanAccess(decodedText.trim(), eventId, venueId);
            setScanMsg((res as { message?: string })?.message ?? "Cover validado");
            setCoverCode("");
            await load();
          } catch (e) {
            setScanMsg(e instanceof Error ? e.message : "Error validando cover");
          }
        },
        () => {}
      );

      setIsCameraOpen(true);
      setScanMsg("Cámara activa. Apunta al QR del cover.");
    } catch (e) {
      setScanMsg(e instanceof Error ? e.message : "No se pudo iniciar la cámara.");
      await stopCamera();
    } finally {
      setIsStartingCamera(false);
    }
  }

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current;
      if (!scanner) return;
      void (async () => {
        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
          await scanner.clear();
        } catch {
          // Ignorar errores al desmontar.
        }
      })();
    };
  }, []);

  async function checkInReservation(id: string) {
    try {
      await patchReservationStatus(id, "checked_in");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Control de acceso</h1>
        <p className="text-sm text-slate-400">
          Valida covers y check-in de reservas para controlar aforo general y ocupación de mesas.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#12121c] px-3 py-2 text-sm text-white"
        >
          <option value="">Selecciona evento publicado</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#111118] p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">QR de cover validados</p>
          <p className="mt-2 text-2xl font-bold text-[#7CB0FF]">{ticketScans}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111118] p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Personas en mesas (check-in)</p>
          <p className="mt-2 text-2xl font-bold text-[#D4C2EE]">{peopleInTables}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111118] p-4">
          <p className="text-xs uppercase tracking-wider text-slate-500">Aforo total contabilizado</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">{totalAforo}</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#111118] p-4">
        <p className="text-sm font-semibold text-white">Validar cover (QR)</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={coverCode}
            onChange={(e) => setCoverCode(e.target.value)}
            className="min-w-[260px] flex-1 rounded-xl border border-white/10 bg-[#0A0A0F] px-3 py-2 text-sm text-white"
            placeholder="Pega el payload QR del cover"
          />
          <button
            type="button"
            onClick={() => void validateCover()}
            className="rounded-xl bg-[#2979FF] px-4 py-2 text-sm font-semibold text-white"
          >
            Validar
          </button>
          {!isCameraOpen ? (
            <button
              type="button"
              onClick={() => void startCamera()}
              disabled={isStartingCamera}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isStartingCamera ? "Abriendo cámara..." : "Escanear con cámara"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void stopCamera()}
              className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-2 text-sm font-semibold text-red-200"
            >
              Detener cámara
            </button>
          )}
        </div>
        <div
          id="cover-camera-reader"
          className={`mt-3 overflow-hidden rounded-xl border border-white/10 bg-black ${isCameraOpen ? "block" : "hidden"}`}
        />
        {scanMsg && <p className="mt-2 text-xs text-slate-400">{scanMsg}</p>}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#111118] p-4">
        <p className="text-sm font-semibold text-white">Mesas del evento</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {tableBoard.map((t) => (
            <div
              key={t.id}
              className={`rounded-lg border px-3 py-2 text-sm ${
                t.state === "ocupada"
                  ? "border-amber-500/35 bg-amber-500/10"
                  : t.state === "reservada"
                    ? "border-[#9B7FCA]/35 bg-[#9B7FCA]/10"
                    : "border-emerald-500/30 bg-emerald-500/10"
              }`}
            >
              <p className="font-semibold text-white">
                {t.zone} · {t.label}
              </p>
              <p className="text-xs text-slate-300">
                {t.state} · dentro (auto) {t.inside} · reservados {t.reservedPeople}
                {t.cap > 0 ? ` · aforo mesa ${t.manualInside}/${t.cap}` : ""}
                {t.missing > 0 ? ` · faltan ${t.missing}` : ""}
              </p>
              {t.cap > 0 && (
                <>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all ${
                        t.occupancyPct >= 100
                          ? "bg-red-400"
                          : t.occupancyPct >= 80
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                      }`}
                      style={{ width: `${t.occupancyPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Ocupación actual: {t.manualInside}/{t.cap} ({t.occupancyPct}%)
                  </p>
                </>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-slate-500">Conteo manual</span>
                <button
                  type="button"
                  onClick={() => updateManualCount(t.id, -1)}
                  className="rounded border border-white/20 px-2 py-0.5 text-xs text-white"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => updateManualCount(t.id, 1)}
                  className="rounded border border-white/20 px-2 py-0.5 text-xs text-white"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#111118] p-4">
        <p className="text-sm font-semibold text-white">Reservas para check-in</p>
        <div className="mt-3 space-y-2">
          {reservations
            .filter((r) => r.estado === "pending" || r.estado === "confirmed")
            .map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2">
                <p className="text-sm text-slate-200">
                  {r.cliente?.nombre ?? "Cliente"} · {r.mesa ?? "Mesa"} · {r.partySize ?? 0} pers.
                </p>
                <button
                  type="button"
                  onClick={() => void checkInReservation(r.id)}
                  className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300"
                >
                  Validar reserva (ocupar mesa)
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
