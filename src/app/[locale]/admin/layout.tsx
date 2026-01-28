import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar minimalista */}
      <aside className="w-64 bg-[#0a0a0b] text-white hidden md:flex flex-col">
        <div className="h-20 flex items-center px-8 border-b border-white/10">
          <span className="font-bold text-xl tracking-tight">
            Agencia Admin
          </span>
        </div>
        <nav className="flex-1 py-8 px-4 space-y-2">
          <a
            href="/admin/dashboard"
            className="flex items-center gap-3 px-4 py-3 bg-white/10 text-white rounded-xl font-medium text-sm"
          >
            Dashboard
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium text-sm transition-colors"
          >
            Blog (Coming Soon)
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl font-medium text-sm transition-colors"
          >
            Settings
          </a>
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="size-8 rounded-full bg-primary flex items-center justify-center text-xs font-bold">
              AD
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold">Admin</span>
              <span className="text-xs text-slate-500">Super User</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
