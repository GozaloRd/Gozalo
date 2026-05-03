"use client";

import { useMemo, useState } from "react";
import LogoG from "@/components/LogoG";
import { createVenue } from "@/lib/dashboardApi";
import { useDashboard } from "@/contexts/DashboardContext";

type Step = 0 | 1 | 2 | 3 | 4;

const STEP_LABELS = [
  "Bienvenida",
  "Identidad",
  "Ubicación",
  "Capacidad",
  "Resumen",
];

export function CreateVenueOnboarding() {
  const { refresh } = useDashboard();
  const [step, setStep] = useState<Step>(0);

  // Datos del formulario
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState<string>("");
  const [vibe, setVibe] = useState<string>("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const canAdvance = useMemo(() => {
    if (step === 0) return true;
    if (step === 1) return name.trim().length >= 2;
    if (step === 2) return city.trim().length >= 2;
    if (step === 3) return true;
    if (step === 4) return true;
    return false;
  }, [step, name, city]);

  async function handleCreate() {
    setError(null);
    setLoading(true);
    try {
      const capacityNum = capacity ? Number(capacity) : undefined;
      const finalDescription = [vibe, description].filter(Boolean).join(" · ").trim();
      await createVenue({
        name: name.trim(),
        city: city.trim(),
        address: address.trim() || undefined,
        description: finalDescription || undefined,
        capacity: capacityNum && !Number.isNaN(capacityNum) ? capacityNum : undefined,
      });
      setDone(true);
      // Espera 1.5s para mostrar el confetti y refresca el contexto
      setTimeout(() => {
        void refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear el local");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#0A0A1A] via-[#120822] to-[#0A0A1A] px-4 py-12">
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[#7B2CBF] to-[#E0AAFF] shadow-[0_0_60px_rgba(199,125,255,0.6)]">
          <svg className="h-16 w-16 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-8 text-2xl font-bold text-white">¡Listo, recibimos tu local!</h1>
        <p className="mt-2 max-w-md text-center text-sm text-slate-400">
          Tu local &quot;{name}&quot; quedó registrado y está en revisión. En unos segundos verás los siguientes pasos:
          escribe a{" "}
          <a
            href="mailto:gozalonightlife.rd@gmail.com?subject=Aprobación%20de%20local"
            className="font-semibold text-[#C77DFF] underline decoration-[#C77DFF]/40 hover:text-[#E0AAFF]"
          >
            gozalonightlife.rd@gmail.com
          </a>{" "}
          para que el equipo de Gózalo apruebe tu espacio. Cuando esté aprobado, aquí mismo tendrás tu panel completo.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-br from-[#0A0A1A] via-[#120822] to-[#0A0A1A] px-4 py-10">
      <div className="mb-6 flex justify-center">
        <LogoG />
      </div>

      <ProgressBar step={step} />

      <div className="relative mt-8 w-full max-w-xl rounded-2xl border border-white/10 bg-[#12121c]/80 p-6 shadow-neonDual backdrop-blur md:p-8">
        {step === 0 && <WelcomeStep onStart={() => setStep(1)} />}
        {step === 1 && (
          <IdentityStep
            name={name}
            setName={setName}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <LocationStep
            city={city}
            setCity={setCity}
            address={address}
            setAddress={setAddress}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <CapacityStep
            capacity={capacity}
            setCapacity={setCapacity}
            vibe={vibe}
            setVibe={setVibe}
            description={description}
            setDescription={setDescription}
            onBack={() => setStep(2)}
            onNext={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <SummaryStep
            data={{ name, city, address, description, vibe, capacity }}
            onBack={() => setStep(3)}
            onSubmit={handleCreate}
            loading={loading}
            error={error}
          />
        )}

        {step > 0 && step < 4 && (
          <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1) as Step)}
              className="text-sm text-slate-400 hover:text-white"
            >
              ← Atrás
            </button>
            <button
              type="button"
              disabled={!canAdvance}
              onClick={() => setStep((s) => Math.min(4, s + 1) as Step)}
              className="rounded-xl border border-[#C77DFF]/40 bg-gradient-to-br from-[#5D2E8C] to-[#9B7FCA] px-5 py-2 text-sm font-semibold text-white hover:border-[#E0AAFF]/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continuar →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ step }: { step: Step }) {
  return (
    <div className="flex w-full max-w-xl items-center gap-2">
      {STEP_LABELS.map((label, i) => {
        const active = i === step;
        const done = i < step;
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                done
                  ? "bg-gradient-to-br from-[#5D2E8C] to-[#E0AAFF] text-white shadow-[0_0_12px_rgba(199,125,255,0.6)]"
                  : active
                  ? "bg-white text-[#120822] shadow-[0_0_14px_rgba(255,255,255,0.4)]"
                  : "border border-white/15 bg-white/5 text-slate-500"
              }`}
            >
              {done ? "✓" : i + 1}
            </div>
            <span
              className={`hidden text-xs md:block ${
                active ? "text-white font-semibold" : done ? "text-slate-300" : "text-slate-500"
              }`}
            >
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`h-px flex-1 ${
                  done ? "bg-gradient-to-r from-[#E0AAFF] to-white/20" : "bg-white/10"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 0 · Welcome
// ---------------------------------------------------------------------------

function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <div className="space-y-5 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7B2CBF] to-[#E0AAFF] shadow-[0_0_30px_rgba(199,125,255,0.5)]">
        <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M20 7l-8 8-4-4M3 21h18" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white">Configura tu local en 4 pasos</h1>
      <p className="text-sm text-slate-400">
        Vamos a preparar tu panel para que empieces a vender entradas y reservar mesas hoy mismo. Te tomará menos de 2 minutos.
      </p>
      <div className="grid gap-2 text-left text-xs text-slate-300 md:grid-cols-2">
        <FeatureBullet label="Crea eventos publicables al instante" />
        <FeatureBullet label="Reservas online con aforo en tiempo real" />
        <FeatureBullet label="Punto de venta, mesas y cierre de caja" />
        <FeatureBullet label="Analítica, alertas y forecast de ingresos" />
      </div>
      <button
        onClick={onStart}
        className="mt-3 w-full rounded-xl border border-[#C77DFF]/40 bg-gradient-to-br from-[#5D2E8C] to-[#9B7FCA] py-3 text-sm font-semibold text-white hover:border-[#E0AAFF]/70"
      >
        Empezar configuración
      </button>
    </div>
  );
}

function FeatureBullet({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <span className="mt-0.5 text-[#C77DFF]">✦</span>
      <span>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 · Identity
// ---------------------------------------------------------------------------

function IdentityStep({
  name,
  setName,
  onNext,
}: {
  name: string;
  setName: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-[#C77DFF]">Paso 1 de 4</div>
        <h2 className="mt-1 text-xl font-bold text-white">¿Cómo se llama tu local?</h2>
        <p className="mt-1 text-sm text-slate-400">
          Es el nombre que verán los clientes en la app y en sus entradas.
        </p>
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim().length >= 2) onNext();
        }}
        className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-lg text-white placeholder-slate-500 focus:border-[#C77DFF]/60 focus:outline-none"
        placeholder="Ej. Rooftop Lumière"
      />
      {name.trim().length > 0 && name.trim().length < 2 && (
        <p className="text-xs text-amber-300">Dale al menos 2 letras.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 · Location
// ---------------------------------------------------------------------------

const POPULAR_CITIES = ["Santo Domingo", "Santiago", "Punta Cana", "La Romana", "Puerto Plata"];

function LocationStep({
  city,
  setCity,
  address,
  setAddress,
}: {
  city: string;
  setCity: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-[#C77DFF]">Paso 2 de 4</div>
        <h2 className="mt-1 text-xl font-bold text-white">¿Dónde está?</h2>
        <p className="mt-1 text-sm text-slate-400">
          Te usaremos la ciudad para mostrar tu local a la gente cercana.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase text-slate-500">Ciudad *</label>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white focus:border-[#C77DFF]/60 focus:outline-none"
          placeholder="Santo Domingo"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {POPULAR_CITIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCity(c)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                city === c
                  ? "border-[#C77DFF] bg-[#C77DFF]/20 text-[#E0AAFF]"
                  : "border-white/10 text-slate-400 hover:border-white/30 hover:text-white"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase text-slate-500">Dirección (opcional)</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white focus:border-[#C77DFF]/60 focus:outline-none"
          placeholder="Av. Winston Churchill 123"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 · Capacity + vibe
// ---------------------------------------------------------------------------

const VIBES = ["Club / Discoteca", "Rooftop / Lounge", "Restaurante", "Bar", "Salón de eventos", "Terraza"];

function CapacityStep({
  capacity,
  setCapacity,
  vibe,
  setVibe,
  description,
  setDescription,
}: {
  capacity: string;
  setCapacity: (v: string) => void;
  vibe: string;
  setVibe: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-[#C77DFF]">Paso 3 de 4</div>
        <h2 className="mt-1 text-xl font-bold text-white">Cuéntanos del ambiente</h2>
        <p className="mt-1 text-sm text-slate-400">
          Esto es opcional pero ayuda al público a encontrarte.
        </p>
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase text-slate-500">Tipo de local</label>
        <div className="flex flex-wrap gap-2">
          {VIBES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVibe(vibe === v ? "" : v)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                vibe === v
                  ? "border-[#C77DFF] bg-[#C77DFF]/20 text-[#E0AAFF]"
                  : "border-white/10 text-slate-400 hover:border-white/30 hover:text-white"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase text-slate-500">Aforo estimado</label>
        <input
          type="number"
          min={0}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white focus:border-[#C77DFF]/60 focus:outline-none"
          placeholder="p. ej. 250"
        />
        <p className="mt-1 text-xs text-slate-500">Es el aforo por defecto que usaremos en tus eventos.</p>
      </div>
      <div>
        <label className="mb-1 block text-xs uppercase text-slate-500">Descripción breve</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white focus:border-[#C77DFF]/60 focus:outline-none"
          placeholder="Ambiente, DJ residente, horario..."
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 · Summary + submit
// ---------------------------------------------------------------------------

function SummaryStep({
  data,
  onBack,
  onSubmit,
  loading,
  error,
}: {
  data: {
    name: string;
    city: string;
    address: string;
    description: string;
    vibe: string;
    capacity: string;
  };
  onBack: () => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wider text-[#C77DFF]">Paso 4 de 4</div>
        <h2 className="mt-1 text-xl font-bold text-white">Revisa y crea tu local</h2>
        <p className="mt-1 text-sm text-slate-400">
          Quedará en estado &quot;pending&quot; hasta que un admin lo apruebe. Ya puedes configurarlo mientras tanto.
        </p>
      </div>
      <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-4">
        <SummaryRow label="Nombre" value={data.name} />
        <SummaryRow label="Ciudad" value={data.city} />
        {data.address && <SummaryRow label="Dirección" value={data.address} />}
        {data.vibe && <SummaryRow label="Tipo" value={data.vibe} />}
        {data.capacity && <SummaryRow label="Aforo" value={`${data.capacity} personas`} />}
        {data.description && <SummaryRow label="Descripción" value={data.description} />}
      </div>

      {error && (
        <div className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="text-sm text-slate-400 hover:text-white disabled:opacity-50"
        >
          ← Atrás
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="rounded-xl border border-[#C77DFF]/40 bg-gradient-to-br from-[#5D2E8C] to-[#9B7FCA] px-6 py-2.5 text-sm font-semibold text-white hover:border-[#E0AAFF]/70 disabled:opacity-60"
        >
          {loading ? "Creando…" : "Crear mi local"}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-white">{value}</span>
    </div>
  );
}
