"use client";

import React, { useState } from "react";
import {
  MessageCircle,
  Mail,
  Instagram,
  Facebook,
  Linkedin,
  Globe,
  MoreVertical,
  ExternalLink,
} from "lucide-react";

export default function LeadContactButton({ lead }: { lead: any }) {
  const [isOpen, setIsOpen] = useState(false);

  // Helper to format links
  const getWaLink = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    return `https://wa.me/${clean}`;
  };

  const hasAnyContact = !!(
    lead.phone ||
    lead.email ||
    lead.website ||
    lead.instagram ||
    lead.facebook ||
    lead.linkedin ||
    lead.tiktok
  );

  if (!hasAnyContact) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
      >
        Contactar
        <MoreVertical size={12} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-3 py-1.5 border-b border-slate-50 mb-1">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                Opciones de Contacto
              </span>
            </div>

            {lead.phone && (
              <a
                href={getWaLink(lead.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
              >
                <div className="size-6 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                  <MessageCircle size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold">WhatsApp</span>
                  <span className="text-[9px] opacity-60">Enviar mensaje</span>
                </div>
              </a>
            )}

            {lead.email && (
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <div className="size-6 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                  <Mail size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold">Email</span>
                  <span className="text-[9px] opacity-60">Redactar correo</span>
                </div>
              </a>
            )}

            <div className="h-px bg-slate-50 my-1" />

            {lead.instagram && (
              <a
                href={
                  lead.instagram.startsWith("http")
                    ? lead.instagram
                    : `https://instagram.com/${lead.instagram.replace("@", "")}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-pink-50 hover:text-pink-700 transition-colors"
              >
                <Instagram size={14} className="text-pink-500" />
                <span>Instagram</span>
              </a>
            )}

            {lead.facebook && (
              <a
                href={
                  lead.facebook.startsWith("http")
                    ? lead.facebook
                    : `https://facebook.com/${lead.facebook}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-colors"
              >
                <Facebook size={14} className="text-blue-600" />
                <span>Facebook</span>
              </a>
            )}

            {lead.tiktok && (
              <a
                href={
                  lead.tiktok.startsWith("http")
                    ? lead.tiktok
                    : `https://tiktok.com/@${lead.tiktok.replace("@", "")}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
                <span>TikTok</span>
              </a>
            )}

            {lead.linkedin && (
              <a
                href={
                  lead.linkedin.startsWith("http")
                    ? lead.linkedin
                    : `https://linkedin.com/in/${lead.linkedin}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-900 transition-colors"
              >
                <Linkedin size={14} className="text-blue-700" />
                <span>LinkedIn</span>
              </a>
            )}

            {lead.website && (
              <a
                href={
                  lead.website.startsWith("http")
                    ? lead.website
                    : `https://${lead.website}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
              >
                <Globe size={14} className="text-slate-600" />
                <div className="flex flex-col">
                  <span className="font-bold">Website Form</span>
                  <span className="text-[9px] opacity-60">Visitar sitio</span>
                </div>
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
