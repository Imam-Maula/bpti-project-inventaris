"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Item } from "@prisma/client";
import { ChevronLeft, ChevronRight, ImageOff, Loader2, X } from "lucide-react";

interface ItemImageModalProps {
  item: Item | null;
  onClose: () => void;
}

interface ImageInfo {
  id: string;
  order: number;
  url: string;
  mimeType: string;
}

export function ItemImageModal({ item, onClose }: ItemImageModalProps) {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Fetch daftar gambar dari endpoint info
  useEffect(() => {
    if (!item) return;

    let isMounted = true;

    fetch(`/api/items/${item.id}/image?info=true`)
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat metadata gambar");
        return res.json();
      })
      .then((data: { images: ImageInfo[]; total: number }) => {
        if (!isMounted) return;
        if (data.images && data.images.length > 0) {
          setImages(data.images);
        } else {
          // Fallback jika belum ada metadata multi-gambar, coba url default
          setImages([
            {
              id: "default",
              order: 0,
              url: `/api/items/${item.id}/image?index=0`,
              mimeType: "image/jpeg",
            },
          ]);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setImages([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [item]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setImageError(false);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setImageError(false);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft") {
        handlePrev();
      } else if (event.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose, handlePrev, handleNext]);

  if (!item) return null;

  const currentImage = images[currentIndex];
  const totalImages = images.length;

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
        className="fixed inset-0 cursor-default bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 flex w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-card/95">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2">
              <h2
                id="item-image-modal-title"
                className="truncate text-base font-semibold text-foreground"
              >
                {item.name}
              </h2>
              {totalImages > 1 && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {currentIndex + 1} / {totalImages}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {item.code} · {item.category} · Lokasi: {item.location}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Tombol navigasi di header seperti pada referensi Google Image */}
            {totalImages > 1 && (
              <div className="flex items-center gap-1 mr-2 border-r border-border pr-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Gambar sebelumnya (Panah Kiri)"
                  title="Gambar sebelumnya (←)"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-xs hover:bg-muted focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Gambar berikutnya (Panah Kanan)"
                  title="Gambar berikutnya (→)"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-xs hover:bg-muted focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Viewport Gambar Utama dengan Tombol Navigasi Samping */}
        <div className="relative flex min-h-[360px] max-h-[70vh] items-center justify-center bg-muted/20 p-4">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs">Memuat gambar inventaris...</p>
            </div>
          ) : images.length > 0 && !imageError && currentImage ? (
            <div className="relative flex h-full w-full items-center justify-center">
              {/* Tombol Panah Kiri Melayang */}
              {totalImages > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Gambar sebelumnya"
                  className="absolute left-2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-lg backdrop-blur-xs transition hover:scale-105 hover:bg-background focus:outline-hidden focus:ring-2 focus:ring-primary sm:left-4"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              {/* Tampilan Gambar Aktif */}
              <div className="relative flex max-h-[60vh] w-full items-center justify-center overflow-hidden">
                <Image
                  key={`${item.id}-${currentIndex}`}
                  src={currentImage.url}
                  alt={`Gambar ${item.name} (${currentIndex + 1} dari ${totalImages})`}
                  width={1200}
                  height={900}
                  unoptimized
                  onError={() => setImageError(true)}
                  className="max-h-[60vh] w-auto max-w-full rounded-md object-contain shadow-xs transition-all duration-200"
                  priority
                />
              </div>

              {/* Tombol Panah Kanan Melayang (Sesuai Referensi Foto Pengguna) */}
              {totalImages > 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Gambar berikutnya"
                  className="absolute right-2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background/90 text-foreground shadow-lg backdrop-blur-xs transition hover:scale-105 hover:bg-background focus:outline-hidden focus:ring-2 focus:ring-primary sm:right-4"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
              <ImageOff className="h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">
                Gambar belum tersedia atau gagal dimuat
              </p>
              <p className="max-w-md text-xs">
                Barang ini belum memiliki foto terlampir. Anda dapat mengunggah hingga
                maksimal 3 gambar melalui menu Ubah Data Barang.
              </p>
            </div>
          )}
        </div>

        {/* Footer Thumbnail Strip & Dots Navigasi */}
        {totalImages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-card px-5 py-3">
            {/* Dots Indikator */}
            <div className="flex items-center gap-1.5">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => {
                    setImageError(false);
                    setCurrentIndex(idx);
                  }}
                  aria-label={`Lihat gambar ke-${idx + 1}`}
                  className={`h-2.5 rounded-full transition-all duration-200 ${
                    currentIndex === idx
                      ? "w-7 bg-primary"
                      : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  }`}
                />
              ))}
            </div>

            {/* Thumbnail Preview Strip */}
            <div className="flex items-center gap-2">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => {
                    setImageError(false);
                    setCurrentIndex(idx);
                  }}
                  className={`relative h-12 w-16 overflow-hidden rounded border transition-all ${
                    currentIndex === idx
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={`Thumbnail ${idx + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1 text-[9px] font-mono text-white">
                    {idx + 1}
                  </span>
                </button>
              ))}
            </div>

            <div className="text-xs text-muted-foreground hidden sm:block">
              Navigasi: <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">←</kbd> <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">→</kbd>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
