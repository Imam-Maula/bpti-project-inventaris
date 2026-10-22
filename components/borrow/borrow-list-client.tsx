"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Item, BorrowStatus } from "@prisma/client";
import { BorrowModal } from "./borrow-modal";
import { ReturnDialog, BorrowRecordDetail } from "./return-dialog";
import { LiveSearch } from "@/components/tables/live-search";
import {
  Plus,
  ArrowDownLeft,
  ArrowLeftRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
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
            onChange={setSearch}
            placeholder="Cari kode transaksi, peminjam, atau barang..."
            className="w-full sm:max-w-xs"
          />

          {/* Filter Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            aria-label="Filter Status Peminjaman"
          >
            <option value="ALL">Semua Status</option>
            <option value="DIPINJAM">Sedang Dipinjam (Aktif)</option>
            <option value="DIKEMBALIKAN">Selesai Dikembalikan</option>
            <option value="OVERDUE">Terlambat Pengembalian</option>
          </select>
        </div>

        {/* Tombol Catat Peminjaman */}
        <button
          type="button"
          onClick={() => setBorrowModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus:outline-hidden focus:ring-1 focus:ring-ring"
        >
          <Plus className="h-4 w-4" />
          <span>Catat Peminjaman</span>
        </button>
      </div>

      {/* Tabel Sirkulasi Peminjaman */}
      <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
              <tr>
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
                    colSpan={7}
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
                filteredRecords.map((rec) => {
                  const isOverdue =
                    new Date(rec.dueDate) < now && rec.status === "DIPINJAM";

                  return (
                    <tr
                      key={rec.id}
                      className="transition-colors hover:bg-muted/30"
                    >
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
                        {rec.status === "DIPINJAM" ? (
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
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Selesai
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
