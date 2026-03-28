"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface CopyInviteButtonProps {
  token: string;
  locale: string;
}

export default function CopyInviteButton({
  token,
  locale,
}: CopyInviteButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/${locale}/auth/accept-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${
        copied
          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
          : "bg-white border-amber-200 text-amber-700 hover:bg-amber-100"
      }`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copiado!" : "Copiar Link"}
    </button>
  );
}
