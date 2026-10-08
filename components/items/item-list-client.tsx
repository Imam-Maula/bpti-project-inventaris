"use client";

import { useState, useTransition, useMemo } from "react";
import { Item, Condition } from "@prisma/client";
import { deleteItemAction } from "@/actions/item-actions";
import { ItemModal } from "./item-modal";
import { LiveSearch } from "@/components/tables/live-search";
import { useToast } from "@/components/ui/toast";
import { Plus, Edit2, Trash2, Package, AlertCircle, CheckCircle2 } from "lucide-react";

interface ItemListClientProps {
  initialItems: Item[];
}

export function ItemListClient({ initialItems }: ItemListClientProps) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedCondition, setSelectedCondition] = useState("ALL");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const [deletePendingId, setDeletePendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Daftar kategori unik dari data yang ada
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return Array.from(set).sort();
  }, [items]);

  // Filter items di sisi client untuk responsivitas instan
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        search === "" ||
        item.code.toLowerCase().includes(search.toLowerCase()) ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.location.toLowerCase().includes(search.toLowerCase());

      const matchCategory =
        selectedCategory === "ALL" || item.category === selectedCategory;

      const matchCondition =
        selectedCondition === "ALL" || item.condition === selectedCondition;

      return matchSearch && matchCategory && matchCondition;
    });
  }, [items, search, selectedCategory, selectedCondition]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const { toast } = useToast();

  const handleDelete = (item: Item) => {
    if (item.availableQuantity < item.totalQuantity) {
      const msg = `Tidak dapat menghapus "${item.name}" karena ada unit yang sedang aktif dipinjam.`;
      setNotice({
        type: "error",
        message: msg,
      });
      toast.error("Penghapusan Ditolak", msg);
      return;
    }

    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus master barang "${item.name}" (${item.code})?`
    );
    if (!confirmed) return;

    setDeletePendingId(item.id);
    setNotice(null);

    startTransition(async () => {
      const res = await deleteItemAction(item.id);
      setDeletePendingId(null);
      if (res.success) {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setNotice({
          type: "success",
          message: res.message || "Barang berhasil dihapus.",
        });
        toast.success("Barang Berhasil Dihapus", res.message);
      } else {
        const msg = res.message || "Gagal menghapus barang.";
        setNotice({
          type: "error",
          message: msg,
        });
        toast.error("Gagal Menghapus Barang", msg);
      }
    });
  };

  const handleSuccessModal = () => {
    // Reload halaman otomatis via Server Action revalidatePath
    window.location.reload();
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
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <LiveSearch
            value={search}
            onChange={setSearch}
            placeholder="Cari kode, nama, atau lokasi barang..."
            className="w-full sm:max-w-xs"
          />

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
                  Kondisi
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
                      {search || selectedCategory !== "ALL" || selectedCondition !== "ALL"
                        ? "Coba ubah kata kunci atau bersihkan filter pencarian."
                        : "Belum ada aset terdaftar. Klik 'Tambah Barang' untuk memulai."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isAvailable = item.availableQuantity > 0;
                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-muted/30"
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
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-hidden"
                            title="Edit Data Barang"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={deletePendingId === item.id}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus:outline-hidden disabled:opacity-50"
                            title="Hapus Data Barang"
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

      {/* Modal Dialog */}
      <ItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editingItem}
        onSuccess={handleSuccessModal}
      />
    </div>
  );
}
