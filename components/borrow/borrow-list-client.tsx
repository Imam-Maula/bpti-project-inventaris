"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Item, BorrowStatus } from "@prisma/client";
import { BorrowModal } from "./borrow-modal";
import { ReturnDialog, BorrowRecordDetail } from "./return-dialog";
import { BeritaAcaraDialog, BeritaAcaraData } from "./berita-acara-dialog";
import { LiveSearch } from "@/components/tables/live-search";
import { Pagination } from "@/components/tables/pagination";
import {
  Plus,
  ArrowDownLeft,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileText,
} from "lucide-react";

interface BorrowRecordWithItem {
  id: string;
  borrowCode: string;
  itemId: string;
  adminId: string;
  borrowerName: string;
  borrowerContact: string;
  borrowQuantity: number;
  borrowDate: Date;
  dueDate: Date;
  returnDate: Date | null;
  status: BorrowStatus;
  notes: string | null;
  item: {
    id: string;
    code: string;
    name: string;
    category: string;
    location: string;
    condition: string;
  };
  admin: {
    id: string;
    name: string;
    username: string;
  };
}

interface BorrowListClientProps {
  initialRecords: BorrowRecordWithItem[];
  availableItems: Item[];
}

export function BorrowListClient({
  initialRecords,
  availableItems,
}: BorrowListClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const [borrowModalOpen, setBorrowModalOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedRecordForReturn, setSelectedRecordForReturn] =
    useState<BorrowRecordDetail | null>(null);

  const [beritaAcaraOpen, setBeritaAcaraOpen] = useState(false);
  const [selectedBeritaAcara, setSelectedBeritaAcara] =
    useState<BeritaAcaraData | null>(null);

  const now = useMemo(() => new Date(), []);

  // Filter records di client secara instan dari props RSC (selalu tersinkronisasi)
  const filteredRecords = useMemo(() => {
    return initialRecords.filter((rec) => {
      const matchSearch =
        search === "" ||
        rec.borrowCode.toLowerCase().includes(search.toLowerCase()) ||
        rec.borrowerName.toLowerCase().includes(search.toLowerCase()) ||
        rec.borrowerContact.toLowerCase().includes(search.toLowerCase()) ||
        rec.item.name.toLowerCase().includes(search.toLowerCase()) ||
        rec.item.code.toLowerCase().includes(search.toLowerCase());

      const isOverdue =
        new Date(rec.dueDate) < now && rec.status === "DIPINJAM";

      if (selectedStatus === "OVERDUE") {
        return matchSearch && isOverdue;
      }

      const matchStatus =
        selectedStatus === "ALL" || rec.status === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [initialRecords, search, selectedStatus, now]);

  // State Paginasi Sirkulasi
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // State Pilihan Massal Transaksi
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Kalkulasi data terpaginasi
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const safeCurrentPage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1;
  const paginatedRecords = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, safeCurrentPage, pageSize]);

  // Handler perubahan filter yang sekaligus mereset halaman dan seleksi
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  const handleStatusChange = (val: string) => {
    setSelectedStatus(val);
    setCurrentPage(1);
    setSelectedIds(new Set());
  };

  // Helper seleksi massal
  const isAllPageSelected =
    paginatedRecords.length > 0 &&
    paginatedRecords.every((rec) => selectedIds.has(rec.id));
  const isSomePageSelected =
    paginatedRecords.some((rec) => selectedIds.has(rec.id)) && !isAllPageSelected;

  const handleToggleSelectAllPage = () => {
    const next = new Set(selectedIds);
    if (isAllPageSelected) {
      paginatedRecords.forEach((r) => next.delete(r.id));
    } else {
      paginatedRecords.forEach((r) => next.add(r.id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelectItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllFiltered = () => {
    setSelectedIds(new Set(filteredRecords.map((r) => r.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleOpenReturn = (record: BorrowRecordWithItem) => {
    setSelectedRecordForReturn({
      id: record.id,
      borrowCode: record.borrowCode,
      borrowerName: record.borrowerName,
      borrowerContact: record.borrowerContact,
      borrowQuantity: record.borrowQuantity,
      borrowDate: new Date(record.borrowDate),
      dueDate: new Date(record.dueDate),
      status: record.status,
      item: {
        name: record.item.name,
        code: record.item.code,
        category: record.item.category,
        location: record.item.location,
      },
    });
    setReturnDialogOpen(true);
  };

  const handleOpenBeritaAcara = (record: BorrowRecordWithItem) => {
    setSelectedBeritaAcara({
      id: record.id,
      borrowCode: record.borrowCode,
      borrowerName: record.borrowerName,
      borrowerContact: record.borrowerContact,
      borrowQuantity: record.borrowQuantity,
      borrowDate: record.borrowDate,
      dueDate: record.dueDate,
      returnDate: record.returnDate,
      status: record.status,
      notes: record.notes,
      item: {
        code: record.item.code,
        name: record.item.name,
        category: record.item.category,
        location: record.item.location,
      },
      admin: {
        name: record.admin.name,
        username: record.admin.username,
      },
    });
    setBeritaAcaraOpen(true);
  };

  const exportRecordsToCSV = (
    recordsToExport: BorrowRecordWithItem[],
    filenameSuffix: string
  ) => {
    if (recordsToExport.length === 0) return;
    const headers = [
      "Kode Transaksi",
      "Nama Peminjam",
      "Kontak Peminjam",
      "Kode Barang",
      "Nama Barang",
      "Jumlah Unit",
      "Tanggal Pinjam",
      "Batas Waktu",
      "Tanggal Realisasi",
      "Status",
      "Catatan Keperluan",
    ];

    const rows = recordsToExport.map((rec) => [
      `"${rec.borrowCode.replace(/"/g, '""')}"`,
      `"${rec.borrowerName.replace(/"/g, '""')}"`,
      `"${rec.borrowerContact.replace(/"/g, '""')}"`,
      `"${rec.item.code.replace(/"/g, '""')}"`,
      `"${rec.item.name.replace(/"/g, '""')}"`,
      rec.borrowQuantity,
      new Date(rec.borrowDate).toISOString().slice(0, 10),
      new Date(rec.dueDate).toISOString().slice(0, 10),
      rec.returnDate ? new Date(rec.returnDate).toISOString().slice(0, 10) : "-",
      rec.status,
      `"${(rec.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `laporan_sirkulasi_${filenameSuffix}_${dateStr}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    exportRecordsToCSV(filteredRecords, "semua");
  };

  const handleExportSelectedCSV = () => {
    const selectedRecords = filteredRecords.filter((r) => selectedIds.has(r.id));
    exportRecordsToCSV(selectedRecords, "terpilih");
  };

  const handleSuccessAction = () => {
    // Revalidasi halus via RSC router.refresh() tanpa reload paksa browser
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* Bar Kontrol & Filter */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <LiveSearch
            value={search}
            onChange={handleSearchChange}
            placeholder="Cari kode transaksi, peminjam, atau barang..."
            className="w-full sm:max-w-xs"
          />

          {/* Filter Status */}
          <select
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            aria-label="Filter Status Peminjaman"
          >
            <option value="ALL">Semua Status</option>
            <option value="DIPINJAM">Sedang Dipinjam (Aktif)</option>
            <option value="DIKEMBALIKAN">Selesai Dikembalikan</option>
            <option value="OVERDUE">Terlambat Pengembalian</option>
          </select>
        </div>

        {/* Tombol Aksi Kanan */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-2xs hover:bg-muted focus:outline-hidden"
            title="Unduh seluruh data sirkulasi dalam format CSV/Excel"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Ekspor CSV / Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setBorrowModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus:outline-hidden focus:ring-1 focus:ring-ring"
          >
            <Plus className="h-4 w-4" />
            <span>Catat Peminjaman</span>
          </button>
        </div>
      </div>

      {/* Bilah Aksi Massal (Bulk Action Bar) */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3.5 shadow-xs transition-all">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {selectedIds.size}
            </span>
            <span className="text-xs font-medium text-foreground">
              transaksi sirkulasi terpilih
            </span>

            {selectedIds.size < filteredRecords.length && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="text-xs font-semibold text-primary underline hover:opacity-80"
              >
                Pilih Seluruh Hasil Filter ({filteredRecords.length} transaksi)
              </button>
            )}

            <button
              type="button"
              onClick={handleClearSelection}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Batal Pilih
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportSelectedCSV}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Ekspor Terpilih CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabel Sirkulasi Peminjaman */}
      <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
              <tr>
                <th scope="col" className="w-10 px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomePageSelected;
                    }}
                    onChange={handleToggleSelectAllPage}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-1 focus:ring-primary"
                    aria-label="Pilih semua transaksi di halaman ini"
                  />
                </th>
                <th scope="col" className="px-4 py-3">
                  Kode Transaksi
                </th>
                <th scope="col" className="px-4 py-3">
                  Barang Inventaris
                </th>
                <th scope="col" className="px-4 py-3">
                  Peminjam & Kontak
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Jumlah
                </th>
                <th scope="col" className="px-4 py-3">
                  Tenggat Waktu
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    <ArrowLeftRight className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                    <p className="font-medium">Tidak ada transaksi sirkulasi ditemukan</p>
                    <p className="text-xs">
                      {search || selectedStatus !== "ALL"
                        ? "Coba ubah kata kunci atau bersihkan filter status."
                        : "Belum ada transaksi peminjaman tercatat. Klik 'Catat Peminjaman' untuk memulai."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => {
                  const isOverdue =
                    new Date(rec.dueDate) < now && rec.status === "DIPINJAM";
                  const isSelected = selectedIds.has(rec.id);

                  return (
                    <tr
                      key={rec.id}
                      className={`transition-colors hover:bg-muted/30 ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="w-10 px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectItem(rec.id)}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-1 focus:ring-primary"
                          aria-label={`Pilih transaksi ${rec.borrowCode}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {/* deslop-ignore-next-line 34 */}
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {rec.borrowCode}
                        </span>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(rec.borrowDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {rec.item.name}
                        </div>
                        {/* deslop-ignore-next-line 34 */}
                        <div className="text-xs font-mono text-muted-foreground">
                          {rec.item.code} &bull; {rec.item.location}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground">{rec.borrowerName}</div>
                        <div className="text-xs text-muted-foreground">
                          {rec.borrowerContact}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="tabular-nums text-xs font-semibold text-foreground">
                          {rec.borrowQuantity} unit
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div
                          className={
                            isOverdue
                              ? "font-semibold text-destructive"
                              : "text-foreground"
                          }
                        >
                          {new Date(rec.dueDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                        {isOverdue && (
                          <span className="text-[11px] font-medium text-destructive">
                            Lewat Tenggat
                          </span>
                        )}
                        {rec.returnDate && (
                          <div className="text-[11px] text-muted-foreground">
                            Kembali:{" "}
                            {new Date(rec.returnDate).toLocaleDateString(
                              "id-ID",
                              { day: "numeric", month: "short" }
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {rec.status === "DIPINJAM" && !isOverdue && (
                          <span className="inline-flex items-center gap-1 rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                            <Clock className="h-3 w-3" />
                            Dipinjam
                          </span>
                        )}
                        {rec.status === "DIPINJAM" && isOverdue && (
                          <span className="inline-flex items-center gap-1 rounded border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            Terlambat
                          </span>
                        )}
                        {rec.status === "DIKEMBALIKAN" && (
                          <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                            <CheckCircle2 className="h-3 w-3" />
                            Dikembalikan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenBeritaAcara(rec)}
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs hover:bg-muted focus:outline-hidden"
                            title="Pratinjau & Cetak Berita Acara Peminjaman (PDF)"
                            aria-label={`Cetak Berita Acara ${rec.borrowCode}`}
                          >
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            <span>Berita Acara</span>
                          </button>

                          {rec.status === "DIPINJAM" && (
                            <button
                              type="button"
                              onClick={() => handleOpenReturn(rec)}
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground shadow-2xs hover:bg-muted focus:outline-hidden"
                              title="Konfirmasi Pengembalian Barang"
                              aria-label={`Konfirmasi pengembalian ${rec.item.name} (${rec.borrowCode})`}
                            >
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                              <span>Kembalikan</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Kontrol Paginasi Sirkulasi */}
        <Pagination
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={filteredRecords.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Modal Catat Peminjaman */}
      <BorrowModal
        open={borrowModalOpen}
        onClose={() => setBorrowModalOpen(false)}
        availableItems={availableItems}
        onSuccess={handleSuccessAction}
      />

      {/* Dialog Konfirmasi Pengembalian */}
      <ReturnDialog
        open={returnDialogOpen}
        onClose={() => setReturnDialogOpen(false)}
        record={selectedRecordForReturn}
        onSuccess={handleSuccessAction}
      />

      {/* Dialog Cetak / Pratinjau Berita Acara (PDF) */}
      <BeritaAcaraDialog
        open={beritaAcaraOpen}
        data={selectedBeritaAcara}
        onClose={() => setBeritaAcaraOpen(false)}
      />
    </div>
  );
}
