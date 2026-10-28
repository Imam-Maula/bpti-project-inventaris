"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Item } from "@prisma/client";
import { ImageOff, X } from "lucide-react";

interface ItemImageModalProps {
  item: Item | null;
  onClose: () => void;
}

export function ItemImageModal({ item, onClose }: ItemImageModalProps) {
  const [imageAvailable, setImageAvailable] = useState(true);

  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-image-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Tutup gambar barang"
        className="fixed inset-0 cursor-default bg-black/70 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h2
              id="item-image-modal-title"
              className="text-base font-semibold text-foreground"
            >
              Gambar Barang Inventaris
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.name} · {item.code} · {item.category}
            </p>
            <p className="text-xs text-muted-foreground">
              Lokasi: {item.location}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative flex min-h-64 max-h-[70vh] items-center justify-center bg-muted/20 p-4">
          {imageAvailable ? (
            <Image
              src={`/api/items/${item.id}/image`}
              alt={`Gambar ${item.name} (${item.code})`}
              width={1200}
              height={900}
              unoptimized
              onError={() => setImageAvailable(false)}
              className="max-h-[65vh] w-auto max-w-full rounded object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
              <ImageOff className="h-9 w-9" />
              <p className="text-sm font-medium">
                Gambar belum tersedia atau gagal dimuat
              </p>
              <p className="text-xs">
                Jika gambar seharusnya sudah ada, segarkan halaman atau unggah
                ulang melalui tombol edit data master barang.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
