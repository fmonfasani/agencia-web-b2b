"use client";

import React from "react";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  locale: string;
}

export default function LogoutButton({ locale }: LogoutButtonProps) {
  const handleLogout = async () => {
    try {
      const response = await fetch(`/${locale}/api/auth/logout`, {
        method: "POST",
      });

      if (response.ok) {
        window.location.href = `/${locale}/auth/sign-in`;
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl font-medium text-sm transition-all group"
    >
      <LogOut
        size={18}
        className="group-hover:translate-x-1 transition-transform"
      />
      <span>Cerrar Sesión</span>
    </button>
  );
}
