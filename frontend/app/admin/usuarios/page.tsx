export default function AdminUsuariosPage() {
  return (
    <div className="p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold text-white">Usuarios</h1>
      <p className="mt-2 text-slate-400">
        Esta vista antigua ya no usa datos simulados. Usa el panel real en{" "}
        <code>/dashboard/admin/usuarios</code>.
      </p>
      <div className="mt-8 rounded-2xl border border-white/5 bg-night-800/30 p-6 text-sm text-slate-300">
        No hay datos cargados en esta pantalla.
      </div>
      <p className="mt-6 text-xs text-slate-500">
        <code>GET /api/admin/users</code> · <code>PATCH /api/admin/users/:id/role</code>
      </p>
    </div>
  );
}
