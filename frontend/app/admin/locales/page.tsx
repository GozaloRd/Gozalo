export default function AdminLocalesPage() {
  return (
    <div className="p-6 md:p-10">
      <h1 className="font-display text-3xl font-bold text-white">Locales</h1>
      <p className="mt-2 text-slate-400">Aprobar o rechazar solicitudes de nuevos venues.</p>
      <div className="mt-8 overflow-hidden rounded-2xl border border-white/5">
        <table className="w-full text-left text-sm">
          <thead className="bg-night-950 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-night-800/30">
            <tr>
              <td className="px-4 py-4 text-white">La Terraza 809</td>
              <td className="px-4 py-4 text-slate-400">Santo Domingo</td>
              <td className="px-4 py-4 text-yellow-400">Pendiente</td>
              <td className="px-4 py-4">
                <button type="button" className="mr-2 text-gozalo-blue hover:underline">
                  Aprobar
                </button>
                <button type="button" className="text-gozalo-red hover:underline">
                  Rechazar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-6 text-xs text-slate-500">
        <code>PATCH /api/venues/:id/status</code> con body{" "}
        <code>{`{ "status": "approved" }`}</code>
      </p>
    </div>
  );
}
