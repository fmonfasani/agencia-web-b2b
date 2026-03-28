"use client";

import React, { useState } from "react";
import { Zap, Save, Palette, Image as ImageIcon, Type } from "lucide-react";

interface BrandingConfig {
    primaryColor: string;
    sidebarColor: string;
    accentColor: string;
    logoUrl: string;
    appName: string;
    subName: string;
    fontFamily: string;
    brandingEnabled: boolean;
}

interface BrandingSettingsFormProps {
    initialData: BrandingConfig;
    onSave: (data: BrandingConfig) => Promise<any>;
}

export default function BrandingSettingsForm({ initialData, onSave }: BrandingSettingsFormProps) {
    const [formData, setFormData] = useState<BrandingConfig>(initialData);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await onSave(formData);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error("Save error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Configuration Form */}
            <form onSubmit={handleSubmit} className="bg-white rounded-[14px] p-8 shadow-card border border-[#f0f2f1] space-y-6">
                <div className="flex items-center gap-3 mb-4">
                    <Palette className="text-[#4a7fa5]" size={24} />
                    <h2 className="text-xl font-bold text-[#1a2623]">Configuración de Marca</h2>
                </div>

                <div className="space-y-4">
                    {/* App Identity */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">Nombre de la App</label>
                            <input
                                type="text"
                                value={formData.appName}
                                onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                                className="w-full bg-[#fafafa] border border-[#e5e7eb] rounded-[9px] px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#4a7fa5] outline-none transition-all"
                                placeholder="Webshooks"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">Subtítulo Sidebar</label>
                            <input
                                type="text"
                                value={formData.subName}
                                onChange={(e) => setFormData({ ...formData, subName: e.target.value })}
                                className="w-full bg-[#fafafa] border border-[#e5e7eb] rounded-[9px] px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#4a7fa5] outline-none transition-all"
                                placeholder="Agencia Leads"
                            />
                        </div>
                    </div>

                    {/* Logo URL */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#374151] uppercase tracking-wider flex items-center gap-2">
                            <ImageIcon size={14} /> Logo URL (PNG/SVG)
                        </label>
                        <input
                            type="text"
                            value={formData.logoUrl}
                            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                            className="w-full bg-[#fafafa] border border-[#e5e7eb] rounded-[9px] px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#4a7fa5] outline-none transition-all"
                            placeholder="https://tu-dominio.com/logo.png"
                        />
                    </div>

                    {/* Colors */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">Color Primario (Accent)</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={formData.primaryColor || "#4a7fa5"}
                                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                    className="w-10 h-10 rounded-[8px] border-none cursor-pointer overflow-hidden p-0"
                                />
                                <input
                                    type="text"
                                    value={formData.primaryColor || "#4a7fa5"}
                                    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                                    className="flex-1 bg-[#fafafa] border border-[#e5e7eb] rounded-[9px] px-3 py-2 text-sm uppercase"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-[#374151] uppercase tracking-wider">Color Sidebar</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={formData.sidebarColor || "#2c3e55"}
                                    onChange={(e) => setFormData({ ...formData, sidebarColor: e.target.value })}
                                    className="w-10 h-10 rounded-[8px] border-none cursor-pointer overflow-hidden p-0"
                                />
                                <input
                                    type="text"
                                    value={formData.sidebarColor || "#2c3e55"}
                                    onChange={(e) => setFormData({ ...formData, sidebarColor: e.target.value })}
                                    className="flex-1 bg-[#fafafa] border border-[#e5e7eb] rounded-[9px] px-3 py-2 text-sm uppercase"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Typography */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[#374151] uppercase tracking-wider flex items-center gap-2">
                            <Type size={14} /> Google Font Family
                        </label>
                        <select
                            value={formData.fontFamily || "DM Sans"}
                            onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
                            className="w-full bg-[#fafafa] border border-[#e5e7eb] rounded-[9px] px-4 py-2.5 text-sm outline-none"
                        >
                            <option value="DM Sans">DM Sans (Default)</option>
                            <option value="Inter">Inter</option>
                            <option value="Roboto">Roboto</option>
                            <option value="Outfit">Outfit</option>
                            <option value="Montserrat">Montserrat</option>
                            <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                        </select>
                    </div>

                    {/* Toggle */}
                    <div className="flex items-center justify-between p-4 bg-[#f8fafc] rounded-[10px] border border-[#e2e8f0]">
                        <div>
                            <p className="text-sm font-bold text-[#1e293b]">Activar Branding Personalizado</p>
                            <p className="text-[11px] text-[#64748b]">Aplica estos estilos globalmente para todos los usuarios del tenant.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, brandingEnabled: !formData.brandingEnabled })}
                            className={`w-12 h-6 rounded-full transition-colors relative ${formData.brandingEnabled ? 'bg-[#2ecc8f]' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.brandingEnabled ? 'right-1' : 'left-1'}`} />
                        </button>
                    </div>
                </div>

                <button
                    disabled={isSaving}
                    className="w-full bg-[#135bec] hover:bg-[#0e45b5] text-white font-bold py-3 rounded-[10px] flex items-center justify-center gap-2 shadow-btn transition-all disabled:opacity-50"
                >
                    {isSaving ? "Guardando..." : saved ? "¡Configuración Guardada!" : "Guardar Cambios"}
                    {!isSaving && !saved && <Save size={18} />}
                </button>
            </form>

            {/* Preview Section */}
            <div className="space-y-4">
                <label className="text-xs font-bold text-[#374151] uppercase tracking-wider ml-1">Vista Previa en Vivo</label>
                <div className="bg-[#f1f5f9] rounded-[20px] p-6 border-4 border-[#e2e8f0] shadow-2xl relative overflow-hidden aspect-[4/3] pointer-events-none">
                    {/* Mock Sidebar */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-[80px] transition-colors duration-500"
                        style={{ background: formData.brandingEnabled ? formData.sidebarColor : "linear-gradient(180deg, #2c3e55 0%, #34495e 100%)" }}
                    >
                        <div className="p-4 flex flex-col items-center gap-6">
                            <div
                                className="w-10 h-10 rounded-[10px] flex items-center justify-center overflow-hidden transition-all duration-500"
                                style={{ background: formData.brandingEnabled ? (formData.primaryColor || "#4a7fa5") : "#4a7fa5", boxShadow: "0 4px 10px rgba(0,0,0,0.1)" }}
                            >
                                {formData.logoUrl ? (
                                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Zap size={20} className="text-white fill-white" />
                                )}
                            </div>
                            <div className="w-8 h-2 bg-white/20 rounded-full" />
                            <div className="w-8 h-2 bg-white/10 rounded-full" />
                            <div className="w-8 h-2 bg-white/10 rounded-full" />
                            <div className="w-8 h-2 bg-white/10 rounded-full" />
                        </div>
                    </div>

                    {/* Mock Header */}
                    <div className="absolute top-0 right-0 left-[80px] h-[50px] bg-white border-b border-slate-200 px-6 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-800 transition-all duration-300">
                                {formData.appName || "Webshooks"}
                            </span>
                            <span className="text-[7px] text-slate-400 font-medium">Panel de Control</span>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-slate-100" />
                    </div>

                    {/* Mock Content */}
                    <div className="absolute top-[50px] right-0 left-[80px] bottom-0 p-6 space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-16 bg-white rounded-[12px] border border-slate-100 p-3 space-y-2 shadow-sm">
                                    <div className="w-6 h-1 bg-slate-100 rounded-full" />
                                    <div className="w-10 h-2 bg-slate-200 rounded-full" />
                                    <div className={`w-4 h-1 rounded-full ${i === 1 ? 'bg-[#2ecc8f]' : 'bg-[#3b82f6]'}`} />
                                </div>
                            ))}
                        </div>
                        <div className="h-32 bg-white rounded-[14px] shadow-sm border border-slate-100 p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="w-20 h-3 bg-slate-100 rounded-full" />
                                <div
                                    className="w-16 h-6 rounded-[8px] transition-colors duration-500"
                                    style={{ background: formData.brandingEnabled ? (formData.primaryColor || "#135bec") : "#135bec" }}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="w-full h-2 bg-slate-50 rounded-full" />
                                <div className="w-full h-2 bg-slate-50 rounded-full" />
                                <div className="w-2/3 h-2 bg-slate-50 rounded-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
