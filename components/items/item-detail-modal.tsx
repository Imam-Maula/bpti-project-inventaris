"use client";

import { useEffect, useState, useTransition } from "react";
import { getItemByIdAction } from "@/actions/item-actions";
import { Condition, ItemStatus, Item } from "@prisma/client";
import {
  Package,
  X,
  Loader2,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  Archive,
} from "lucide-react";

type ItemDetailData = NonNullable<Awaited<ReturnType<typeof getItemByIdAction>>>;

interface ItemDetailModalProps {
  itemId: string | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (item: Item) => void;
}

function ItemDetailContent({
  itemId,
  onClose,
  onEdit,
}: {
  itemId: string;
  onClose: () => void;
  onEdit?: (item: Item) => void;
}) {
  const [item, setItem] = useState<ItemDetailData | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isMounted = true;
    startTransition(async () => {
      const data = await getItemByIdAction(itemId);
      if (isMounted) {
        setItem(data);
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [itemId, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-detail-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-lg rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-foreground">
              <Package className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2
                id="item-detail-modal-title"
                className="text-xl font-semibold tracking-tight text-foreground leading-tight"
              >
                Detail Master Aset
              </h2>
              <p className="text-xs text-muted-foreground">
                Spesifikasi aset fisik dan sirkulasi aktif BPTI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-hidden"
            aria-label="Tutup detail aset"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        {isPending || !item ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-xs">
            {/* Informasi Identitas Barang */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {/* deslop-ignore-next-line 34 */}
                <span className="font-mono text-xs font-semibold text-primary">
                  {item.code}
                </span>
                <span className="rounded border border-border bg-muted/60 px-2 py-0.5 text-[11px] text-foreground">
                  {item.category}
                </span>
                {item.status === ItemStatus.DIARSIPKAN && (
                  <span className="flex items-center gap-1 rounded border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    <Archive className="h-3 w-3" />
                    Diarsipkan
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-foreground">{item.name}</h3>
            </div>

            {/* Grid Metrik Stok & Lokasi */}
            {/* deslop-ignore-next-line 28 */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <div className="rounded-md border border-border bg-muted/30 p-2.5">
                <span className="text-[11px] text-muted-foreground">Total Fisik</span>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {item.totalQuantity} <span className="text-xs font-normal">unit</span>
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-2.5">
                <span className="text-[11px] text-muted-foreground">Siap Pakai</span>
                <p className="mt-0.5 text-sm font-semibold text-foreground">
                  {item.availableQuantity} <span className="text-xs font-normal">unit</span>
                </p>
              </div>
              <div className="col-span-2 rounded-md border border-border bg-muted/30 p-2.5 sm:col-span-1">
                <span className="text-[11px] text-muted-foreground">Sedang Dipinjam</span>
                <p className="mt-0.5 text-sm font-semibold text-primary">
                  {Math.max(0, item.totalQuantity - item.availableQuantity)}{" "}
                  <span className="text-xs font-normal">unit</span>
                </p>
              </div>
            </div>

            {/* Lokasi & Kondisi Fisik */}
            <div className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  Lokasi Penyimpanan:
                </span>
                <span className="font-medium text-foreground">{item.location}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Kondisi Fisik:
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                    item.condition === Condition.BAIK
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  {item.condition === Condition.BAIK
                    ? "Baik"
                    : item.condition === Condition.RUSAK_RINGAN
                    ? "Rusak Ringan"
                    : "Rusak Berat (Karantina)"}
                </span>
              </div>
            </div>

            {/* Sirkulasi Aktif Saat Ini */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Transaksi Sirkulasi Aktif ({item.borrowRecords.length})</span>
              </div>
              {item.borrowRecords.length > 0 ? (
                <div className="divide-y divide-border rounded-md border border-border bg-card">
                  {item.borrowRecords.map((rec) => (
                    <div key={rec.id} className="p-3">
                      <div className="flex items-center justify-between">
                        {/* deslop-ignore-next-line 34 */}
                        <span className="font-mono text-[11px] font-semibold text-foreground">
                          {rec.borrowCode}
                        </span>
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {rec.borrowQuantity} unit
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {rec.borrowerName}
                        </span>
                        <span>
                          Tenggat:{" "}
                          {new Date(rec.dueDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border border-border/60 bg-muted/20 p-3 text-center text-muted-foreground">
                  Tidak ada transaksi peminjaman aktif untuk aset ini saat ini.
                </p>
              )}
            </div>

            {/* Footer Aksi */}
            <div className="mt-4 flex justify-end gap-2 border-t border-border pt-3">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(item);
                  }}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                >
                  Edit Aset
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ItemDetailModal({
  itemId,
  open,
  onClose,
  onEdit,
}: ItemDetailModalProps) {
  if (!open || !itemId) return null;

  return (
    <ItemDetailContent
      key={itemId}
      itemId={itemId}
      onClose={onClose}
      onEdit={onEdit}
    />
  );
}
