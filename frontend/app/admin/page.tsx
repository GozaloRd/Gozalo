export default function AdminDashboardPage() {
  return (
    <div className="p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold text-white">Panel administrador</h1>
      <p className="mt-2 text-slate-400">Métricas globales de la plataforma Gózalo.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Usuarios", value: "12.4k" },
          { label: "Locales aprobados", value: "86" },
          { label: "Volumen (RD$)", value: "2.1M" },
          { label: "Comisiones", value: "105k" },
        ].map((c) => (
          <div key={c.label} className="glass rounded-2xl p-6">
            <p className="text-xs uppercase text-slate-500">{c.label}</p>
            <p className="mt-2 font-display text-2xl font-bold text-gozalo-blue">{c.value}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-xs text-slate-500">
        Datos vía <code>GET /api/admin/dashboard</code> (rol admin + JWT).
      </p>
    </div>
  );
}
