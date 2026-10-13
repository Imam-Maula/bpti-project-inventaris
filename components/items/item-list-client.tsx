"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Item, Condition, ItemStatus } from "@prisma/client";
import {
  deleteItemAction,
  archiveItemAction,
  unarchiveItemAction,
} from "@/actions/item-actions";
import { ItemModal } from "./item-modal";
import { ItemDetailModal } from "./item-detail-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LiveSearch } from "@/components/tables/live-search";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  AlertCircle,
  CheckCircle2,
  Eye,
  Archive,
  RotateCcw,
} from "lucide-react";

interface ItemListClientProps {
  initialItems: Item[];
}

export function ItemListClient({ initialItems }: ItemListClientProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedCondition, setSelectedCondition] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [detailItemId, setDetailItemId] = useState<string | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: "destructive" | "default";
    action: () => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    confirmText: "",
    variant: "destructive",
    action: async () => {},
  });

  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Daftar kategori unik dari data yang ada
  const categories = useMemo(() => {
    const set = new Set(initialItems.map((i) => i.category));
    return Array.from(set).sort();
  }, [initialItems]);

  // Filter items di sisi client untuk responsivitas instan
  const filteredItems = useMemo(() => {
    return initialItems.filter((item) => {
      const matchSearch =
        search === "" ||
        item.code.toLowerCase().includes(search.toLowerCase()) ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.location.toLowerCase().includes(search.toLowerCase());

      const matchCategory =
        selectedCategory === "ALL" || item.category === selectedCategory;

      const matchCondition =
        selectedCondition === "ALL" || item.condition === selectedCondition;

      const matchStatus =
        selectedStatus === "ALL" || item.status === selectedStatus;

      return matchSearch && matchCategory && matchCondition && matchStatus;
    });
  }, [initialItems, search, selectedCategory, selectedCondition, selectedStatus]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const handlePromptDelete = (item: Item) => {
    if (item.availableQuantity < item.totalQuantity) {
      const msg = `Tidak dapat menghapus "${item.name}" karena ada unit yang sedang aktif dipinjam.`;
      setNotice({
        type: "error",
        message: msg,
      });
      toast.error("Penghapusan Ditolak", msg);
      return;
    }

    setConfirmDialog({
      open: true,
      title: "Hapus Master Barang",
      description: `Apakah Anda yakin ingin menghapus "${item.name}" (${item.code})? Jika aset memiliki riwayat sirkulasi masa lalu, sistem akan mengalihkannya ke status DIARSIPKAN secara otomatis untuk menjaga integritas data audit.`,
      confirmText: "Hapus Barang",
      variant: "destructive",
      action: async () => {
        startTransition(async () => {
          const res = await deleteItemAction(item.id);
          setConfirmDialog((prev) => ({ ...prev, open: false }));

          if (res.success) {
            router.refresh();
            setNotice({
              type: "success",
              message: res.message || "Barang berhasil diproses.",
            });
            toast.success("Operasi Berhasil", res.message);
          } else {
            const msg = res.message || "Gagal memproses penghapusan.";
            setNotice({
              type: "error",
              message: msg,
            });
            toast.error("Gagal Menghapus Barang", msg);
          }
        });
      },
    });
  };

  const handlePromptArchive = (item: Item) => {
    if (item.availableQuantity < item.totalQuantity) {
      const msg = `Tidak dapat mengarsipkan "${item.name}" karena ada unit yang sedang aktif dipinjam.`;
      setNotice({
        type: "error",
        message: msg,
      });
      toast.error("Pengarsipan Ditolak", msg);
      return;
    }

    setConfirmDialog({
      open: true,
      title: "Arsipkan Master Barang",
      description: `Pindahkan "${item.name}" (${item.code}) ke daftar arsip? Barang yang diarsipkan tidak akan muncul dalam opsi formulir peminjaman baru, namun riwayat masa lalunya tetap tersimpan utuh.`,
      confirmText: "Arsipkan Barang",
      variant: "default",
      action: async () => {
        startTransition(async () => {
          const res = await archiveItemAction(item.id);
          setConfirmDialog((prev) => ({ ...prev, open: false }));

          if (res.success) {
            router.refresh();
            setNotice({
              type: "success",
              message: res.message || "Barang berhasil diarsipkan.",
            });
            toast.success("Barang Diarsipkan", res.message);
          } else {
            const msg = res.message || "Gagal mengarsipkan barang.";
            setNotice({
              type: "error",
              message: msg,
            });
            toast.error("Gagal Mengarsipkan", msg);
          }
        });
      },
    });
  };

  const handlePromptUnarchive = (item: Item) => {
    setConfirmDialog({
      open: true,
      title: "Aktifkan Kembali Barang",
      description: `Apakah Anda ingin mengembalikan "${item.name}" (${item.code}) ke katalog aset aktif? Barang akan dapat dipinjam kembali seperti semula.`,
      confirmText: "Aktifkan Kembali",
      variant: "default",
      action: async () => {
        startTransition(async () => {
          const res = await unarchiveItemAction(item.id);
          setConfirmDialog((prev) => ({ ...prev, open: false }));

          if (res.success) {
            router.refresh();
            setNotice({
              type: "success",
              message: res.message || "Barang berhasil diaktifkan kembali.",
            });
            toast.success("Barang Diaktifkan", res.message);
          } else {
            const msg = res.message || "Gagal mengaktifkan barang.";
            setNotice({
              type: "error",
              message: msg,
            });
            toast.error("Gagal Mengaktifkan", msg);
          }
        });
      },
    });
  };

  const handleSuccessModal = () => {
    // Revalidasi halus tanpa reload browser
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification Banner */}
      {notice && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-md border p-3 text-sm ${
            notice.type === "success"
              ? "border-border bg-muted text-foreground"
              : "border-destructive/25 bg-destructive/5 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-semibold underline hover:opacity-80 focus:outline-hidden"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Bar Kontrol & Filter */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <LiveSearch
            value={search}
            onChange={setSearch}
            placeholder="Cari kode, nama, atau lokasi barang..."
            className="w-full sm:max-w-xs"
          />

          {/* Filter Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            aria-label="Filter Status Arsip"
          >
            <option value="ALL">Semua Status</option>
            <option value={ItemStatus.AKTIF}>Status: Aktif</option>
            <option value={ItemStatus.DIARSIPKAN}>Status: Diarsipkan</option>
          </select>

          {/* Filter Kategori */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            aria-label="Filter Kategori"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Filter Kondisi */}
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            aria-label="Filter Kondisi Fisik"
          >
            <option value="ALL">Semua Kondisi</option>
            <option value={Condition.BAIK}>Kondisi: BAIK</option>
            <option value={Condition.RUSAK_RINGAN}>RUSAK RINGAN</option>
            <option value={Condition.RUSAK_BERAT}>RUSAK BERAT</option>
          </select>
        </div>

        {/* Tombol Tambah Barang */}
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus:outline-hidden focus:ring-1 focus:ring-ring"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Barang</span>
        </button>
      </div>

      {/* Tabel Master Barang */}
      <div className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Kode & Nama Barang
                </th>
                <th scope="col" className="px-4 py-3">
                  Kategori
                </th>
                <th scope="col" className="px-4 py-3">
                  Lokasi Simpan
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Stok Siap / Total
                </th>
                <th scope="col" className="px-4 py-3">
                  Kondisi & Status
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
                    <p className="font-medium">Tidak ada data barang ditemukan</p>
                    <p className="text-xs">
                      {search ||
                      selectedCategory !== "ALL" ||
                      selectedCondition !== "ALL" ||
                      selectedStatus !== "ALL"
                        ? "Coba ubah kata kunci atau bersihkan filter pencarian."
                        : "Belum ada aset terdaftar. Klik 'Tambah Barang' untuk memulai."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isAvailable = item.availableQuantity > 0;
                  const isArchived = item.status === ItemStatus.DIARSIPKAN;

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors hover:bg-muted/30 ${
                        isArchived ? "opacity-75 bg-muted/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {item.name}
                        </div>
                        {/* deslop-ignore-next-line 34 */}
                        <div className="text-xs font-mono text-muted-foreground">
                          {item.code}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {item.location}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block tabular-nums text-xs font-semibold ${
                            isAvailable
                              ? "text-foreground"
                              : "text-destructive"
                          }`}
                        >
                          {item.availableQuantity} / {item.totalQuantity} unit
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.condition === Condition.BAIK && (
                            <span className="inline-block rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                              Baik
                            </span>
                          )}
                          {item.condition === Condition.RUSAK_RINGAN && (
                            <span className="inline-block rounded border border-border bg-muted/80 px-2 py-0.5 text-[11px] font-medium text-foreground">
                              Rusak Ringan
                            </span>
                          )}
                          {item.condition === Condition.RUSAK_BERAT && (
                            <span className="inline-block rounded border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                              Rusak Berat
                            </span>
                          )}
                          {isArchived && (
                            <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                              <Archive className="h-2.5 w-2.5" />
                              Arsip
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Tombol Detail Modal */}
                          <button
                            type="button"
                            onClick={() => setDetailItemId(item.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-hidden"
                            title="Lihat Detail Riwayat Aset"
                            aria-label={`Lihat detail ${item.name}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {/* Tombol Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-hidden"
                            title="Edit Data Barang"
                            aria-label={`Edit ${item.name}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          {/* Tombol Arsip / Unarchive */}
                          {isArchived ? (
                            <button
                              type="button"
                              onClick={() => handlePromptUnarchive(item)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-primary/10 hover:text-primary focus:outline-hidden"
                              title="Aktifkan Kembali ke Katalog"
                              aria-label={`Aktifkan kembali ${item.name}`}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePromptArchive(item)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-hidden"
                              title="Arsipkan Barang"
                              aria-label={`Arsipkan ${item.name}`}
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Tombol Hapus */}
                          <button
                            type="button"
                            onClick={() => handlePromptDelete(item)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-hidden"
                            title="Hapus Data Barang"
                            aria-label={`Hapus ${item.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit / Tambah */}
      <ItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editingItem}
        onSuccess={handleSuccessModal}
      />

      {/* Modal Detail & Riwayat Aset */}
      <ItemDetailModal
        itemId={detailItemId}
        open={Boolean(detailItemId)}
        onClose={() => setDetailItemId(null)}
        onEdit={(item) => {
          setDetailItemId(null);
          handleOpenEdit(item);
        }}
      />

      {/* Dialog Konfirmasi Operasi */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        isPending={isPending}
        onConfirm={confirmDialog.action}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}
