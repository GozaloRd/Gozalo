"use client";

export default function AdminEventosPage() {
  return (
    <div className="mx-auto max-w-[900px] space-y-4">
      <h1 className="text-2xl font-semibold text-[#F9FAFB]">Eventos (global)</h1>
      <p className="text-sm text-[#6B7280]">
        Vista global de eventos en construcción. Desde cada local puedes gestionar eventos en el panel del
        dueño.
      </p>
      <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#111118]/50 p-8 text-center text-[#6B7280]">
        Próximamente: listado filtrable, estados y métricas cruzadas.
      </div>
    </div>
  );
}
