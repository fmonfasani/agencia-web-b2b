"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

interface StrategicBriefProps {
    brief: string | null;
    leadName?: string;
}

export function StrategicBrief({ brief, leadName }: StrategicBriefProps) {
    if (!brief) {
        return (
            <div className="p-8 border-2 border-dashed border-gray-200 rounded-xl text-center">
                <p className="text-gray-500">No hay investigación estratégica disponible para este lead.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <span>🚀</span> Strategic Brief: {leadName || "Lead"}
                </h3>
            </div>

            <div className="p-8 prose prose-slate dark:prose-invert max-w-none prose-h2:text-blue-600 dark:prose-h2:text-blue-400 prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3">
                <ReactMarkdown>{brief}</ReactMarkdown>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-400 italic">
                    Generado automáticamente por el Engine de Inteligencia de Webshooks.
                </p>
            </div>
        </div>
    );
}
