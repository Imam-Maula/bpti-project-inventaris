"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Item } from "@prisma/client";
import { createBorrowAction } from "@/actions/borrow-actions";
import { useToast } from "@/components/ui/toast";
import { X, Loader2, AlertCircle } from "lucide-react";

interface BorrowModalProps {
  open: boolean;
  onClose: () => void;
  availableItems: Item[];
  onSuccess: () => void;
}

export function BorrowModal({
  open,
  onClose,
  availableItems,
  onSuccess,
}: BorrowModalProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isPending, onClose]);

  // Filter items yang memiliki stok tersedia > 0
  const selectableItems = useMemo(() => {
    return availableItems.filter((i) => i.availableQuantity > 0);
  }, [availableItems]);

  const [formData, setFormData] = useState({
    itemId: selectableItems[0]?.id || "",
    borrowerName: "",
    borrowerContact: "",
    borrowQuantity: 1,
    dueDate: "",
    notes: "",
  });

  const selectedItem = useMemo(() => {
    return selectableItems.find((i) => i.id === formData.itemId);
  }, [selectableItems, formData.itemId]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    if (!formData.itemId) {
      const msg = "Silakan pilih barang yang akan dipinjam.";
      setErrorMessage(msg);
      toast.warning("Pilihan Kosong", msg);
      return;
    }

    if (!selectedItem) {
      const msg = "Barang yang dipilih tidak valid atau stok habis.";
      setErrorMessage(msg);
      toast.error("Stok Tidak Valid", msg);
      return;
    }

    if (formData.borrowQuantity > selectedItem.availableQuantity) {
      const msg = `Jumlah pinjam (${formData.borrowQuantity}) melebihi stok yang tersedia (${selectedItem.availableQuantity} unit).`;
      setErrorMessage(msg);
      toast.error("Kuota Tidak Mencukupi", msg);
      return;
    }

    startTransition(async () => {
      const res = await createBorrowAction({
        itemId: formData.itemId,
        borrowerName: formData.borrowerName,
        borrowerContact: formData.borrowerContact,
        borrowQuantity: Number(formData.borrowQuantity),
        dueDate: new Date(formData.dueDate),
        notes: formData.notes || undefined,
      });

      if (!res.success) {
        const msg = res.message || "Gagal mencatat peminjaman barang.";
        setErrorMessage(msg);
        if (res.errors) setFieldErrors(res.errors);
        toast.error("Gagal Mencatat Peminjaman", msg);
      } else {
        toast.success("Peminjaman Berhasil Dicatat", res.message);
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="borrow-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={() => !isPending && onClose()}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 id="borrow-modal-title" className="text-xl font-semibold tracking-tight text-foreground">
              Catat Peminjaman Barang
            </h2>
            <p className="text-xs text-muted-foreground">
              Formulir transaksi peminjaman aset logistik BPTI (SOP Peminjaman)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2.5 rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="leading-snug">{errorMessage}</div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Pilih Barang */}
          <div className="space-y-1.5">
            <label
              htmlFor="itemSelect"
              className="block text-xs font-medium text-foreground"
            >
              Pilih Barang Inventaris *
            </label>
            <select
              id="itemSelect"
              required
              disabled={isPending}
              value={formData.itemId}
              onChange={(e) =>
                setFormData({ ...formData, itemId: e.target.value })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              {selectableItems.length === 0 ? (
                <option value="">Tidak ada barang dengan stok tersedia</option>
              ) : (
                selectableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    [{item.code}] {item.name} — Siap Pakai:{" "}
                    {item.availableQuantity} unit
                  </option>
                ))
              )}
            </select>
            {selectedItem && (
              <p className="text-xs text-muted-foreground">
                Lokasi: {selectedItem.location} &bull; Sisa unit siap dipinjam:{" "}
                <span className="font-semibold text-foreground">
                  {selectedItem.availableQuantity} unit
                </span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Nama Peminjam */}
            <div className="space-y-1.5">
              <label
                htmlFor="borrowerName"
                className="block text-xs font-medium text-foreground"
              >
                Nama Staf Peminjam *
              </label>
              <input
                id="borrowerName"
                type="text"
                required
                disabled={isPending}
                value={formData.borrowerName}
                onChange={(e) =>
                  setFormData({ ...formData, borrowerName: e.target.value })
                }
                placeholder="Nama lengkap peminjam"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              {fieldErrors.borrowerName && (
                <p className="text-xs text-destructive">
                  {fieldErrors.borrowerName[0]}
                </p>
              )}
            </div>

            {/* Kontak Peminjam */}
            <div className="space-y-1.5">
              <label
                htmlFor="borrowerContact"
                className="block text-xs font-medium text-foreground"
              >
                No. HP / WhatsApp Peminjam *
              </label>
              <input
                id="borrowerContact"
                type="text"
                required
                disabled={isPending}
                value={formData.borrowerContact}
                onChange={(e) =>
                  setFormData({ ...formData, borrowerContact: e.target.value })
                }
                placeholder="Contoh: 081234567890"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              {fieldErrors.borrowerContact && (
                <p className="text-xs text-destructive">
                  {fieldErrors.borrowerContact[0]}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Jumlah Pinjam */}
            <div className="space-y-1.5">
              <label
                htmlFor="borrowQuantity"
                className="block text-xs font-medium text-foreground"
              >
                Jumlah Unit Dipinjam *
              </label>
              <input
                id="borrowQuantity"
                type="number"
                min={1}
                max={selectedItem?.availableQuantity || 1}
                required
                disabled={isPending}
                value={formData.borrowQuantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    borrowQuantity: Math.max(1, Number(e.target.value)),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              {fieldErrors.borrowQuantity && (
                <p className="text-xs text-destructive">
                  {fieldErrors.borrowQuantity[0]}
                </p>
              )}
            </div>

            {/* Tenggat Waktu Pengembalian */}
            <div className="space-y-1.5">
              <label
                htmlFor="dueDate"
                className="block text-xs font-medium text-foreground"
              >
                Tenggat Waktu Kembali *
              </label>
              <input
                id="dueDate"
                type="date"
                required
                disabled={isPending}
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              {fieldErrors.dueDate && (
                <p className="text-xs text-destructive">
                  {fieldErrors.dueDate[0]}
                </p>
              )}
            </div>
          </div>

          {/* Catatan Keperluan */}
          <div className="space-y-1.5">
            <label
              htmlFor="notes"
              className="block text-xs font-medium text-foreground"
            >
              Catatan Keperluan / Kegiatan
            </label>
            <textarea
              id="notes"
              rows={2}
              disabled={isPending}
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Contoh: Digunakan untuk presentasi rapat koordinasi BPTI di Aula Lt. 3"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted focus:outline-hidden"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isPending || selectableItems.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Konfirmasi Peminjaman</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
