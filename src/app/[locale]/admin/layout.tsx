import React from "react";
import { requireAuth } from "@/lib/auth/request-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Zap, User as UserIcon } from "lucide-react";
import LogoutButton from "@/components/admin/LogoutButton";
import SidebarNavItem from "@/components/admin/SidebarNavItem";
import SidebarCategory from "@/components/admin/SidebarCategory";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const auth = await requireAuth();

  if (!auth) {
    redirect(`/${locale}/auth/sign-in`);
  }

  let membership = await prisma.membership.findFirst({
    where: {
      userId: auth.user.id,
      tenantId: auth.session.tenantId || undefined,
      status: "ACTIVE",
    },
  });

  if (!membership) {
    membership = await prisma.membership.findFirst({
      where: { userId: auth.user.id, status: "ACTIVE" },
    });
  }

  if (!membership) {
    redirect(`/${locale}/auth/sign-in?error=no_membership`);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Sidebar Revenue OS - Sistema Operativo de Ingresos */}
      <aside className="w-72 bg-[#050506] text-white hidden md:flex flex-col border-r border-white/5 relative z-50">
        {/* Brand Header */}
        <div className="h-24 flex items-center px-8">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-white rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.15)] ring-1 ring-white/20">
              <Zap size={22} className="text-black fill-black" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tight bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
                Revenue OS
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                Agencia Leads
              </span>
            </div>
          </div>
        </div>

        {/* Navigation - 8 Business Units */}
        <div className="flex-1 overflow-y-auto px-3 space-y-2 py-4 custom-scrollbar">
          {/* 1. EXECUTIVE */}
          <SidebarCategory label="Executive" iconName="PieChart">
            <SidebarNavItem
              href="#"
              iconName="Zap"
              label="Vista Global"
              isLocked
            />
            <SidebarNavItem
              href={`/${locale}/admin/revenue`}
              iconName="DollarSign"
              label="Revenue (MRR/ARR)"
            />
            <SidebarNavItem
              href="#"
              iconName="TrendingUp"
              label="Forecast"
              isLocked
            />
          </SidebarCategory>

          {/* 2. COMERCIAL */}
          <SidebarCategory
            label="Comercial"
            iconName="Briefcase"
            defaultOpen={true}
          >
            <SidebarNavItem
              href={`/${locale}/admin/dashboard`}
              iconName="Users"
              label="Leads Hub"
            />
            <SidebarNavItem
              href={`/${locale}/admin/deals`}
              iconName="Layers"
              label="Pipeline Kanban"
            />
            <SidebarNavItem
              href="#"
              iconName="Target"
              label="Oportunidades"
              isLocked
            />
          </SidebarCategory>

          {/* 3. CLIENTES */}
          <SidebarCategory label="Clientes" iconName="Handshake">
            <SidebarNavItem
              href="#"
              iconName="Users"
              label="Cartera Activa"
              isLocked
            />
            <SidebarNavItem
              href="#"
              iconName="Activity"
              label="Health Score"
              isLocked
            />
            <SidebarNavItem
              href="#"
              iconName="FileCheck"
              label="Renovaciones"
              isLocked
            />
          </SidebarCategory>

          {/* 4. MARKETING */}
          <SidebarCategory label="Marketing" iconName="Megaphone">
            <SidebarNavItem
              href="#"
              iconName="Search"
              label="Campañas Ads"
              isLocked
            />
            <SidebarNavItem
              href="#"
              iconName="Target"
              label="ROI por Canal"
              isLocked
            />
            <SidebarNavItem
              href="#"
              iconName="Search"
              label="SEO / SEM"
              isLocked
            />
          </SidebarCategory>

          {/* 5. OPERACIONES */}
          <SidebarCategory label="Operaciones" iconName="Cpu">
            <SidebarNavItem
              href={`/${locale}/admin/operations/team`}
              iconName="Users"
              label="Gestión de Equipo"
            />
            <SidebarNavItem
              href="#"
              iconName="CreditCard"
              label="Facturación"
              isLocked
            />
            <SidebarNavItem
              href="#"
              iconName="FileText"
              label="Contratos"
              isLocked
            />
            <SidebarNavItem
              href={`/${locale}/admin/agents`}
              iconName="Bot"
              label="AI Factory"
            />
            <SidebarNavItem
              href="#"
              iconName="Zap"
              label="Automatización RPA"
              isLocked
            />
          </SidebarCategory>

          {/* 6. DATA */}
          <SidebarCategory label="Data" iconName="Database">
            <SidebarNavItem
              href="#"
              iconName="Zap"
              label="ETL Status"
              isLocked
            />
            <SidebarNavItem
              href="#"
              iconName="Activity"
              label="Integraciones"
              isLocked
            />
            <SidebarNavItem
              href="#"
              iconName="History"
              label="Logs de Data"
              isLocked
            />
          </SidebarCategory>

          {/* 7. SEGURIDAD */}
          <SidebarCategory label="Seguridad" iconName="ShieldCheck">
            <SidebarNavItem
              href={`/${locale}/admin/security/iam`}
              iconName="Key"
              label="Centros IAM"
            />
            <SidebarNavItem
              href="#"
              iconName="ShieldCheck"
              label="Roles (RBAC)"
              isLocked
            />
            <SidebarNavItem
              href="#"
              iconName="History"
              label="Auditoría"
              isLocked
            />
          </SidebarCategory>

          {/* 8. SETTINGS */}
          <SidebarCategory label="Settings" iconName="Settings">
            <SidebarNavItem
              href="#"
              iconName="Settings"
              label="General"
              isLocked
            />
            <SidebarNavItem
              href="#"
              iconName="CreditCard"
              label="Suscripción Pro"
              isLocked
            />
          </SidebarCategory>
        </div>

        {/* Footer User Profile */}
        <div className="p-5 bg-white/[0.03] border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3 px-3 py-2.5 bg-white/5 rounded-2xl border border-white/5 shadow-inner backdrop-blur-md">
            <div className="size-10 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-bold ring-1 ring-white/10 shadow-inner group-hover:scale-105 transition-transform">
              <UserIcon size={18} className="text-slate-300" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold truncate text-slate-100 italic">
                Core Admin
              </span>
              <span className="text-[9px] text-emerald-500 uppercase tracking-[2px] font-black flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span>
                {membership.role}
              </span>
            </div>
          </div>
          <div className="px-1">
            <LogoutButton locale={locale} />
          </div>
        </div>
      </aside>

      {/* Main OS Canvas */}
      <main className="flex-1 overflow-auto bg-[#fafafa] relative scroll-smooth">
        {/* Subtle Background Decoration */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-slate-200/20 blur-[120px] rounded-full -mr-64 -mt-64 pointer-events-none opacity-50 z-0"></div>
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}
