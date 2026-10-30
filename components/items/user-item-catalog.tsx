"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import { Item } from "@prisma/client";
import { requestBorrow } from "@/actions/borrow-actions";
import { useToast } from "@/components/ui/toast";
import { ItemImageModal } from "./item-image-modal";
import {
  Package,
  X,
  Phone,
  Search,
  Eye,
  ImageIcon,
  Loader2,
  Calendar,
  Layers,
  MapPin,
  CheckCircle2,
} from "lucide-react";

interface UserItemCatalogProps {
  items: Item[];
}

function ItemCardThumbnail({
  item,
  onOpenImage,
}: {
  item: Item;
  onOpenImage: () => void;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div
      onClick={onOpenImage}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenImage();
        }
      }}
      title={`Klik untuk melihat foto penuh ${item.name}`}
      className="group relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted/40 cursor-pointer border-b border-border/60"
    >
      {!hasError ? (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
            </div>
          )}
          <Image
            src={`/api/items/${item.id}/image?index=0`}
            alt={`Foto ${item.name}`}
            fill
            unoptimized
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
          {isLoaded && (
            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/25 flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white flex items-center gap-1.5 shadow-md backdrop-blur-xs">
                <Eye className="h-3.5 w-3.5" />
                <span>Lihat Foto Penuh</span>
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground/60 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Package className="h-5 w-5 stroke-[1.5]" />
          </div>
          <span className="text-[11px] font-medium">Belum ada foto</span>
        </div>
      )}
    </div>
  );
}

export function UserItemCatalog({ items }: UserItemCatalogProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [imageItem, setImageItem] = useState<Item | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [borrowDate, setBorrowDate] = useState(getLocalDate());
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [borrowerPhone, setBorrowerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Kategori unik dari barang aktif
  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return Array.from(set).sort();
  }, [items]);

  // Filter pencarian dan kategori
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        search === "" ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.code.toLowerCase().includes(search.toLowerCase()) ||
        item.location.toLowerCase().includes(search.toLowerCase());

      const matchCategory =
        selectedCategory === "ALL" || item.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [items, search, selectedCategory]);

  function closeDialog() {
    if (isPending) return;
    setSelectedItem(null);
    setQuantity(1);
    setNotes("");
    setError(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItem) return;
    setError(null);
    startTransition(async () => {
      const result = await requestBorrow({
        itemId: selectedItem.id,
        borrowQuantity: quantity,
        borrowDate: new Date(`${borrowDate}T00:00:00.000Z`),
        dueDate: new Date(`${dueDate}T00:00:00.000Z`),
        borrowerPhone,
        notes,
      });
      if (!result.success) {
        setError(result.message ?? "Gagal mengirim pengajuan peminjaman.");
        return;
      }
      toast.success("Pengajuan terkirim", result.message);
      closeDialog();
    });
  }

  return (
    <div className="flex h-full flex-1 flex-col min-h-0 overflow-hidden space-y-4">
      {/* Bilah Kontrol & Filter Pengguna - Tetap Statis & Diam */}
      <div className="shrink-0 flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between shadow-2xs">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, kode, atau lokasi barang..."
              className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              aria-label="Filter Kategori Barang"
            >
              <option value="ALL">Semua Kategori ({items.length})</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Menampilkan <span className="font-semibold text-foreground">{filteredItems.length}</span> barang aktif
        </div>
      </div>

      {/* Grid Kartu Katalog Barang - Area Scroll Mandiri */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-2">
        {filteredItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/60" />
            <p className="font-medium text-foreground">Tidak ada barang yang cocok</p>
            <p className="text-xs mt-1">Coba gunakan kata kunci lain atau pilih Semua Kategori.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const canBorrow =
                item.status === "AKTIF" && item.availableQuantity > 0;

              return (
                <article
                  key={item.id}
                  className="flex flex-col rounded-lg border border-border bg-card shadow-xs transition-shadow hover:shadow-md overflow-hidden"
                >
                  {/* Foto Barang Nyata (Sama seperti yang ada di Admin) */}
                  <ItemCardThumbnail
                    item={item}
                    onOpenImage={() => setImageItem(item)}
                  />

                  {/* Konten Keterangan Barang */}
                  <div className="flex flex-1 flex-col p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {item.category}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {item.code}
                      </span>
                    </div>

                    <h2 className="font-semibold text-base text-foreground leading-snug line-clamp-1" title={item.name}>
                      {item.name}
                    </h2>

                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs border-y border-border/50 py-2.5">
                      <div>
                        <dt className="text-muted-foreground">Stok Siap Pakai</dt>
                        <dd
                          className={`mt-0.5 font-bold tabular-nums text-sm ${
                            canBorrow
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-destructive"
                          }`}
                        >
                          {item.availableQuantity} unit
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Lokasi Simpan
                        </dt>
                        <dd className="mt-0.5 font-medium text-foreground truncate" title={item.location}>
                          {item.location}
                        </dd>
                      </div>
                    </dl>

                    {/* Tombol Aksi: Lihat Foto & Ajukan Peminjaman */}
                    <div className="mt-4 flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setImageItem(item)}
                        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-muted focus:outline-hidden"
                        title="Buka galeri foto barang penuh"
                      >
                        <ImageIcon className="h-3.5 w-3.5 text-primary" />
                        <span>Foto</span>
                      </button>

                      <button
                        type="button"
                        disabled={!canBorrow}
                        onClick={() => {
                          setSelectedItem(item);
                          setQuantity(1);
                        }}
                        className="inline-flex flex-1 h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>
                          {canBorrow
                            ? "Ajukan Peminjaman"
                            : "Stok Sedang Kosong"}
                        </span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Galeri Foto Barang Lengkap (Persis seperti yang ada di Admin) */}
      <ItemImageModal
        item={imageItem}
        onClose={() => setImageItem(null)}
      />

      {/* Modal Formulir Pengajuan Peminjaman */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-borrow-title"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
        >
          <button
            type="button"
            aria-label="Tutup pengajuan"
            className="fixed inset-0 cursor-default bg-black/60"
            onClick={closeDialog}
          />
          <form
            onSubmit={handleSubmit}
            className="relative z-10 my-auto max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border border-border bg-card p-5 text-card-foreground shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="request-borrow-title" className="font-semibold text-base">
                  Ajukan Peminjaman
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedItem.name} · Tersedia {selectedItem.availableQuantity} unit
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                disabled={isPending}
                onClick={closeDialog}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Jumlah Unit Dipinjam</span>
              <input
                type="number"
                min={1}
                max={selectedItem.availableQuantity}
                required
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Tanggal Pinjam
                </span>
                <input
                  type="date"
                  required
                  value={borrowDate}
                  onChange={(event) => setBorrowDate(event.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Batas Pengembalian
                </span>
                <input
                  type="date"
                  required
                  min={borrowDate}
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </label>
            </div>

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-primary" />
                Nomor Telepon / WhatsApp Aktif
              </span>
              <input
                type="tel"
                required
                placeholder="Contoh: 081234567890"
                value={borrowerPhone}
                onChange={(event) => setBorrowerPhone(event.target.value)}
                disabled={isPending}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </label>

            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">Catatan Keperluan</span>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Tuliskan keperluan penggunaan aset..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={isPending}
                className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </label>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Stok baru berkurang setelah Admin menyetujui dan barang diambil di kantor BPTI.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={closeDialog}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={
                  isPending ||
                  quantity < 1 ||
                  quantity > selectedItem.availableQuantity
                }
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending ? "Mengirim..." : "Kirim Pengajuan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function getLocalDate() {
  const date = new Date();
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getDefaultDueDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}
