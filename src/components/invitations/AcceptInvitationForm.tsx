"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type InvitationDetails = {
  email: string;
  role: string;
  expiresAt: string;
  tenant: {
    id: string;
    name: string;
  };
  invitedBy: string;
};

type Props = {
  token: string;
};

export default function AcceptInvitationForm({ token }: Props) {
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [mode] = useState<"password">("password");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const expiresAt = useMemo(() => {
    if (!invitation?.expiresAt) return "";
    return new Date(invitation.expiresAt).toLocaleString();
  }, [invitation?.expiresAt]);

  useEffect(() => {
    const loadInvitation = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/invitations/accept?token=${encodeURIComponent(token)}`,
        );
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "No se pudo cargar la invitación");
          return;
        }

        setInvitation(data);
      } catch {
        setError("Error de red al cargar invitación");
      } finally {
        setLoading(false);
      }
    };

    void loadInvitation();
  }, [token]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setSubmitting(true);
      const payload = { token, mode, password };

      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo aceptar la invitación");
        return;
      }

      setSuccess("Invitación aceptada. Tu membresía ya está activa.");
    } catch {
      setError("Error de red al aceptar invitación");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p>Cargando invitación...</p>;
  }

  if (!invitation) {
    return <p>No se encontró una invitación válida.</p>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6"
      >
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">
            Aceptar invitación
          </h1>
          <p className="text-sm text-slate-500">
            Has sido invitado a{" "}
            <span className="font-semibold text-slate-900">
              {invitation.tenant.name}
            </span>{" "}
            con el rol{" "}
            <span className="font-semibold text-slate-900">
              {invitation.role}
            </span>
            .
          </p>
        </div>

        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Correo invitado:</span>
            <span className="font-medium text-slate-900">
              {invitation.email}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Invitó:</span>
            <span className="font-medium text-slate-900">
              {invitation.invitedBy}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Expira:</span>
            <span className="font-medium text-slate-900">{expiresAt}</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">
            Configura tu contraseña (mínimo 8 caracteres)
          </label>
          <input
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/20"
            type="password"
            value={password}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 italic">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 text-green-600 text-sm rounded-xl border border-green-100">
            {success}
          </div>
        )}

        <button
          disabled={submitting}
          className="w-full rounded-xl bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
          type="submit"
        >
          {submitting ? "Procesando..." : "Aceptar invitación"}
        </button>
      </form>
    </div>
  );
}
