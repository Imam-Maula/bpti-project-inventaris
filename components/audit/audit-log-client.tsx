"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AuditLogWithAdmin } from "@/lib/services/audit-service";
import { AuditLogDetailModal } from "./audit-log-detail-modal";
import { Pagination } from "@/components/tables/pagination";
import {
  History,
  Search,
  Filter,
  Download,
  RotateCcw,
  Eye,
  User,
  Package,
  ArrowLeftRight,
  ShieldAlert,
  Calendar,
  Layers,
} from "lucide-react";

interface AuditLogClientProps {
  initialLogs: AuditLogWithAdmin[];
}

export function AuditLogClient({ initialLogs }: AuditLogClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [selectedAction, setSelectedAction] = useState("ALL");
  const [selectedEntity, setSelectedEntity] = useState("ALL");

  const [selectedLog, setSelectedLog] = useState<AuditLogWithAdmin | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Handler update filter yang otomatis mereset halaman ke 1
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleActionChange = (value: string) => {
    setSelectedAction(value);
    setCurrentPage(1);
  };

  const handleEntityChange = (value: string) => {
    setSelectedEntity(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Filter logs di sisi klien
  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      // 1. Filter entitas
      if (selectedEntity !== "ALL" && log.entityType !== selectedEntity) {
        return false;
      }

      // 2. Filter aksi
      if (selectedAction !== "ALL" && log.action !== selectedAction) {
        return false;
      }

      // 3. Filter pencarian teks
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchDetails = log.details.toLowerCase().includes(query);
        const matchAction = log.action.toLowerCase().includes(query);
        const matchEntityId = log.entityId.toLowerCase().includes(query);
        const matchAdminName = log.admin.name.toLowerCase().includes(query);
        const matchAdminUser = log.admin.username.toLowerCase().includes(query);

        return (
          matchDetails ||
          matchAction ||
          matchEntityId ||
          matchAdminName ||
          matchAdminUser
        );
      }

      return true;
    });
  }, [initialLogs, selectedEntity, selectedAction, search]);

  // Statistik ringkasan
  const stats = useMemo(() => {
    const total = initialLogs.length;
    const itemLogs = initialLogs.filter((l) => l.entityType === "ITEM").length;
    const borrowLogs = initialLogs.filter(
      (l) => l.entityType === "BORROW_RECORD"
    ).length;
    const uniqueAdmins = new Set(initialLogs.map((l) => l.adminId)).size;

    return { total, itemLogs, borrowLogs, uniqueAdmins };
  }, [initialLogs]);

  // Pagination data slicing
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;

  const paginatedLogs = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, safeCurrentPage, pageSize]);

  // Ekspor Log Terfilter ke CSV
  const handleExportCsv = () => {
    const headers = [
      "ID Log",
      "Waktu (WIB)",
      "Admin Pelaksana",
      "Username Admin",
      "Aksi",
      "Tipe Entitas",
      "Target ID",
      "Rincian Aktivitas",
    ];

    const rows = filteredLogs.map((log) => [
      log.id,
      new Date(log.createdAt).toISOString(),
      `"${log.admin.name.replace(/"/g, '""')}"`,
      log.admin.username,
      log.action,
      log.entityType,
      log.entityId,
      `"${log.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `audit_log_inventaris_bpti_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  // Helper badge warna aksi
  const getActionBadge = (action: string) => {
    let classes = "border-border bg-muted text-foreground";
    if (action.includes("TAMBAH") || action.includes("PULIHKAN")) {
      classes =
        "border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400";
    } else if (action.includes("UBAH") || action.includes("PENGEMBALIAN")) {
      classes =
        "border-blue-500/20 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400";
    } else if (action.includes("ARSIP")) {
      classes =
        "border-amber-500/20 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400";
    } else if (action.includes("HAPUS")) {
      classes =
        "border-rose-500/20 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400";
    }

    return (
      <span
        className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide ${classes}`}
      >
        {action}
      </span>
    );
  };

  return (
    <div className="flex h-full flex-1 flex-col min-h-0 overflow-hidden space-y-4">
      {/* Kartu Ringkasan Metrik Audit (Statis & Tetap Diam) */}
      <div className="shrink-0 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <History className="h-4 w-4 text-primary" />
            <span>Total Log Tercatat</span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {stats.total}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              entri
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Mutasi Master Barang</span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {stats.itemLogs}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              aktivitas
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <ArrowLeftRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Sirkulasi Peminjaman</span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {stats.borrowLogs}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              transaksi
            </span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <User className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>Admin Terlibat</span>
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
            {stats.uniqueAdmins}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              petugas
            </span>
          </p>
        </div>
      </div>

      {/* Toolbar Filter & Aksi (Statis & Tetap Diam) */}
      <div className="shrink-0 flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Pencarian */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Cari narasi rincian, aksi, admin, atau ID entitas..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Filter Entitas */}
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:inline" />
            <select
              aria-label="Filter Entitas"
              value={selectedEntity}
              onChange={(e) => handleEntityChange(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-hidden"
            >
              <option value="ALL">Semua Entitas</option>
              <option value="ITEM">Master Barang (ITEM)</option>
              <option value="BORROW_RECORD">Sirkulasi (BORROW_RECORD)</option>
              <option value="SYSTEM">Sistem</option>
            </select>
          </div>

          {/* Filter Aksi */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:inline" />
            <select
              aria-label="Filter Jenis Aksi"
              value={selectedAction}
              onChange={(e) => handleActionChange(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:border-primary focus:outline-hidden"
            >
              <option value="ALL">Semua Jenis Aksi</option>
              <option value="TAMBAH_BARANG">TAMBAH_BARANG</option>
              <option value="UBAH_BARANG">UBAH_BARANG</option>
              <option value="UBAH_GAMBAR_BARANG">UBAH_GAMBAR_BARANG</option>

              <option value="PULIHKAN_KARANTINA">PULIHKAN_KARANTINA</option>
              <option value="ARSIPKAN_BARANG">ARSIPKAN_BARANG</option>
              <option value="AKTIFKAN_BARANG">AKTIFKAN_BARANG</option>
              <option value="HAPUS_PERMANEN">HAPUS_PERMANEN</option>
              <option value="ARSIPKAN_OTOMATIS">ARSIPKAN_OTOMATIS</option>
              <option value="ARSIPKAN_MASSAL">ARSIPKAN_MASSAL</option>
              <option value="AKTIFKAN_MASSAL">AKTIFKAN_MASSAL</option>
              <option value="CATAT_PEMINJAMAN">CATAT_PEMINJAMAN</option>
              <option value="PENGEMBALIAN_BARANG">PENGEMBALIAN_BARANG</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
            title="Unduh rekaman terfilter dalam format CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50"
            title="Muat ulang rekaman log terbaru"
          >
            <RotateCcw
              className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Segarkan</span>
          </button>
        </div>
      </div>

      {/* Tabel Log Aktivitas - Area Scroll Mandiri */}
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 backdrop-blur-xs text-xs font-semibold text-muted-foreground shadow-2xs">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Waktu & Tanggal</th>
                <th className="py-3 px-4 whitespace-nowrap">Admin Pelaksana</th>
                <th className="py-3 px-4 whitespace-nowrap">Jenis Tindakan</th>
                <th className="py-3 px-4 whitespace-nowrap">Target Entitas</th>
                <th className="py-3 px-4">Rincian Narasi</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => {
                  const logDate = new Date(log.createdAt);
                  const timeStr = logDate.toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  const dateStr = logDate.toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Waktu */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-foreground">
                          {timeStr} WIB
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {dateStr}
                        </div>
                      </td>

                      {/* Admin */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-medium text-foreground">
                          {log.admin.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          @{log.admin.username}
                        </div>
                      </td>

                      {/* Jenis Tindakan */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      {/* Entitas */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-foreground">
                          {log.entityType}
                        </span>
                        <div
                          className="font-mono text-[10px] text-muted-foreground truncate max-w-[140px]"
                          title={log.entityId}
                        >
                          {log.entityId}
                        </div>
                      </td>

                      {/* Rincian Naratif */}
                      <td className="py-3 px-4">
                        <p
                          className="text-foreground/90 line-clamp-2 leading-relaxed"
                          title={log.details}
                        >
                          {log.details}
                        </p>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLog(log);
                            setDetailModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted focus:outline-hidden transition-colors shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5 text-primary" />
                          <span>Detail Diff</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="h-8 w-8 text-muted-foreground/60" />
                      <p className="font-semibold text-foreground text-sm">
                        Tidak Ada Catatan Log Aktivitas
                      </p>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {search || selectedAction !== "ALL" || selectedEntity !== "ALL"
                          ? "Tidak ada rekaman audit yang sesuai dengan kata kunci atau filter yang Anda pilih."
                          : "Belum ada rekaman histori audit yang tercatat di sistem."}
                      </p>
                      {(search ||
                        selectedAction !== "ALL" ||
                        selectedEntity !== "ALL") && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch("");
                            setSelectedAction("ALL");
                            setSelectedEntity("ALL");
                            setCurrentPage(1);
                          }}
                          className="mt-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                        >
                          Reset Semua Filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination - Tetap Terlihat di Bawah Tabel */}
        {totalItems > 0 && (
          <div className="shrink-0 border-t border-border px-4 py-3 bg-card">
            <Pagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[10, 25, 50, 100]}
            />
          </div>
        )}
      </div>

      {/* Modal Detail & Diff */}
      <AuditLogDetailModal
        log={selectedLog}
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedLog(null);
        }}
      />
    </div>
  );
}
