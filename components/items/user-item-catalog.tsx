"use client";

import { useState, useTransition } from "react";
import { Item } from "@prisma/client";
import { requestBorrow } from "@/actions/borrow-actions";
import { useToast } from "@/components/ui/toast";
import { Package, X, Phone } from "lucide-react";

export function UserItemCatalog({ items }: { items: Item[] }) {
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [borrowDate, setBorrowDate] = useState(getLocalDate());
  const [dueDate, setDueDate] = useState(getDefaultDueDate());
  const [borrowerPhone, setBorrowerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
    <>
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-2 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const canBorrow =
            item.status === "AKTIF" && item.availableQuantity > 0;
          return (
            <article
              key={item.id}
              className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-xs"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Package className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {item.category}
                </span>
              </div>
              <h2 className="font-semibold text-foreground">{item.name}</h2>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {item.code}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Stok tersedia</dt>
                  <dd
                    className={`mt-1 font-semibold ${
                      item.availableQuantity > 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-destructive"
                    }`}
                  >
                    {item.availableQuantity} unit
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Lokasi</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {item.location}
                  </dd>
                </div>
              </dl>
              <button
                type="button"
                disabled={!canBorrow}
                onClick={() => {
                  setSelectedItem(item);
                  setQuantity(1);
                }}
                className="mt-5 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
              >
                {canBorrow
                  ? "Ajukan Peminjaman"
                  : "Stok Sedang Kosong/Dipinjam"}
              </button>
            </article>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Belum ada barang aktif di katalog.
        </div>
      )}

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
                <h2 id="request-borrow-title" className="font-semibold">
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
              <span className="font-medium">Jumlah</span>
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
                <span className="font-medium">Tanggal pinjam</span>
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
                <span className="font-medium">Tanggal kembali</span>
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
              <span className="font-medium">Catatan keperluan</span>
              <textarea
                rows={3}
                maxLength={500}
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
              Stok baru berkurang setelah Admin menyetujui dan barang diambil.
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
    </>
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
