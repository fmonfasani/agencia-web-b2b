"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

interface IntelligenceMarkdownProps {
    content: string | null | undefined;
    title?: string;
    icon?: string;
}

export function IntelligenceMarkdown({ content, title, icon }: IntelligenceMarkdownProps) {
    if (!content) {
        return (
            <div className="p-6 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                <p className="text-slate-400 text-sm italic whitespace-pre-wrap">
                    No hay información disponible para esta sección.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {title && (
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    {icon && <span>{icon}</span>}
                    {title}
                </h3>
            )}
            <div className="prose prose-slate prose-sm max-w-none 
                prose-h1:text-slate-900 prose-h1:font-black prose-h1:text-lg
                prose-h2:text-blue-600 prose-h2:font-bold prose-h2:text-base prose-h2:mt-4
                prose-p:text-slate-600 prose-p:leading-relaxed
                prose-strong:text-slate-900 prose-strong:font-bold
                prose-ul:list-disc prose-ul:pl-4
                prose-li:text-slate-600
                bg-white border border-slate-100 p-6 rounded-2xl shadow-sm">
                <ReactMarkdown>{content}</ReactMarkdown>
            </div>
        </div>
    );
}
