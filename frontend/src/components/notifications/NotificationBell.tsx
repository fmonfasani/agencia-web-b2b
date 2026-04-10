"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import type { Notification } from "@/lib/saas-client";

const TYPE_ICONS: Record<string, string> = {
  training_ingested: "✅",
  training_failed: "❌",
  training_pending: "🕐",
  agent_error: "⚠️",
  system: "🔔",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function NotificationBell() {
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl hover:bg-[#F2F2F7] transition-colors"
        aria-label="Notificaciones"
      >
        <Bell size={20} className="text-[#3A3A3C]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-[#FF3B30] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#F2F2F7] flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#1C1C1E]">Notificaciones</p>
              {unreadCount > 0 && (
                <p className="text-xs text-[#8E8E93]">{unreadCount} sin leer</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="p-1.5 rounded-lg hover:bg-[#F2F2F7] text-[#007AFF] transition-colors"
                  title="Marcar todo como leído"
                >
                  <CheckCheck size={16} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-[#F2F2F7] text-[#8E8E93] transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={24} className="mx-auto mb-2 text-[#C7C7CC]" />
                <p className="text-sm text-[#8E8E93] font-medium">
                  Sin notificaciones
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onRead={markRead}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification: n,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string) => void;
}) {
  return (
    <div
      className={`flex gap-3 px-4 py-3 border-b border-[#F2F2F7] last:border-0 transition-colors ${
        !n.read ? "bg-[#F0F8FF]" : "hover:bg-[#F9F9FB]"
      }`}
    >
      <span className="text-lg flex-shrink-0 mt-0.5">
        {TYPE_ICONS[n.type] ?? "🔔"}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold text-[#1C1C1E] ${!n.read ? "font-bold" : ""}`}
        >
          {n.title}
        </p>
        <p className="text-xs text-[#3A3A3C] mt-0.5 line-clamp-2">{n.body}</p>
        <p className="text-[10px] text-[#8E8E93] mt-1">
          {timeAgo(n.created_at)}
        </p>
      </div>
      {!n.read && (
        <button
          onClick={() => onRead(n.id)}
          className="flex-shrink-0 p-1 rounded-lg hover:bg-[#E5E5EA] text-[#007AFF] transition-colors mt-0.5"
          title="Marcar como leída"
        >
          <Check size={14} />
        </button>
      )}
    </div>
  );
}
