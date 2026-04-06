"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, InfoIcon } from "lucide-react";
import { useState, useCallback, useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Context y provider para toasts globales
let toastId = 0;
let listeners: ((toast: Toast) => void)[] = [];

export function useToast() {
  const addToast = useCallback((message: string, type: ToastType = "info", duration = 3000) => {
    const id = String(toastId++);
    const toast: Toast = { id, message, type, duration };
    listeners.forEach((listener) => listener(toast));
  }, []);

  return { addToast };
}

interface ToastContainerProps {
  maxToasts?: number;
}

export function ToastContainer({ maxToasts = 3 }: ToastContainerProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev.slice(-maxToasts + 1), toast]);

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

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastProps {
  toast: Toast;
  onClose: () => void;
}

function Toast({ toast, onClose }: ToastProps) {
  const bgClasses = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    info: "bg-blue-50 border-blue-200",
  };

  const textClasses = {
    success: "text-green-700",
    error: "text-red-700",
    info: "text-blue-700",
  };

  const iconClasses = {
    success: "text-green-600",
    error: "text-red-600",
    info: "text-blue-600",
  };

  const IconComponent = {
    success: CheckCircle,
    error: AlertCircle,
    info: InfoIcon,
  }[toast.type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: 100 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      exit={{ opacity: 0, y: 20, x: 100 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={`border rounded-lg p-4 flex items-start gap-3 ${bgClasses[toast.type]}`}
    >
      <IconComponent size={20} className={`flex-shrink-0 mt-0.5 ${iconClasses[toast.type]}`} />
      <p className={`text-sm font-medium flex-1 ${textClasses[toast.type]}`}>
        {toast.message}
      </p>
      <button
        onClick={onClose}
        className={`flex-shrink-0 ${textClasses[toast.type]} hover:opacity-75 transition-opacity`}
      >
        <X size={16} />
      </button>
    </motion.div>
  );
}
