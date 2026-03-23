import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Download, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

export default async function PublicProposalPage({
    params,
}: {
    params: Promise<{ slug: string; locale: string }>;
}) {
    const { slug } = await params;

    const proposal = await prisma.proposal.findUnique({
        where: { slug },
        include: {
            lead: {
                select: {
                    companyName: true,
                    name: true,
                    industry: true,
                },
            },
        },
    });

    if (!proposal) {
        notFound();
    }

    // Update view count
    await prisma.proposal.update({
        where: { id: proposal.id },
        data: {
            viewCount: { increment: 1 },
            viewedAt: new Date(),
        },
    });

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-500/30">
            {/* Premium Gradient Background */}
            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute top-0 -left-1/4 h-screen w-[80vw] bg-blue-600/10 blur-[120px]" />
                <div className="absolute top-[20%] -right-1/4 h-screen w-[80vw] bg-indigo-600/10 blur-[120px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-4xl px-6 py-20">
                {/* Header Section */}
                <header className="mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
                    <div className="mb-6 flex items-center gap-2">
                        <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold tracking-wider text-blue-400 uppercase">
                            Propuesta Exclusiva
                        </span>
                    </div>
                    <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-6xl">
                        {proposal.title}
                    </h1>
                    <p className="text-xl text-gray-400">
                        Preparada para <span className="font-semibold text-white">{proposal.lead.companyName || proposal.lead.name}</span>
                    </p>
                </header>

                {/* Action Bar */}
                <div className="sticky top-6 z-50 mb-12 flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-black/60 p-4 backdrop-blur-xl transition hover:bg-black/70">
                    <Link
                        href={`/api/proposals/${proposal.id}/pdf`}
                        className="flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-black font-semibold transition hover:bg-gray-200"
                    >
                        <Download size={18} />
                        Descargar PDF
                    </Link>
                    <div className="h-8 w-px bg-white/10 hidden md:block" />
                    <button className="flex items-center gap-2 rounded-xl border border-green-500/50 bg-green-500/10 px-6 py-2.5 text-green-400 font-semibold transition hover:bg-green-500/20">
                        <CheckCircle size={18} />
                        Aceptar Propuesta
                    </button>
                    <button className="flex items-center gap-2 rounded-xl border border-red-500/50 bg-red-500/10 px-6 py-2.5 text-red-400 font-semibold transition hover:bg-red-500/20">
                        <XCircle size={18} />
                        Solicitar Ajustes
                    </button>
                </div>

                {/* Executive Summary Cards */}
                <div className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
                        <h3 className="mb-2 text-sm font-medium text-blue-400 uppercase tracking-widest">Inversión</h3>
                        <p className="text-2xl font-bold">{proposal.investment}</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
                        <h3 className="mb-2 text-sm font-medium text-indigo-400 uppercase tracking-widest">Tiempo Estimado</h3>
                        <p className="text-2xl font-bold">{proposal.timeline}</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm">
                        <h3 className="mb-2 text-sm font-medium text-emerald-400 uppercase tracking-widest">ROI Proyectado</h3>
                        <p className="text-2xl font-bold">{proposal.roi || "Alto Impacto"}</p>
                    </div>
                </div>

                {/* Proposal Content */}
                <article className="prose prose-invert prose-headings:font-bold prose-h1:text-4xl prose-h2:text-3xl prose-p:text-gray-300 prose-li:text-gray-300 max-w-none rounded-3xl border border-white/10 bg-white/[0.01] p-8 md:p-12">
                    <ReactMarkdown>{proposal.content}</ReactMarkdown>
                </article>

                {/* Footer */}
                <footer className="mt-20 border-t border-white/5 pt-12 text-center text-gray-500">
                    <p>© {new Date().getFullYear()} Webshooks - Strategic Growth Agency</p>
                    <p className="mt-2 text-sm">Esta propuesta es confidencial y ha sido generada especialmente para {proposal.lead.companyName}.</p>
                </footer>
            </div>
        </div>
    );
}
