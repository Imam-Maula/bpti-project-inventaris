"use client";

import { useState, useTransition } from "react";
import { Condition, BorrowStatus } from "@prisma/client";
import { returnBorrowAction } from "@/actions/borrow-actions";
import { X, Loader2, AlertCircle, ArrowDownLeft } from "lucide-react";

export interface BorrowRecordDetail {
  id: string;
  borrowCode: string;
  borrowerName: string;
  borrowerContact: string;
  borrowQuantity: number;
  borrowDate: Date;
  dueDate: Date;
  status: BorrowStatus;
  item: {
    name: string;
    code: string;
    category: string;
    location: string;
  };
}

interface ReturnDialogProps {
  open: boolean;
  onClose: () => void;
  record: BorrowRecordDetail | null;
  onSuccess: () => void;
}

export function ReturnDialog({
  open,
  onClose,
  record,
  onSuccess,
}: ReturnDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [returnCondition, setReturnCondition] = useState<Condition>(
    Condition.BAIK
  );
  const [notes, setNotes] = useState("");

  if (!open || !record) return null;

  const isOverdue =
    new Date() > new Date(record.dueDate) && record.status === "DIPINJAM";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const res = await returnBorrowAction({
        borrowRecordId: record.id,
        returnCondition,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.message || "Gagal memproses pengembalian barang.");
      } else {
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={() => !isPending && onClose()}
      />

      {/* Dialog Card */}
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Selesaikan Pengembalian
              </h2>
              <p className="text-xs text-muted-foreground">
                Konfirmasi penerimaan unit fisik (SOP Pengembalian)
              </p>
            </div>
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

        {/* Summary Info */}
        <div className="mt-4 space-y-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kode Transaksi:</span>
            <span className="font-mono font-semibold text-foreground">
              {record.borrowCode}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Barang Dipinjam:</span>
            <span className="font-medium text-foreground">
              {record.item.name} ({record.borrowQuantity} unit)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nama Peminjam:</span>
            <span className="text-foreground">{record.borrowerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tenggat Kembali:</span>
            <span
              className={
                isOverdue
                  ? "font-semibold text-destructive"
                  : "text-foreground"
              }
            >
              {new Date(record.dueDate).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {isOverdue && " (Terlambat)"}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Kondisi Fisik Pasca Pemakaian */}
          <div className="space-y-1.5">
            <label
              htmlFor="returnCondition"
              className="block text-xs font-medium text-foreground"
            >
              Kondisi Fisik Saat Kembali *
            </label>
            <select
              id="returnCondition"
              disabled={isPending}
              value={returnCondition}
              onChange={(e) =>
                setReturnCondition(e.target.value as Condition)
              }
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value={Condition.BAIK}>BAIK (Lengkap & Normal)</option>
              <option value={Condition.RUSAK_RINGAN}>
                RUSAK RINGAN (Perlu Perbaikan Kecil)
              </option>
              <option value={Condition.RUSAK_BERAT}>
                RUSAK BERAT (Tidak Berfungsi)
              </option>
            </select>
          </div>

          {/* Catatan Pengembalian */}
          <div className="space-y-1.5">
            <label
              htmlFor="returnNotes"
              className="block text-xs font-medium text-foreground"
            >
              Catatan Pengembalian (Opsional)
            </label>
            <textarea
              id="returnNotes"
              rows={2}
              disabled={isPending}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Unit dikembalikan lengkap beserta charger dan tas dalam keadaan bersih."
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
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus:outline-hidden focus:ring-1 focus:ring-ring disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Konfirmasi Pengembalian</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
