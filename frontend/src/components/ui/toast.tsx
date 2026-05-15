"use client";

import {
  X,
  CheckCircle,
  AlertCircle,
  InfoIcon,
  AlertTriangle,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

let toastId = 0;
let listeners: ((toast: Toast) => void)[] = [];

export function useToast() {
  const addToast = useCallback(
    (message: string, type: ToastType = "info", duration = 4000) => {
      const id = String(toastId++);
      listeners.forEach((l) => l({ id, message, type, duration }));
    },
    [],
  );

  return { addToast };
}

export function ToastContainer({ maxToasts = 4 }: { maxToasts?: number }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev.slice(-(maxToasts - 1)), toast]);
      if (toast.duration) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, toast.duration);
      }
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, [maxToasts]);

  const removeToast = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

// v4 semantic color map — border-left accent, white bg
const TOAST_CONFIG: Record<
  ToastType,
  { borderColor: string; iconColor: string; Icon: React.ElementType }
> = {
  success: {
    borderColor: "#16A34A",
    iconColor: "#16A34A",
    Icon: CheckCircle,
  },
  error: {
    borderColor: "#EF4444",
    iconColor: "#EF4444",
    Icon: AlertCircle,
  },
  warning: {
    borderColor: "#EAB308",
    iconColor: "#EAB308",
    Icon: AlertTriangle,
  },
  info: {
    borderColor: "#3B82F6",
    iconColor: "#3B82F6",
    Icon: InfoIcon,
  },
};

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const { borderColor, iconColor, Icon } = TOAST_CONFIG[toast.type];

  useEffect(() => {
    // Trigger enter animation on next frame
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleClose = () => {
    setVisible(false);
    timerRef.current = setTimeout(onClose, 200);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E3DF",
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 10,
        padding: "12px 14px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        transition: "opacity 200ms ease, transform 200ms ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
      }}
    >
      <Icon
        size={16}
        style={{ color: iconColor, flexShrink: 0, marginTop: 1 }}
        strokeWidth={2}
      />
      <p
        style={{
          flex: 1,
          fontSize: 13,
          fontWeight: 500,
          color: "#111111",
          lineHeight: 1.4,
        }}
      >
        {toast.message}
      </p>
      <button
        onClick={handleClose}
        style={{
          flexShrink: 0,
          color: "#9A9A9A",
          padding: 2,
          borderRadius: 4,
          transition: "color 120ms ease",
        }}
        className="hover:!text-[#111111]"
        aria-label="Cerrar notificación"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
