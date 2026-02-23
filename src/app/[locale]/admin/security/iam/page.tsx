import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/request-auth";
import { redirect } from "next/navigation";
import {
  UserPlus,
  MoreVertical,
  Zap,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import CopyInviteButton from "@/components/admin/CopyInviteButton";
import DeleteInviteButton from "@/components/admin/DeleteInviteButton";
import SendInviteEmailButton from "@/components/admin/SendInviteEmailButton";
import { sendInvitationEmail } from "@/lib/mail";

// Server Action para generar invitación
async function createInvitation(formData: FormData) {
  "use server";
  const email = formData.get("email") as string;
  const role = formData.get("role") as string;
  const auth = await requireAuth();
  if (!auth || !auth.session.tenantId) return;

  // Generar un token seguro
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

  // Guardar invitación en la DB
  const invite = await prisma.invitation.create({
    data: {
      email,
      role,
      tokenHash: token,
      tenantId: auth.session.tenantId,
      invitedById: auth.user.id,
      expiresAt,
      status: "PENDING",
    },
    include: { tenant: true },
  });

  // Intentar enviar mail si tenemos configuración SMTP
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const inviteUrl = `${baseUrl}/auth/accept-invite?token=${token}`;

    await sendInvitationEmail({
      to: email,
      tenantName: invite.tenant.name,
      inviteUrl,
      role,
    });
  }

  revalidatePath("/[locale]/admin/security/iam", "page");
}

// Server Action para eliminar invitación
async function deleteInvitation(id: string) {
  "use server";
  const auth = await requireAuth();
  if (!auth) return;

  await prisma.invitation.delete({
    where: { id },
  });

  revalidatePath("/[locale]/admin/security/iam", "page");
}

// Server Action para re-enviar mail manualmente
async function sendManualEmail(id: string) {
  "use server";
  const auth = await requireAuth();
  if (!auth) return { success: false, error: "No autorizado" };

  const invite = await prisma.invitation.findUnique({
    where: { id },
    include: { tenant: true },
  });

  if (!invite) return { success: false, error: "Invitación no encontrada" };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const inviteUrl = `${baseUrl}/auth/accept-invite?token=${invite.tokenHash}`;

  return await sendInvitationEmail({
    to: invite.email,
    tenantName: invite.tenant.name,
    inviteUrl,
    role: invite.role,
  });
}

export default async function IAMPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const auth = await requireAuth();
  if (!auth) redirect(`/${locale}/auth/sign-in`);

  // 1. Obtener miembros actuales
  const members = await prisma.membership.findMany({
    where: { tenantId: auth.session.tenantId || "" },
    include: { user: true },
  });

  // 2. Obtener invitaciones pendientes
  const invitations = await prisma.invitation.findMany({
    where: {
      tenantId: auth.session.tenantId || "",
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  interface Invitation {
    id: string;
    email: string;
    role: string;
    expiresAt: Date;
    tokenHash: string;
  }

  interface Membership {
    id: string;
    role: string;
    user: {
      email: string;
    };
  }

  const roles = ["SALES", "MARKETING", "DEVELOPER", "MANAGER", "VIEWER"];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck size={12} />
              Identity & Access Management
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            IAM Control Center
          </h1>
          <p className="text-slate-500 mt-1 max-w-xl text-lg">
            Emite invitaciones con permisos granulares y monitorea el acceso a
            tu tenant.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULARIO DE INVITACIÓN */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm sticky top-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <UserPlus size={20} className="text-primary" />
              Invitar Colaborador
            </h2>
            <form action={createInvitation} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Email Corporativo
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="ejemplo@agencia.com"
                  required
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Rol de Acceso
                </label>
                <select
                  name="role"
                  className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-700"
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                <Clock size={20} className="text-amber-500" />
                <div className="text-[10px] leading-tight">
                  <p className="font-bold text-slate-700 uppercase">
                    Validez Temporal
                  </p>
                  <p className="text-slate-500 mt-0.5">
                    La invitación expira en 7 días por seguridad.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#0a0a0b] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2"
              >
                Generar Invitación
                <Zap size={14} fill="white" />
              </button>
            </form>
          </div>
        </div>

        {/* LISTAS */}
        <div className="lg:col-span-2 space-y-8">
          {/* INVITACIONES PENDIENTES */}
          {invitations.length > 0 && (
            <div className="bg-white rounded-[2.5rem] border border-amber-200 shadow-sm overflow-hidden bg-gradient-to-b from-amber-50/30 to-white">
              <div className="p-8 border-b border-amber-100 flex items-center justify-between">
                <h3 className="font-black text-amber-900 flex items-center gap-2 uppercase tracking-tight text-sm">
                  <Clock size={16} />
                  Invitaciones Pendientes
                </h3>
              </div>
              <div className="divide-y divide-amber-100">
                {(invitations as unknown as Invitation[]).map(
                  (invite: Invitation) => (
                    <div
                      key={invite.id}
                      className="p-6 flex items-center justify-between hover:bg-amber-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                          <Mail size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">
                            {invite.email}
                          </p>
                          <div className="flex gap-2 items-center mt-1">
                            <span className="text-[9px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">
                              {invite.role}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Expira:{" "}
                              {new Date(invite.expiresAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SendInviteEmailButton
                          id={invite.id}
                          onSend={sendManualEmail}
                        />
                        <CopyInviteButton
                          token={invite.tokenHash}
                          locale={locale}
                        />
                        <DeleteInviteButton
                          id={invite.id}
                          onDelete={deleteInvitation}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* MIEMBROS ACTUALES */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                Equipo Activo
                <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full border border-slate-200">
                  {members.length} USERS
                </span>
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Identidad
                    </th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(members as unknown as Membership[]).map(
                    (member: Membership) => (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="size-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-black/5">
                              {member.user.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 text-sm block">
                                {member.user.email}
                              </span>
                              <span className="text-[9px] text-emerald-500 font-black uppercase flex items-center gap-1">
                                <CheckCircle2 size={8} /> Activo
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <span className="font-black text-[10px] text-slate-700 uppercase bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                            {member.role}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button className="p-2 text-slate-300 hover:text-slate-900 transition-all">
                            <MoreVertical size={18} />
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
