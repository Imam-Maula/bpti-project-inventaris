"use client";

import { useEffect, useState } from "react";
import { AuditLogWithAdmin } from "@/lib/services/audit-service";
import {
  X,
  History,
  User,
  Calendar,
  Layers,
  ArrowRight,
  Code,
  FileText,
  CheckCircle2,
} from "lucide-react";

interface AuditLogDetailModalProps {
  log: AuditLogWithAdmin | null;
  open: boolean;
  onClose: () => void;
}

export function AuditLogDetailModal({
  log,
  open,
  onClose,
}: AuditLogDetailModalProps) {
  const [activeTab, setActiveTab] = useState<"diff" | "raw">("diff");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !log) return null;

  // Format tanggal Indonesia
  const formattedDate = new Date(log.createdAt).toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });

  // Parse JSON oldValue dan newValue secara aman
  const parseJsonSafe = (raw: string | null) => {
    if (!raw) return null;
    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return raw;
    }
  };

  const oldData = parseJsonSafe(log.oldValue);
  const newData = parseJsonSafe(log.newValue);

  // Cari key yang berubah untuk perbandingan visual
  const getDiffEntries = () => {
    if (!oldData && !newData) return [];

    if (oldData && typeof oldData === "object" && newData && typeof newData === "object") {
      const allKeys = Array.from(
        new Set([...Object.keys(oldData), ...Object.keys(newData)])
      ).filter(
        (key) =>
          key !== "createdAt" &&
          key !== "updatedAt" &&
          key !== "id" &&
          key !== "adminId"
      );

      return allKeys.map((key) => {
        const oldVal = (oldData as Record<string, unknown>)[key];
        const newVal = (newData as Record<string, unknown>)[key];
        const isChanged = JSON.stringify(oldVal) !== JSON.stringify(newVal);

        return {
          key,
          oldVal: oldVal !== undefined ? String(oldVal) : "—",
          newVal: newVal !== undefined ? String(newVal) : "—",
          isChanged,
        };
      });
    }

    if (!oldData && newData && typeof newData === "object") {
      return Object.entries(newData)
        .filter(
          ([key]) =>
            key !== "createdAt" &&
            key !== "updatedAt" &&
            key !== "id" &&
            key !== "adminId"
        )
        .map(([key, val]) => ({
          key,
          oldVal: "—",
          newVal: val !== undefined ? String(val) : "—",
          isChanged: true,
        }));
    }

    return [];
  };

  const diffEntries = getDiffEntries();

  // Helper badge warna aksi
  const getActionBadgeColor = (action: string) => {
    if (action.includes("TAMBAH") || action.includes("PULIHKAN")) {
      return "border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
    }
    if (action.includes("UBAH") || action.includes("PENGEMBALIAN")) {
      return "border-blue-500/20 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
    }
    if (action.includes("ARSIP")) {
      return "border-amber-500/20 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
    }
    if (action.includes("HAPUS")) {
      return "border-rose-500/20 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
    }
    return "border-border bg-muted text-foreground";
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="audit-detail-title"
                  className="text-lg font-bold tracking-tight text-foreground"
                >
                  Detail Histori Audit Trail
                </h2>
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getActionBadgeColor(
                    log.action
                  )}`}
                >
                  {log.action}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                ID Rekaman: <span className="font-mono">{log.id}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-hidden"
            aria-label="Tutup jendela audit"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-5 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <User className="h-3.5 w-3.5" />
                <span className="font-medium">Admin Pelaksana</span>
              </div>
              <p className="font-semibold text-foreground text-sm">
                {log.admin.name}
              </p>
              <p className="text-[11px] text-muted-foreground font-mono">
                @{log.admin.username}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-medium">Waktu Eksekusi</span>
              </div>
              <p className="font-semibold text-foreground">{formattedDate}</p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Layers className="h-3.5 w-3.5" />
                <span className="font-medium">Target Entitas</span>
              </div>
              <p className="font-semibold text-foreground">{log.entityType}</p>
              <p className="text-[11px] text-muted-foreground font-mono truncate" title={log.entityId}>
                ID: {log.entityId}
              </p>
            </div>
          </div>

          {/* Rincian Naratif */}
          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm">
                Rincian Aktivitas
              </h3>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed font-normal">
              {log.details}
            </p>
          </div>

          {/* Tabs Diff vs Raw JSON */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("diff")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === "diff"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Perbandingan Perubahan (Diff)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("raw")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === "raw"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Code className="h-3.5 w-3.5" />
                  Data Mentah JSON
                </button>
              </div>
              {diffEntries.length > 0 && activeTab === "diff" && (
                <span className="text-[11px] text-muted-foreground">
                  {diffEntries.filter((d) => d.isChanged).length} atribut termutasi
                </span>
              )}
            </div>

            {/* Panel Diff Perubahan */}
            {activeTab === "diff" && (
              <div>
                {diffEntries.length > 0 ? (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/60 text-[11px] font-semibold text-muted-foreground">
                          <th className="py-2.5 px-3">Atribut / Kolom</th>
                          <th className="py-2.5 px-3">Nilai Sebelum</th>
                          <th className="py-2.5 px-3">Nilai Sesudah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border font-mono text-[11px]">
                        {diffEntries.map((entry) => (
                          <tr
                            key={entry.key}
                            className={
                              entry.isChanged
                                ? "bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
                                : "hover:bg-muted/20"
                            }
                          >
                            <td className="py-2 px-3 font-medium text-foreground">
                              {entry.key}
                            </td>
                            <td className="py-2 px-3">
                              {entry.oldVal !== "—" && entry.isChanged ? (
                                <span className="inline-block rounded bg-rose-500/10 px-1.5 py-0.5 text-rose-700 dark:text-rose-400 line-through">
                                  {entry.oldVal}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {entry.oldVal}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {entry.newVal !== "—" && entry.isChanged ? (
                                <span className="inline-block rounded bg-emerald-500/10 px-1.5 py-0.5 font-semibold text-emerald-700 dark:text-emerald-400">
                                  {entry.newVal}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">
                                  {entry.newVal}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-8 text-center text-muted-foreground">
                    <CheckCircle2 className="h-6 w-6 text-muted-foreground/60 mb-2" />
                    <p className="text-xs">Tidak ada data diff terstruktur untuk aksi ini.</p>
                    <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                      Rincian lengkap telah terdokumentasi pada narasi aktivitas di atas.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Panel Raw JSON */}
            {activeTab === "raw" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <span className="font-semibold text-muted-foreground text-[11px]">
                    Payload Sebelum (oldValue)
                  </span>
                  <pre className="max-h-56 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[10px] text-foreground">
                    {oldData ? JSON.stringify(oldData, null, 2) : "null"}
                  </pre>
                </div>
                <div className="space-y-1.5">
                  <span className="font-semibold text-muted-foreground text-[11px]">
                    Payload Sesudah (newValue)
                  </span>
                  <pre className="max-h-56 overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[10px] text-foreground">
                    {newData ? JSON.stringify(newData, null, 2) : "null"}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border px-6 py-3 bg-muted/20 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted focus:outline-hidden"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
