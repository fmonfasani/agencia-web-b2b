"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MoreVertical,
  DollarSign,
  User,
  Calendar,
  MessageSquare,
  Zap,
} from "lucide-react";
import type { Deal, Lead, DealStage } from "@prisma/client";

// Definición de etapas del Pipeline (Coincide con DealStage de Prisma)
const STAGES = [
  { id: DealStage.PROSPECTING, label: "Prospección", color: "bg-blue-500" },
  { id: DealStage.QUALIFIED, label: "Calificado", color: "bg-purple-500" },
  { id: DealStage.PROPOSAL, label: "Propuesta", color: "bg-amber-500" },
  { id: DealStage.NEGOTIATION, label: "Negociación", color: "bg-orange-500" },
  { id: DealStage.CLOSED_WON, label: "Ganado", color: "bg-emerald-500" },
  { id: DealStage.CLOSED_LOST, label: "Perdido", color: "bg-rose-500" },
] as const;

interface DealWithLead extends Deal {
  lead?: Lead | null;
}

interface DealKanbanProps {
  initialDeals: DealWithLead[];
  onStageChange: (dealId: string, newStage: DealStage) => Promise<any>;
}

export default function DealKanban({
  initialDeals,
  onStageChange,
}: DealKanbanProps) {
  const [deals, setDeals] = useState(initialDeals);

  const handleDragEnd = async (dealId: string, newStage: DealStage) => {
    // Optimistic update
    const oldDeals = [...deals];
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)),
    );

    try {
      await onStageChange(dealId, newStage);
    } catch (error) {
      setDeals(oldDeals);
      console.error("Failed to update deal stage", error);
    }
  };

  return (
    <div className="flex gap-6 overflow-x-auto pb-8 min-h-[calc(100vh-250px)] scrollbar-hide">
      {STAGES.map((stage) => (
        <div key={stage.id} className="flex-shrink-0 w-80 flex flex-col gap-4">
          {/* Stage Header */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${stage.color}`} />
              <h3 className="font-black text-slate-800 uppercase tracking-tighter text-sm">
                {stage.label}
              </h3>
              <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {deals.filter((d) => d.stage === stage.id).length}
              </span>
            </div>
          </div>

          {/* Kanban Column */}
          <div className="flex-1 bg-slate-50/50 rounded-[2rem] p-3 border border-slate-200/50 space-y-3 min-h-[400px]">
            <AnimatePresence mode="popLayout">
              {deals
                .filter((deal) => deal.stage === stage.id)
                .map((deal) => (
                  <motion.div
                    key={deal.id}
                    layoutId={deal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{
                      y: -4,
                      boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)",
                    }}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing group"
                    onClick={() => {
                      // Traspaso manual o drag simulation
                      const nextStageIdx =
                        STAGES.findIndex((s) => s.id === stage.id) + 1;
                      if (STAGES[nextStageIdx]) {
                        handleDragEnd(deal.id, STAGES[nextStageIdx].id);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {deal.lead?.companyName || "No Lead"}
                      </span>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={14} className="text-slate-400" />
                      </button>
                    </div>

                    <h4 className="font-bold text-slate-900 leading-tight mb-2">
                      {deal.lead?.name || "Deal Sin Nombre"}
                    </h4>

                    {/* Value Badge */}
                    <div className="flex items-center gap-1.5 text-emerald-600 font-black text-sm mb-4">
                      <DollarSign size={14} />
                      {Number(deal.value || 0).toLocaleString()}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                          <User size={10} />
                        </div>
                        <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-blue-600">
                          <Zap size={10} fill="currentColor" />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-slate-400">
                        <div className="flex items-center gap-1">
                          <MessageSquare size={12} />
                          <span className="text-[10px] font-bold">0</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <span className="text-[10px] font-bold italic">
                            {new Date(deal.createdAt).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}
