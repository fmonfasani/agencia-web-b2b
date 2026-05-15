import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WebshooksLogo } from "@/components/WebshooksLogo";
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

  const primaryColor = branding.primaryColor || "#f59e0b";
  const sidebarColor = branding.sidebarColor || "#edebe6";
  const appName = branding.appName || tenantName;
  const logoUrl = branding.logoUrl;

  return (
    <div
      className="min-h-screen flex overflow-hidden"
      style={{
        backgroundColor: "#F7F6F3",
        fontFamily: branding.fontFamily
          ? `'${branding.fontFamily}', sans-serif`
          : undefined,
      }}
    >
      {/* Sidebar — Webshooks Design System v4 */}
      <aside
        className="w-[240px] hidden md:flex flex-col relative z-50 shrink-0"
        style={{
          backgroundColor: branding.brandingEnabled ? sidebarColor : "#FFFFFF",
          borderRight: "1px solid #E5E3DF",
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: "0 16px",
            height: 56,
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid #E5E3DF",
            flexShrink: 0,
          }}
        >
          {!branding.brandingEnabled ? (
            <WebshooksLogo variant="lockup" theme="light" fontSize={14} />
          ) : (
            <div className="flex items-center gap-3">
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: primaryColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={appName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <WebshooksLogo variant="icon" theme="light" fontSize={20} />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#111111",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {appName}
                </span>
                {branding.subName && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: "#9A9A9A",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {branding.subName}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div
          className="flex-1 overflow-y-auto admin-scroll"
          style={{
            padding: "16px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
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
        <div style={{ borderTop: "1px solid #E5E3DF", padding: 12 }}>
          <div className="flex items-center gap-3 mb-2">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: "#F1F5F9",
                border: "1px solid #E5E3DF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 600,
                color: "#475569",
              }}
            >
              {(session?.user?.email?.[0] ?? "A").toUpperCase()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#111111",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {session?.user?.email || "Admin"}
              </p>
              <p
                style={{
                  fontSize: 11,
                  color: "#9A9A9A",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {membership.role}
              </p>
            </div>
          </div>
          <LogoutButton locale={locale} />
        </div>
      </aside>

      {/* Main content */}
      <main
        className="flex-1 overflow-auto admin-scroll"
        style={{ backgroundColor: "#F7F6F3" }}
      >
        {children}
      </main>
    </div>
  );
}
