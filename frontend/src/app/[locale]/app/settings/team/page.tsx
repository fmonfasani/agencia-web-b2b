"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, Trash2, ChevronDown } from "lucide-react";
import { PageTransition, StaggerItem } from "@/components/animations/PageTransition";
import { useToast } from "@/hooks/useToast";
import {
  getTeamMembers, inviteTeamMember, updateTeamMemberRole, removeTeamMember,
  TeamMember, TeamRole,
} from "@/app/actions/team";

const ROLES: { value: TeamRole; label: string; desc: string }[] = [
  { value: "owner", label: "Owner", desc: "Acceso total" },
  { value: "admin", label: "Admin", desc: "Todo excepto borrar cuenta" },
  { value: "manager", label: "Manager", desc: "Ver agentes y analytics" },
  { value: "analyst", label: "Analyst", desc: "Solo lectura de dashboards" },
  { value: "viewer", label: "Viewer", desc: "Solo datos públicos" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  revoked: "bg-red-100 text-red-700",
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("analyst");
  const [inviting, setInviting] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    getTeamMembers().then((data) => { setMembers(data); setLoading(false); });
  }, []);

  const handleInvite = async () => {
    setInviting(true);
    const res = await inviteTeamMember(email, role);
    if (res.success) {
      addToast(`Invitación enviada a ${email}`, "success");
      setMembers((prev) => [...prev, {
        id: `u${Date.now()}`, email, name: email.split("@")[0],
        role, status: "pending", joinedAt: new Date().toISOString().split("T")[0],
      }]);
      setEmail(""); setShowInvite(false);
    } else {
      addToast(res.error ?? "Error al invitar", "error");
    }
    setInviting(false);
  };

  const handleRoleChange = async (userId: string, newRole: TeamRole) => {
    const res = await updateTeamMemberRole(userId, newRole);
    if (res.success) {
      setMembers((prev) => prev.map((m) => m.id === userId ? { ...m, role: newRole } : m));
      addToast("Rol actualizado", "success");
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`¿Eliminar a ${name} del equipo?`)) return;
    const res = await removeTeamMember(userId);
    if (res.success) {
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      addToast("Miembro eliminado", "success");
    }
  };

  return (
    <PageTransition>
      <div className="space-y-8">
        <StaggerItem>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Equipo</h1>
              <p className="text-gray-600">Gestiona los miembros y permisos de tu organización</p>
            </div>
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              <UserPlus size={18} />
              Invitar miembro
            </button>
          </div>
        </StaggerItem>

        {showInvite && (
          <motion.div
            className="border border-blue-200 bg-blue-50 rounded-lg p-5 space-y-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <h3 className="font-bold text-gray-900">Invitar nuevo miembro</h3>
            <div className="flex gap-3 flex-wrap">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@empresa.com"
                className="flex-1 min-w-[200px] px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as TeamRole)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {ROLES.filter((r) => r.value !== "owner").map((r) => (
                  <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={handleInvite} disabled={inviting || !email}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg disabled:opacity-50">
                {inviting ? "Enviando..." : "Enviar invitación"}
              </button>
              <button onClick={() => setShowInvite(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg">
                Cancelar
              </button>
            </div>
          </motion.div>
        )}

        <StaggerItem>
          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{members.length} miembros</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-5 font-semibold text-gray-700">Usuario</th>
                  <th className="text-left py-3 px-5 font-semibold text-gray-700">Rol</th>
                  <th className="text-left py-3 px-5 font-semibold text-gray-700">Estado</th>
                  <th className="text-left py-3 px-5 font-semibold text-gray-700">Último acceso</th>
                  <th className="text-left py-3 px-5 font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td colSpan={5} className="py-4 px-5">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : (
                  members.map((m, i) => (
                    <motion.tr
                      key={m.id}
                      className="border-t border-gray-100 hover:bg-gray-50"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                            {m.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{m.name}</p>
                            <p className="text-xs text-gray-500">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        {m.role === "owner" ? (
                          <span className="text-sm font-semibold text-gray-700">Owner</span>
                        ) : (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.id, e.target.value as TeamRole)}
                            className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none"
                          >
                            {ROLES.filter((r) => r.value !== "owner").map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[m.status]}`}>
                          {m.status === "active" ? "Activo" : m.status === "pending" ? "Pendiente" : "Revocado"}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-gray-500 text-xs">
                        {m.lastAccess ? new Date(m.lastAccess).toLocaleDateString("es-AR") : "—"}
                      </td>
                      <td className="py-3 px-5">
                        {m.role !== "owner" && (
                          <button
                            onClick={() => handleRemove(m.id, m.name)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </StaggerItem>
      </div>
    </PageTransition>
  );
}
