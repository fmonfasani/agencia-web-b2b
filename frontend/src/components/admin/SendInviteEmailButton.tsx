"use client";

import { Mail, Loader2, Check, Zap } from "lucide-react";
import { useState } from "react";

interface SendInviteEmailButtonProps {
  id: string;
  onSend: (id: string) => Promise<{ success: boolean; error?: unknown }>;
}

export default function SendInviteEmailButton({
  id,
  onSend,
}: SendInviteEmailButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSend = async () => {
    setLoading(true);
    setStatus("idle");
    try {
      const result = await onSend(id);
      if (result.success) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch (error) {
      console.error("SEND_EMAIL_ACTION_ERROR:", error);
      setStatus("error");
    } finally {
      setLoading(false);
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <button
      onClick={handleSend}
      disabled={loading || status === "success"}
      className={`p-2 rounded-xl transition-all border flex items-center justify-center ${
        status === "success"
          ? "bg-emerald-50 text-emerald-600 border-emerald-200"
          : status === "error"
            ? "bg-red-50 text-red-600 border-red-200"
            : "bg-white text-slate-300 hover:text-primary hover:border-primary/20 hover:bg-primary/5"
      }`}
      title="Re-enviar invitación por Email"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : status === "success" ? (
        <Check size={14} />
      ) : status === "error" ? (
        <Zap size={14} />
      ) : (
        <Mail size={14} />
      )}
    </button>
  );
}
