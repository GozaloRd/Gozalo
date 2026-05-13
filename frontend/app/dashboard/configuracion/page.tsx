"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import { clearAuthToken } from "@/lib/authToken";
import { updateVenue } from "@/lib/dashboardApi";
import { DashCard } from "@/components/dashboard/pro/DashCard";

type TabId = "general" | "empresa" | "pagos" | "seguridad";

function buildSupportWhatsAppUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER;
  if (!raw) return null;
  const n = String(raw).replace(/\D/g, "");
  if (!n) return null;
  const text = encodeURIComponent(
    "Hola, quiero ayuda con la verificación de mi local en Gozalo."
  );
  return `https://wa.me/${n}?text=${text}`;
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function venueStatusLabel(status?: string) {
  const s = status ?? "";
  if (s === "approved")
    return { label: "Aprobado", tone: "text-emerald-300 bg-emerald-500/15 border-emerald-500/35" };
  if (s === "pending")
    return { label: "Pendiente de revisión", tone: "text-amber-200 bg-amber-500/15 border-amber-500/35" };
  if (s === "rejected")
    return { label: "No aprobado", tone: "text-rose-300 bg-rose-500/15 border-rose-500/35" };
  if (s === "suspended")
    return { label: "Suspendido", tone: "text-rose-300 bg-rose-500/15 border-rose-500/40" };
  return { label: status || "—", tone: "text-slate-300 bg-white/[0.06] border-white/10" };
}

const TABS: { id: TabId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "empresa", label: "Empresa" },
  { id: "pagos", label: "Pagos" },
  { id: "seguridad", label: "Seguridad" },
];

const fieldInputClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-[#111118] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-white/20 focus:outline-none";
const fieldLabelClass = "text-[10px] font-medium uppercase tracking-wide text-slate-500";

type PayoutFields = {
  bankName: string;
  accountHolder: string;
  idTax: string;
  accountType: string;
  accountNumber: string;
  bankSwiftOrRouting: string;
  transferInstructions: string;
};

const EMPTY_PAYOUT: PayoutFields = {
  bankName: "",
  accountHolder: "",
  idTax: "",
  accountType: "",
  accountNumber: "",
  bankSwiftOrRouting: "",
  transferInstructions: "",
};

function payoutFromVenue(
  p:
    | {
        bankName?: string;
        accountHolder?: string;
        idTax?: string;
        accountType?: string;
        accountNumber?: string;
        bankSwiftOrRouting?: string;
        transferInstructions?: string;
      }
    | null
    | undefined
): PayoutFields {
  if (!p || typeof p !== "object") return { ...EMPTY_PAYOUT };
  return {
    bankName: p.bankName ?? "",
    accountHolder: p.accountHolder ?? "",
    idTax: p.idTax ?? "",
    accountType: p.accountType ?? "",
    accountNumber: p.accountNumber ?? "",
    bankSwiftOrRouting: p.bankSwiftOrRouting ?? "",
    transferInstructions: p.transferInstructions ?? "",
  };
}

function PayoutProfileSection({
  venueId,
  profileSig,
  onSaved,
}: {
  venueId: string;
  profileSig: string;
  onSaved: () => void | Promise<void>;
}) {
  const [f, setF] = useState<PayoutFields>(() => {
    try {
      return payoutFromVenue(JSON.parse(profileSig));
    } catch {
      return { ...EMPTY_PAYOUT };
    }
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    try {
      setF(payoutFromVenue(JSON.parse(profileSig)));
    } catch {
      setF({ ...EMPTY_PAYOUT });
    }
  }, [profileSig]);

  const onField =
    (key: keyof PayoutFields) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setErr(null);
      setOk(false);
      setF((prev) => ({ ...prev, [key]: e.target.value }));
    };

  function hasContent(values: PayoutFields) {
    return Object.values(values).some((v) => v.trim().length > 0);
  }

  async function save() {
    setErr(null);
    setOk(false);
    setSaving(true);
    try {
      await updateVenue(venueId, {
        payoutProfile: hasContent(f) ? { ...f } : null,
      });
      setOk(true);
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashCard className="p-5 sm:p-6" padding={false}>
      <h2 className="text-base font-semibold text-white">Cuenta bancaria e instrucciones de transferencia</h2>
      <p className="mt-1 text-sm text-slate-400">
        Registra la cuenta a la que deseas recibir abonos por transferencia y cualquier dato de referencia. La
        información se guarda en el perfil de tu local para consulta interna; puedes copiarla a comunicados o
        tickets según lo permitan las normas de pago.
      </p>
      {hasContent(f) && (
        <div
          className="mt-4 rounded-xl border border-white/[0.08] bg-[#0d0d14] px-4 py-3 text-sm text-slate-200"
          role="status"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Resumen</p>
          <dl className="mt-2 space-y-1.5 text-sm">
            {f.bankName.trim() ? (
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <dt className="shrink-0 text-slate-500 sm:w-40">Banco</dt>
                <dd className="font-medium text-white">{f.bankName.trim()}</dd>
              </div>
            ) : null}
            {f.accountHolder.trim() ? (
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <dt className="shrink-0 text-slate-500 sm:w-40">Titular</dt>
                <dd className="text-white">{f.accountHolder.trim()}</dd>
              </div>
            ) : null}
            {f.idTax.trim() ? (
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <dt className="shrink-0 text-slate-500 sm:w-40">Cédula / RNC</dt>
                <dd className="text-white">{f.idTax.trim()}</dd>
              </div>
            ) : null}
            {f.accountType ? (
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <dt className="shrink-0 text-slate-500 sm:w-40">Tipo de cuenta</dt>
                <dd className="text-white">
                  {f.accountType === "ahorros"
                    ? "Ahorros"
                    : f.accountType === "corriente"
                      ? "Corriente"
                      : f.accountType === "otro"
                        ? "Otro"
                        : "—"}
                </dd>
              </div>
            ) : null}
            {f.accountNumber.trim() ? (
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <dt className="shrink-0 text-slate-500 sm:w-40">Número de cuenta</dt>
                <dd className="font-mono text-sm text-white">{f.accountNumber.trim()}</dd>
              </div>
            ) : null}
            {f.bankSwiftOrRouting.trim() ? (
              <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
                <dt className="shrink-0 text-slate-500 sm:w-40">IBAN / SWIFT / ruta</dt>
                <dd className="font-mono text-sm text-white">{f.bankSwiftOrRouting.trim()}</dd>
              </div>
            ) : null}
            {f.transferInstructions.trim() ? (
              <div className="mt-2 border-t border-white/10 pt-2">
                <dt className="text-slate-500">Instrucciones</dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-200">{f.transferInstructions.trim()}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={fieldLabelClass}>Banco</span>
          <input
            value={f.bankName}
            onChange={onField("bankName")}
            className={fieldInputClass}
            placeholder="Nombre del banco"
            maxLength={120}
            autoComplete="organization"
          />
        </label>
        <label className="block">
          <span className={fieldLabelClass}>Titular de la cuenta</span>
          <input
            value={f.accountHolder}
            onChange={onField("accountHolder")}
            className={fieldInputClass}
            placeholder="Nombre o razón social"
            maxLength={200}
          />
        </label>
        <label className="block">
          <span className={fieldLabelClass}>Cédula o RNC</span>
          <input
            value={f.idTax}
            onChange={onField("idTax")}
            className={fieldInputClass}
            placeholder="Solo referencia, opcional"
            maxLength={40}
          />
        </label>
        <label className="block">
          <span className={fieldLabelClass}>Tipo de cuenta</span>
          <select
            value={f.accountType}
            onChange={onField("accountType")}
            className={fieldInputClass}
          >
            <option value="">Selecciona (opcional)</option>
            <option value="ahorros">Ahorros</option>
            <option value="corriente">Corriente</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label className="block">
          <span className={fieldLabelClass}>Número de cuenta</span>
          <input
            value={f.accountNumber}
            onChange={onField("accountNumber")}
            className={`${fieldInputClass} font-mono text-sm`}
            placeholder="••••"
            maxLength={50}
            inputMode="numeric"
            autoComplete="off"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={fieldLabelClass}>IBAN, SWIFT, ACH o ruta bancaria</span>
          <input
            value={f.bankSwiftOrRouting}
            onChange={onField("bankSwiftOrRouting")}
            className={`${fieldInputClass} font-mono text-sm`}
            placeholder="Si aplica para transferencias internacionales o ACH"
            maxLength={80}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className={fieldLabelClass}>Instrucciones o nota para el cliente (opcional)</span>
          <textarea
            value={f.transferInstructions}
            onChange={onField("transferInstructions")}
            rows={4}
            className={fieldInputClass + " resize-y min-h-[100px]"}
            placeholder="Ej. enviar comprobante a WhatsApp, concepto a usar, horario, etc."
            maxLength={2000}
          />
        </label>
      </div>
      {err ? <p className="mt-3 text-sm text-rose-300">{err}</p> : null}
      {ok ? <p className="mt-3 text-sm text-emerald-300/90">Datos guardados correctamente.</p> : null}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex rounded-xl bg-gradient-to-r from-[#9B7FCA] to-[#7B5EA7] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#5D2E8C]/25 transition enabled:hover:brightness-110 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar datos bancarios"}
        </button>
        <button
          type="button"
          onClick={() => {
            setErr(null);
            setOk(false);
            setF({ ...EMPTY_PAYOUT });
          }}
          className="inline-flex rounded-md border border-white/[0.08] bg-transparent px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.03] hover:text-white"
        >
          Vaciar formulario
        </button>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Los campos se validan y acortan al guardar. Deja vacío o usa «Vaciar formulario» y vuelve a guardar para
        quitar toda la información bancaria del local.
      </p>
    </DashCard>
  );
}

export default function DashboardConfigPage() {
  const router = useRouter();
  const { venue, loading, needsVenue, isAdminViewer, refresh } = useDashboard();
  const [tab, setTab] = useState<TabId>("general");
  const waUrl = useMemo(() => buildSupportWhatsAppUrl(), []);
  const payoutProfileSig = useMemo(
    () => (venue ? JSON.stringify(payoutFromVenue(venue.payoutProfile)) : ""),
    [venue?.id, JSON.stringify(venue?.payoutProfile ?? null)]
  );

  async function handleLogout() {
    await clearAuthToken();
    router.replace("/login");
  }

  if (loading) {
    return <div className="text-sm text-[#6B7280]">Cargando configuración…</div>;
  }

  if (needsVenue || !venue) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <DashCard className="p-8 text-center text-slate-300">
          <p className="text-sm">Primero crea o elige un local para acceder a la configuración del negocio.</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex rounded-md border border-[#9B7FCA]/40 bg-[#9B7FCA]/10 px-4 py-2 text-sm font-medium text-[#E0AAFF] transition hover:bg-[#9B7FCA]/20"
          >
            Ir al panel
          </Link>
        </DashCard>
      </div>
    );
  }

  const st = venueStatusLabel(venue.status);
  const showPendingBanner = venue.status === "pending";
  const showRejectedBanner = venue.status === "rejected";
  const showSuspendedBanner = venue.status === "suspended";

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {showPendingBanner && (
        <div
          className="flex flex-col gap-4 rounded-2xl border border-amber-500/35 bg-amber-500/10 p-5 text-amber-100 sm:flex-row sm:items-start sm:justify-between"
          role="status"
        >
          <div className="flex gap-3">
            <span className="text-2xl" aria-hidden>
              ⚠️
            </span>
            <div>
              <p className="font-semibold text-amber-50">Cuenta pendiente de aprobación</p>
              <p className="mt-1 text-sm leading-relaxed text-amber-100/90">
                Tu local aún no está verificado como productor oficial. Puedes crear y gestionar eventos desde el
                panel, pero <span className="font-medium text-white">no aparecerán en el sitio público</span> hasta
                que el equipo de Gozalo apruebe el local.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {waUrl ? (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
              >
                <span aria-hidden>💬</span>
                Escribir por WhatsApp
              </a>
            ) : (
              <p className="max-w-xs text-xs text-amber-200/80">
                Añade <code className="rounded border border-amber-500/30 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-amber-100">NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER</code> en
                el entorno del front para el botón de WhatsApp.
              </p>
            )}
            <button
              type="button"
              onClick={() => void refresh()}
              className="text-xs font-medium text-amber-200 underline decoration-amber-500/50 hover:text-white hover:decoration-amber-200"
            >
              Actualizar estado
            </button>
          </div>
        </div>
      )}

      {showRejectedBanner && (
        <div
          className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-5 text-sm text-rose-100"
          role="status"
        >
          <p className="font-semibold text-white">Local no aprobado</p>
          <p className="mt-1 leading-relaxed text-rose-100/90">
            Este local no fue aprobado. Revisa los datos o contacta a soporte si crees que es un error.
          </p>
        </div>
      )}

      {showSuspendedBanner && (
        <div
          className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-5 text-sm text-rose-100"
          role="status"
        >
          <p className="font-semibold text-white">Local suspendido</p>
          <p className="mt-1 leading-relaxed text-rose-100/90">
            La operación en público puede estar limitada. Contacta a soporte para más información.
          </p>
        </div>
      )}

      <div
        className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#111118] p-3"
        role="tablist"
        aria-label="Secciones de configuración"
      >
        {TABS.map(({ id, label }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition duration-150 ${
                active
                  ? "border-[#9B7FCA] text-[#9B7FCA]"
                  : "border-white/[0.08] text-[#9CA3AF] hover:bg-white/[0.03]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "general" && (
        <DashCard className="p-5 sm:p-6" padding={false}>
          <h2 className="text-base font-semibold text-white">Información de la cuenta</h2>
          <p className="mt-1 text-sm text-slate-500">Datos básicos de tu cuenta en Gozalo.</p>
          <dl className="mt-5 grid gap-3">
            <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Tipo de cuenta</dt>
              <dd className="mt-1 text-sm font-medium text-white">
                {isAdminViewer ? "Administrador de plataforma" : "Empresa / dueño de local"}
              </dd>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Correo del titular</dt>
              <dd className="mt-1 text-sm font-medium text-white">{venue.owner?.email ?? "—"}</dd>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Nombre del titular</dt>
              <dd className="mt-1 text-sm font-medium text-white">{venue.owner?.fullName ?? "—"}</dd>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Local activo</dt>
              <dd className="mt-1 text-sm font-medium text-white">{venue.name}</dd>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] px-4 py-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Fecha de registro del local</dt>
              <dd className="mt-1 text-sm font-medium text-white">{fmtDate(venue.createdAt)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">
            Para cambiar el correo o el titular del local, escribe al soporte de Gozalo.
          </p>
        </DashCard>
      )}

      {tab === "empresa" && (
        <div className="space-y-6">
          <DashCard className="p-5 sm:p-6" padding={false}>
            <h2 className="text-base font-semibold text-white">Datos del negocio</h2>
            <p className="mt-1 text-sm text-slate-500">Información pública y operativa de tu local.</p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] px-4 py-3 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Nombre comercial</dt>
                <dd className="mt-1 text-sm font-medium text-white">{venue.name}</dd>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Ciudad</dt>
                <dd className="mt-1 text-sm font-medium text-white">{venue.city ?? "—"}</dd>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Aforo referencial</dt>
                <dd className="mt-1 text-sm font-medium text-white">
                  {venue.capacity != null && venue.capacity > 0 ? venue.capacity : "—"}
                </dd>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] px-4 py-3 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Dirección</dt>
                <dd className="mt-1 text-sm font-medium text-white">{venue.address?.trim() || "—"}</dd>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] px-4 py-3 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Descripción</dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-300">
                  {venue.description?.trim() || "Sin descripción."}
                </dd>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-[#0d0d14] px-4 py-3 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Estado del local</dt>
                <dd className="mt-2">
                  <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${st.tone}`}>
                    {st.label}
                  </span>
                </dd>
              </div>
            </dl>
          </DashCard>
          <DashCard className="p-5 sm:p-6" padding={false}>
            <h2 className="text-base font-semibold text-white">Operación del local</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mismo orden que en el menú: eventos, entradas, reservas, mesas, control de acceso; caja, estadísticas y
              collage.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { href: "/dashboard/eventos", label: "Eventos" },
                { href: "/dashboard/tickets", label: "Entradas y tipos" },
                { href: "/dashboard/reservas", label: "Reservas" },
                { href: "/dashboard/mesas", label: "Mesas y mapa" },
                { href: "/dashboard/acceso", label: "Control de acceso" },
                { href: "/dashboard/caja", label: "Caja (reporte manual)" },
                { href: "/dashboard/estadisticas", label: "Estadísticas" },
                { href: "/dashboard/collage", label: "Collage" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-[#0d0d14] px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-[#9B7FCA]/40 hover:text-white"
                  >
                    {l.label}
                    <span className="text-slate-500" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </DashCard>
        </div>
      )}

      {tab === "pagos" && (
        <div className="space-y-6">
          <DashCard className="p-5 sm:p-6" padding={false}>
            <h2 className="text-base font-semibold text-white">Pagos en la app</h2>
            <p className="mt-1 text-sm text-slate-400">
              Los cobros en la plataforma (tarjeta, transferencia o efectivo en el panel) se reflejan en estadísticas y
              caja.
            </p>
            <ul className="mt-4 list-inside list-disc space-y-1.5 text-sm text-slate-500">
              <li>Ventas de entradas y consumos ligados a órdenes y reservas.</li>
              <li>Desglose por método en el panel (Estadísticas / Caja).</li>
            </ul>
          </DashCard>
          <PayoutProfileSection
            venueId={venue.id}
            profileSig={payoutProfileSig}
            onSaved={async () => {
              await refresh();
            }}
          />
          <DashCard className="p-5 sm:p-6" padding={false}>
            <h2 className="text-base font-semibold text-white">Caja manual (fuera de la app)</h2>
            <p className="mt-1 text-sm text-slate-400">
              Registra en <span className="font-medium text-[#9B7FCA]">Caja</span> lo cobrado en taquilla, transferencias
              directas o bar que no pasen por el checkout. Puedes desglosar por entradas, mesas o consumo; se fusiona
              con las estadísticas.
            </p>
            <Link
              href="/dashboard/caja"
              className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-[#9B7FCA] to-[#7B5EA7] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Ir a Caja
            </Link>
          </DashCard>
        </div>
      )}

      {tab === "seguridad" && (
        <DashCard className="p-5 sm:p-6" padding={false}>
          <h2 className="text-base font-semibold text-white">Sesión y acceso</h2>
          <p className="mt-1 text-sm text-slate-500">
            Cierra sesión en este dispositivo si compartes el equipo o dejas de usarlo.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/mis-entradas"
              className="inline-flex rounded-md border border-white/[0.08] bg-[#0d0d14] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/15 hover:text-white"
            >
              Mis entradas (sitio)
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
            >
              Cerrar sesión
            </button>
          </div>
          <p className="mt-5 text-xs text-slate-500">
            El token de sesión se guarda en el navegador. Si notas accesos extraños, cambia tu contraseña y vuelve a
            entrar.
          </p>
        </DashCard>
      )}
    </div>
  );
}
