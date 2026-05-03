"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteAdminUser, fetchAdminUsers, patchUserRole } from "@/lib/adminApi";

const ROLES = ["customer", "venue_owner", "admin", "staff"] as const;

export default function AdminUsuariosPage() {
  const [users, setUsers] = useState<
    {
      id: string;
      email: string;
      fullName: string;
      phone?: string | null;
      role: string;
      createdAt: string;
    }[]
  >([]);
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [workingUserId, setWorkingUserId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const u = await fetchAdminUsers();
      setUsers(u);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const match =
        !q ||
        u.email.toLowerCase().includes(q.toLowerCase()) ||
        u.fullName.toLowerCase().includes(q.toLowerCase());
      const r = !roleFilter || u.role === roleFilter;
      return match && r;
    });
  }, [users, q, roleFilter]);

  async function changeRole(userId: string, role: string) {
    setWorkingUserId(userId);
    try {
      await patchUserRole(userId, role);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo cambiar el rol");
    } finally {
      setWorkingUserId(null);
    }
  }

  async function removeUser(userId: string, email: string) {
    const ok = window.confirm(`Vas a eliminar la cuenta ${email}. Esta acción no se puede deshacer.`);
    if (!ok) return;
    setWorkingUserId(userId);
    try {
      await deleteAdminUser(userId);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo eliminar la cuenta");
    } finally {
      setWorkingUserId(null);
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#F9FAFB]">Usuarios</h1>
        <p className="mt-1 text-sm text-[#6B7280]">Búsqueda, roles y moderación</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o email"
          className="min-w-[200px] flex-1 rounded-xl border border-white/[0.08] bg-[#111118] px-4 py-2 text-sm text-[#F9FAFB] placeholder:text-[#6B7280] focus:border-[#9B7FCA]/40 focus:outline-none"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-white/[0.08] bg-[#111118] px-3 py-2 text-sm text-[#F9FAFB]"
        >
          <option value="">Todos los roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>
      {loading ? (
        <p className="text-[#6B7280]">Cargando…</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#111118]">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.08] text-[11px] uppercase text-[#6B7280]">
                <th className="px-6 py-3">Avatar</th>
                <th className="px-6 py-3">Nombre</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Rol</th>
                <th className="px-6 py-3">Registro</th>
                <th className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-white/[0.06]">
                  <td className="px-6 py-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#9B7FCA]/20 text-xs font-bold text-[#B39CD8]">
                      {u.fullName?.charAt(0)?.toUpperCase() ?? "?"}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[#F9FAFB]">{u.fullName}</td>
                  <td className="px-6 py-3 text-[#9CA3AF]">{u.email}</td>
                  <td className="px-6 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => void changeRole(u.id, e.target.value)}
                      disabled={workingUserId === u.id}
                      className="rounded-lg border border-white/[0.08] bg-[#0A0A0F] px-2 py-1 text-xs text-[#F9FAFB]"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-3 text-xs text-[#6B7280]">
                    {new Date(u.createdAt).toLocaleDateString("es-DO")}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      type="button"
                      disabled={workingUserId === u.id}
                      onClick={() => void removeUser(u.id, u.email)}
                      className="rounded-md border border-red-400/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300 hover:border-red-300/60 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Eliminar cuenta
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
