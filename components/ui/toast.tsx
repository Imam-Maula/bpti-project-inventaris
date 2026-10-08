"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({
      type,
      title,
      description,
      duration = 4000,
    }: Omit<ToastItem, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, title, description, duration }]);
    },
    []
  );

  const toast = {
    success: useCallback(
      (title: string, description?: string) =>
        addToast({ type: "success", title, description }),
      [addToast]
    ),
    error: useCallback(
      (title: string, description?: string) =>
        addToast({ type: "error", title, description }),
      [addToast]
    ),
    warning: useCallback(
      (title: string, description?: string) =>
        addToast({ type: "warning", title, description }),
      [addToast]
    ),
    info: useCallback(
      (title: string, description?: string) =>
        addToast({ type: "info", title, description }),
      [addToast]
    ),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(item.id);
    }, item.duration || 4000);

    return () => clearTimeout(timer);
  }, [item, onDismiss]);

  const icons = {
    success: (
      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
    ),
    error: (
      <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
    ),
    warning: (
      <AlertTriangle className="h-4 w-4 shrink-0 text-foreground" />
    ),
    info: (
      <Info className="h-4 w-4 shrink-0 text-foreground" />
    ),
  };

  const borders = {
    success: "border-border bg-card",
    error: "border-destructive/30 bg-card",
    warning: "border-border bg-card",
    info: "border-border bg-card",
  };

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 rounded-md border p-3.5 shadow-md transition-[opacity,transform] duration-200 ease-out ${borders[item.type]}`}
    >
      <div className="mt-0.5">{icons[item.type]}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground leading-tight">
          {item.title}
        </p>
        {item.description && (
          <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
            {item.description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Tutup notifikasi"
        className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-hidden"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
