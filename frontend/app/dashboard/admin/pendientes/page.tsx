"use client";

import { useEffect, useState } from "react";
import { fetchAdminPendingVenues, patchVenueStatus } from "@/lib/adminApi";

type Row = {
  id: string;
  name: string;
  city?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  createdAt: string;
  owner?: { fullName?: string; email?: string };
};

export default function AdminPendientesPage() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{
    id: string;
    name: string;
    reason: string;
  } | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  }

  async function load() {
    setLoading(true);
    try {
      const rows = await fetchAdminPendingVenues();
      setList(rows as Row[]);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function approveVenue(v: Row) {
    setBusyId(v.id);
    try {
      await patchVenueStatus(v.id, "approved");
      showToast("Local aprobado correctamente");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al aprobar");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmReject() {
    if (!rejectModal) return;
    setBusyId(rejectModal.id);
    try {
      await patchVenueStatus(rejectModal.id, "rejected");
      if (rejectModal.reason.trim()) {
        // Motivo recogido en UI; el backend actual solo persiste el estado.
        console.info("[admin] motivo rechazo", rejectModal.reason.trim());
      }
      showToast("Local rechazado");
      setRejectModal(null);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Error al rechazar");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] rounded-xl border border-white/10 bg-[#1a1a24] px-4 py-3 text-sm text-[#F9FAFB] shadow-lg">
          {toast}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold text-[#F9FAFB]">Locales pendientes</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Solicitudes de alta de locales</p>
      </div>

      {loading ? (
        <p className="text-sm text-[#6B7280]">Cargando…</p>
      ) : (
        <div className="grid gap-4">
          {list.length === 0 ? (
            <p className="rounded-2xl border border-white/[0.08] bg-[#111118] px-6 py-10 text-center text-[#6B7280]">
              No hay solicitudes pendientes.
            </p>
          ) : (
            list.map((v) => {
              const busy = busyId === v.id;
              return (
                <div
                  key={v.id}
                  className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111118] shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex flex-col gap-4 p-6 sm:flex-row">
                    <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl bg-[#0A0A0F] sm:h-32 sm:w-44">
                      {v.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.coverImageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-[#6B7280]">
                          Sin foto
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold text-[#F9FAFB]">{v.name}</p>
                      <p className="mt-1 text-sm text-[#9CA3AF]">
                        {v.city ?? "—"} · Dueño: {v.owner?.fullName ?? v.owner?.email ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-[#6B7280]">
                        {v.owner?.email && (
                          <span className="mr-2">Email: {v.owner.email}</span>
                        )}
                        Solicitud: {new Date(v.createdAt).toLocaleString("es-DO")}
                      </p>
                      {v.description && (
                        <p className="mt-3 line-clamp-4 text-sm text-[#9CA3AF]">{v.description}</p>
                      )}
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-xl bg-emerald-600 px-8 py-3 text-base font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                          onClick={() => void approveVenue(v)}
                        >
                          ✅ Aprobar
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          className="rounded-xl border-2 border-red-500/60 bg-transparent px-8 py-3 text-base font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                          onClick={() =>
                            setRejectModal({ id: v.id, name: v.name, reason: "" })
                          }
                        >
                          ❌ Rechazar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111118] p-6">
            <h2 className="text-lg font-semibold text-[#F9FAFB]">Rechazar local</h2>
            <p className="mt-2 text-sm text-[#9CA3AF]">
              Vas a rechazar <span className="font-medium text-[#F9FAFB]">{rejectModal.name}</span>.
              Opcional: indica un motivo interno (no se guarda en el servidor todavía).
            </p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) =>
                setRejectModal((m) => (m ? { ...m, reason: e.target.value } : m))
              }
              rows={4}
              className="mt-4 w-full rounded-xl border border-white/10 bg-[#0c0c14] px-3 py-2 text-sm text-white"
              placeholder="Motivo del rechazo…"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm text-[#9CA3AF] hover:bg-white/[0.05]"
                onClick={() => setRejectModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId === rejectModal.id}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                onClick={() => void confirmReject()}
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
