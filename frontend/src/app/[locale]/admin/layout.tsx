import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
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
  const session = await auth();

  if (!session?.user) {
    redirect(`/${locale}/auth/sign-in`);
  }

  type AdminBranding = {
    primaryColor?: string;
    sidebarColor?: string;
    appName?: string;
    subName?: string;
    logoUrl?: string;
    fontFamily?: string;
    brandingEnabled?: boolean;
  };

  const branding: AdminBranding = {};
  const tenantName = "Webshooks";
  const userRole = "ADMIN";

  const membership = { role: userRole };

  const primaryColor = branding.primaryColor || "#4a7fa5";
  const sidebarColor = branding.sidebarColor || "#2c3e55";
  const appName = branding.appName || tenantName;
  const logoUrl = branding.logoUrl;

  return (
    <div
      className="min-h-screen bg-[#f7f7f7] flex overflow-hidden"
      style={{
        fontFamily: branding.fontFamily
          ? `'${branding.fontFamily}', sans-serif`
          : "'DM Sans', 'Nunito', sans-serif",
      }}
    >
      {/* Sidebar — Webshooks Design System */}
      <aside
        className="w-[220px] text-white hidden md:flex flex-col relative z-50 shrink-0"
        style={{
          background: branding.brandingEnabled
            ? sidebarColor
            : "linear-gradient(180deg, #2c3e55 0%, #34495e 60%, #2c3e55 100%)",
          boxShadow: "2px 0 20px rgba(0,0,0,0.12)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Brand Header */}
        <div style={{ padding: "22px 20px 16px" }}>
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: branding.brandingEnabled ? primaryColor : "#4a7fa5",
                boxShadow: branding.brandingEnabled
                  ? `0 4px 12px ${primaryColor}66`
                  : "0 4px 12px rgba(59,130,246,0.40)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={appName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Zap size={18} className="text-white fill-white" />
              )}
            </div>
            <div className="flex flex-col">
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: "#ffffff",
                  lineHeight: 1.2,
                }}
              >
                {appName}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  color: "#c8daea",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                {branding.subName ||
                  (branding.brandingEnabled ? "" : "Agencia Leads")}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div
          className="flex-1 overflow-y-auto admin-scroll"
          style={{
            padding: "12px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
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

          {/* 1b. TENANTS */}
          <SidebarCategory
            label="Tenants"
            iconName="Building2"
            defaultOpen={true}
          >
            <SidebarNavItem
              href={`/${locale}/admin/dashboard`}
              iconName="LayoutGrid"
              label="Control Center"
            />
          </SidebarCategory>

          {/* 2. COMERCIAL */}
          <SidebarCategory label="Comercial" iconName="Briefcase">
            <SidebarNavItem
              href={`/${locale}/admin/dashboard`}
              iconName="Zap"
              label="Prospecting IA"
            />
            <SidebarNavItem
              href={`/${locale}/admin/pipeline`}
              iconName="Layers"
              label="Lead Pipeline IA"
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
              href={`/${locale}/admin/outreach`}
              iconName="Target"
              label="Campañas Outreach"
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
              href={`/${locale}/admin/training`}
              iconName="BrainCircuit"
              label="Entrenamiento"
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
              href={`/${locale}/admin/observability`}
              iconName="Activity"
              label="Observabilidad"
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
              href={`/${locale}/admin/settings/branding`}
              iconName="Palette"
              label="Identidad Visual"
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
        <div
          style={{
            padding: "16px 12px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(74,127,165,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserIcon size={15} className="text-slate-300" />
            </div>
            <div className="flex flex-col min-w-0">
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#ffffff",
                  lineHeight: 1.3,
                }}
              >
                Core Admin
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: "#2ecc8f",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                {membership.role}
              </span>
            </div>
          </div>
          <div className="mt-2 px-1">
            <LogoutButton locale={locale} />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main
        className="flex-1 overflow-auto relative admin-scroll"
        style={{ background: "#f7f7f7" }}
      >
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  );
}
