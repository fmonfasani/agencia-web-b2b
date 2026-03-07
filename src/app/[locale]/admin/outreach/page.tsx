import { db } from "@/lib/scoped-prisma";
import { requireTenantMembership } from "@/lib/authz";
import {
    Target,
    Send,
    MessageCircle,
    BarChart3,
    Plus,
    AlertCircle,
    Mail
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const OutreachDashboard = async ({ params }: { params: Promise<{ locale: string }> }) => {
    const { locale } = await params;
    const { user, tenantId } = await requireTenantMembership(["ADMIN", "SUPER_ADMIN"]);
    const userId = (user as { id?: string; userId?: string })?.id ??
        (user as { id?: string; userId?: string })?.userId;
    const scopedDb = await db({ userId, tenantId });

    const campaigns = await (scopedDb as any).outreachCampaign.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { messages: true }
            }
        }
    });

    // Total Stats
    const totalMessages = await (scopedDb as any).outreachMessage.count();
    const sentMessages = await (scopedDb as any).outreachMessage.count({ where: { status: "SENT" } });
    const readMessages = await (scopedDb as any).outreachMessage.count({ where: { status: "READ" } });
    const failedMessages = await (scopedDb as any).outreachMessage.count({ where: { status: "FAILED" } });

    const conversionRate = totalMessages > 0 ? (readMessages / totalMessages) * 100 : 0;

    return (
        <div className="min-h-screen bg-[#f8fafc] p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded uppercase tracking-tighter shadow-lg shadow-blue-500/20">
                                Global Outreach
                            </div>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Campaigns <span className="text-blue-600">Outreach</span></h1>
                        <p className="text-slate-500 font-medium max-w-xl">Gestiona y automatiza tus secuencias de contacto multi-canal para leads de alto potencial.</p>
                    </div>
                    <Link
                        href={`/${locale}/admin/outreach/new`}
                        className="bg-blue-600 text-white px-8 py-4 rounded-[2rem] text-[12px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-xl shadow-blue-200 group"
                    >
                        <Plus size={16} className="group-hover:rotate-90 transition-transform" /> Nueva Campaña
                    </Link>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <StatCard title="Total Contactos" value={totalMessages} icon={Target} color="blue" description="Leads inscritos globalmente" />
                    <StatCard title="Entregados" value={sentMessages} icon={Send} color="emerald" description="Mensajes salientes exitosos" />
                    <StatCard title="Tasa de Lectura" value={`${conversionRate.toFixed(1)}%`} icon={BarChart3} color="amber" description="Aperturas y clicks trackeados" />
                    <StatCard title="Errores" value={failedMessages} icon={AlertCircle} color="rose" description="Problemas de entrega o API" />
                </div>

                {/* Campaigns List */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                            <h2 className="font-black text-slate-800 uppercase text-xs tracking-widest">Estado Maestro de Campañas</h2>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-8 py-5">Campaña / Identidad</th>
                                    <th className="px-8 py-5">Canal Primario</th>
                                    <th className="px-8 py-5">Status Operativo</th>
                                    <th className="px-8 py-5">Volume</th>
                                    <th className="px-8 py-5">Fecha Inicio</th>
                                    <th className="px-8 py-5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {campaigns.map((c: any) => (
                                    <tr key={c.id} className="hover:bg-slate-50/80 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors uppercase tracking-tight">{c.name}</span>
                                                <span className="text-[10px] text-slate-400 font-bold">ID: {c.id.slice(0, 8)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {c.channel === "WHATSAPP" ? (
                                                <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase bg-emerald-50 px-3 py-1.5 rounded-xl w-fit">
                                                    <MessageCircle size={12} /> WhatsApp API
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase bg-blue-50 px-3 py-1.5 rounded-xl w-fit">
                                                    <Mail size={12} /> Resend Sync
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-6">
                                            <StatusBadge status={c.status} />
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900">{c._count.messages}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">Entidades</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="text-slate-500 text-[11px] font-bold tabular-nums">
                                                {new Date(c.createdAt).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <Link
                                                href={`/${locale}/admin/outreach/${c.id}`}
                                                className="bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-block"
                                            >
                                                Métricas
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {campaigns.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 text-slate-400">
                                                <div className="p-6 bg-slate-50 rounded-full">
                                                    <Target size={48} className="opacity-20 translate-x-1 translate-y-1" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="font-black uppercase text-xs tracking-widest">No hay campañas activas</p>
                                                    <p className="text-xs font-medium">Inicia una nueva secuencia para comenzar a medir el ROI.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ title, value, icon: Icon, color, description }: any) => {
    const colorClasses: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600",
        emerald: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        rose: "bg-rose-50 text-rose-600",
    };

    return (
        <div className="bg-white p-7 rounded-[2.5rem] border border-slate-200 shadow-sm group hover:shadow-md transition-all relative overflow-hidden">
            <div className={`w-12 h-12 rounded-2xl ${colorClasses[color]} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
            </div>
            <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{title}</div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
                {description && <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tighter opacity-70">{description}</p>}
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                <Icon size={140} />
            </div>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
        ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
        COMPLETED: "bg-blue-100 text-blue-700 border-blue-200",
        FAILED: "bg-rose-100 text-rose-700 border-rose-200",
    };
    return (
        <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-tighter border ${styles[status] || styles.DRAFT}`}>
            {status}
        </span>
    );
};

export default OutreachDashboard;
