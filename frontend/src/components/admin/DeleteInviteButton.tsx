"use client";

import { Trash2, Trash } from "lucide-react";
import { useState } from "react";

interface DeleteInviteButtonProps {
  id: string;
  onDelete: (id: string) => Promise<void>;
}

export default function DeleteInviteButton({
  id,
  onDelete,
}: DeleteInviteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleDelete = async () => {
    if (!confirm) {
      setConfirm(true);
      setTimeout(() => setConfirm(false), 3000); // Reset confirm after 3 sec
      return;
    }

    setLoading(true);
    try {
      await onDelete(id);
    } catch (error) {
      console.error("DELETE_INVITE_ERROR:", error);
      setLoading(false);
      setConfirm(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className={`p-2 rounded-xl transition-all border ${
        confirm
          ? "bg-red-500 text-white border-red-600 scale-105"
          : "bg-white text-slate-300 hover:text-red-500 hover:border-red-100 hover:bg-red-50"
      }`}
      title={confirm ? "Confirmar eliminación" : "Eliminar invitación"}
    >
      {loading ? (
        <div className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : confirm ? (
        <Trash size={14} />
      ) : (
        <Trash2 size={14} />
      )}
    </button>
  );
}
