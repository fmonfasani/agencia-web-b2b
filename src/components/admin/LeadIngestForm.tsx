"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Globe,
  Briefcase,
  Building2,
  Send,
  Loader2,
  CheckCircle2,
  Instagram,
  Linkedin,
} from "lucide-react";

const BUSINESS_TYPES = [
  {
    value: "SERVICIO",
    label: "Servicio",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    value: "INDUSTRIA",
    label: "Industria",
    color: "bg-purple-50 text-purple-600 border-purple-200",
  },
  {
    value: "COMERCIO",
    label: "Comercio",
    color: "bg-orange-50 text-orange-600 border-orange-200",
  },
  {
    value: "OFICIO",
    label: "Oficio",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
];

export default function LeadIngestForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    website: "",
    instagram: "",
    linkedin: "",
    businessType: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.businessType) {
      setError("El tipo de negocio es obligatorio.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/${locale}/api/leads/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sourceType: "MANUAL",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al procesar el lead");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push(`/${locale}/admin/dashboard`);
        router.refresh();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
        <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900">¡Lead Procesado!</h2>
        <p className="text-slate-500">
          El lead ha sido normalizado y calificado exitosamente. <br />
          Redirigiendo al Hub...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Tipo de Negocio - OBLIGATORIO */}
      <div>
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
          Tipo de Negocio (Requerido)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {BUSINESS_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() =>
                setFormData({ ...formData, businessType: type.value })
              }
              className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-2 ${
                formData.businessType === type.value
                  ? `${type.color} ring-4 ring-offset-2 ring-current ring-opacity-10 scale-95`
                  : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
              }`}
            >
              <Briefcase size={20} />
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Info Básica */}
        <div className="space-y-4">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
            Información de Contacto
          </label>

          <div className="relative group">
            <User
              className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Nombre Completo"
              className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>

          <div className="relative group">
            <Mail
              className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
          </div>

          <div className="relative group">
            <Phone
              className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="tel"
              placeholder="Teléfono / WhatsApp"
              className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
          </div>
        </div>

        {/* Info Empresa */}
        <div className="space-y-4">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
            Empresa & Presencia
          </label>

          <div className="relative group">
            <Building2
              className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Nombre de la Empresa"
              className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
            />
          </div>

          <div className="relative group">
            <Globe
              className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Sitio Web (url)"
              className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              value={formData.website}
              onChange={(e) =>
                setFormData({ ...formData, website: e.target.value })
              }
            />
          </div>

          <div className="flex gap-4">
            <div className="relative group flex-1">
              <Instagram
                className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-pink-500 transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="Instagram"
                className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                value={formData.instagram}
                onChange={(e) =>
                  setFormData({ ...formData, instagram: e.target.value })
                }
              />
            </div>
            <div className="relative group flex-1">
              <Linkedin
                className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="LinkedIn"
                className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                value={formData.linkedin}
                onChange={(e) =>
                  setFormData({ ...formData, linkedin: e.target.value })
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
          Notas / Descripción
        </label>
        <textarea
          placeholder="Añade detalles sobre el lead..."
          rows={4}
          className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0a0a0b] text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <>
            <Send size={18} />
            Procesar Lead Inteligente
          </>
        )}
      </button>
    </form>
  );
}
