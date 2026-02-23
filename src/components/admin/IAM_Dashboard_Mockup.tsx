"use client";

import React, { useState } from "react";
import {
  User,
  Shield,
  Settings,
  MoreVertical,
  Ban,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    INACTIVE: "bg-slate-100 text-slate-500",
    BLOCKED: "bg-rose-100 text-rose-700",
    INVITED: "bg-blue-100 text-blue-700",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${styles[status]}`}
    >
      {status}
    </span>
  );
};

export default function UserManagementUI() {
  const [selectedUser, setSelectedUser] = useState<boolean | null>(null);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Equipos & IAM
          </h1>
          <p className="text-slate-500 font-medium">
            Gestiona permisos, roles y seguridad organizacional.
          </p>
        </div>
        <button className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl font-bold flex items-center gap-2 hover:scale-[1.02] transition-transform">
          <User size={18} />
          Invitar Miembro
        </button>
      </header>

      {/* Listado Principal */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Miembro
              </th>
              <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Rol
              </th>
              <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Estado
              </th>
              <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                Último Acceso
              </th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* Ejemplo de Fila */}
            <tr
              className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
              onClick={() => setSelectedUser(true)}
            >
              <td className="px-6 py-4 flex items-center gap-3">
                <div className="size-10 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-bold">
                  JS
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-slate-900 text-sm">
                    Juan Sebastian
                  </span>
                  <span className="text-xs text-slate-400">
                    juan@agencia.com
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">
                    ADMIN
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Depto: Sales
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <StatusBadge status="ACTIVE" />
              </td>
              <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                Hace 2 horas
              </td>
              <td className="px-6 py-4 text-right">
                <button className="p-2 hover:bg-white rounded-xl">
                  <MoreVertical size={16} className="text-slate-400" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* User Detail Drawer (Conceptual) */}
      {selectedUser && (
        <div className="fixed right-0 top-0 h-full w-[400px] bg-white border-l border-slate-200 shadow-2xl z-50 p-8 flex flex-col gap-8 animate-in slide-in-from-right">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-black text-slate-900">
              Detalle del Miembro
            </h2>
            <button
              onClick={() => setSelectedUser(null)}
              className="p-2 hover:bg-slate-100 rounded-xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Seguridad & Acciones
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 hover:bg-rose-50 hover:border-rose-100 transition-colors">
                <Ban size={18} className="text-rose-500" />
                <span className="text-[10px] font-bold">Bloquear</span>
              </button>
              <button className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center gap-2 hover:bg-blue-50 hover:border-blue-100 transition-colors">
                <RotateCcw size={18} className="text-blue-500" />
                <span className="text-[10px] font-bold">Reset Pass</span>
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Actividad Reciente
            </label>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 text-xs">
                  <div className="size-2 mt-1 rounded-full bg-blue-500" />
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700">
                      Cambio de Rol a OPERATOR
                    </span>
                    <span className="text-[10px] text-slate-400">
                      23 Feb, 14:30 - IP: 192.168.1.1
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
