"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import Image from "next/image";
import { Item } from "@prisma/client";
import { createItemAction, updateItemAction } from "@/actions/item-actions";
import { useToast } from "@/components/ui/toast";
import { X, Loader2, AlertCircle, ImagePlus } from "lucide-react";

interface ItemModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: Item | null;
  onSuccess: () => void;
}

interface ItemFormProps {
  initialData?: Item | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ItemForm({ initialData, onClose, onSuccess }: ItemFormProps) {
  const isEdit = Boolean(initialData);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<
    { id: string; order: number; url: string }[]
  >([]);
  const [hasChangedImages, setHasChangedImages] = useState(false);

  useEffect(() => {
    if (!initialData) return;
    let isMounted = true;
    fetch(`/api/items/${initialData.id}/image?info=true`)
      .then((res) => (res.ok ? res.json() : { images: [] }))
      .then((data: { images: { id: string; order: number; url: string }[] }) => {
        if (isMounted && data.images) setExistingImages(data.images);
      })
      .catch(() => {
        if (isMounted) setExistingImages([]);
      });

    return () => {
      isMounted = false;
    };
  }, [initialData]);

  const previewUrls = useMemo(() => {
    return imageFiles.map((file) => URL.createObjectURL(file));
  }, [imageFiles]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const uploadImages = async (itemId: string) => {
    if (!hasChangedImages && imageFiles.length === 0) return;

    if (imageFiles.length === 0 && existingImages.length === 0 && hasChangedImages) {
      await fetch(`/api/items/${itemId}/image`, { method: "DELETE" });
      return;
    }

    if (imageFiles.length > 0) {
      const uploadData = new FormData();
      for (const file of imageFiles) {
        uploadData.append("images", file);
      }
      const response = await fetch(`/api/items/${itemId}/image`, {
        method: "POST",
        body: uploadData,
      });
      const result = response.headers
        .get("content-type")
        ?.includes("application/json")
        ? ((await response.json()) as { message?: string })
        : {};

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengunggah foto barang.");
      }
    }
  };

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    category: string;
    goodQuantity: number;
    lightDamageQuantity: number;
    heavyDamageQuantity: number;
    location: string;
  }>({
    code: initialData?.code || "",
    name: initialData?.name || "",
    category: initialData?.category || "",
    goodQuantity: initialData?.goodQuantity ?? initialData?.totalQuantity ?? 1,
    lightDamageQuantity: initialData?.lightDamageQuantity ?? 0,
    heavyDamageQuantity: initialData?.heavyDamageQuantity ?? 0,
    location: initialData?.location || "",
  });

  const totalCalculated =
    Number(formData.goodQuantity || 0) +
    Number(formData.lightDamageQuantity || 0) +
    Number(formData.heavyDamageQuantity || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setFieldErrors({});

    startTransition(async () => {
      if (isEdit && initialData) {
        const res = await updateItemAction({
          id: initialData.id,
          code: formData.code,
          name: formData.name,
          category: formData.category,
          goodQuantity: Number(formData.goodQuantity),
          lightDamageQuantity: Number(formData.lightDamageQuantity),
          heavyDamageQuantity: Number(formData.heavyDamageQuantity),
          location: formData.location,
        });

        if (!res.success) {
          const msg = res.message || "Gagal memperbarui data barang.";
          setErrorMessage(msg);
          if (res.errors) setFieldErrors(res.errors);
          toast.error("Gagal Memperbarui Aset", msg);
        } else {
          if (hasChangedImages || imageFiles.length > 0) {
            try {
              await uploadImages(initialData.id);
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Gagal mengunggah foto barang.";
              toast.error("Data tersimpan, foto gagal diunggah", message);
              onSuccess();
              onClose();
              return;
            }
          }
          toast.success(
            "Data Barang Diperbarui",
            imageFiles.length > 0 || hasChangedImages
              ? "Data dan foto barang berhasil diperbarui."
              : res.message
          );
          onSuccess();
          onClose();
        }
      } else {
        const res = await createItemAction({
          code: formData.code,
          name: formData.name,
          category: formData.category,
          goodQuantity: Number(formData.goodQuantity),
          lightDamageQuantity: Number(formData.lightDamageQuantity),
          heavyDamageQuantity: Number(formData.heavyDamageQuantity),
          location: formData.location,
        });

        if (!res.success) {
          const msg = res.message || "Gagal menambahkan barang baru.";
          setErrorMessage(msg);
          if (res.errors) setFieldErrors(res.errors);
          toast.error("Gagal Menyimpan Aset", msg);
        } else {
          if (imageFiles.length > 0 && res.data) {
            try {
              await uploadImages(res.data.id);
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Gagal mengunggah foto barang.";
              toast.error("Barang tersimpan, foto gagal diunggah", message);
              onSuccess();
              onClose();
              return;
            }
          }
          toast.success(
            "Aset Berhasil Didaftarkan",
            imageFiles.length > 0
              ? `${imageFiles.length} foto barang berhasil dilampirkan.`
              : res.message
          );
          onSuccess();
          onClose();
        }
      }
    });
  };

  return (
    <div className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 id="item-modal-title" className="text-xl font-semibold tracking-tight text-foreground">
            {isEdit ? "Edit Master Barang" : "Tambah Master Barang"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {isEdit
              ? "Perbarui informasi inventaris fisik unit BPTI"
              : "Daftarkan aset inventaris baru ke katalog BPTI"}
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
      <form
        onSubmit={handleSubmit}
        className="mt-4 min-h-0 flex-1 space-y-3.5 overflow-y-auto overscroll-contain pr-2"
      >
        <div className="space-y-2 rounded-lg border border-border bg-muted/10 p-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="itemImage"
              className="block text-xs font-semibold text-foreground"
            >
              Foto Barang (Maksimal 3 Foto: JPG, PNG, atau WebP; maks. 5 MB/foto)
            </label>
            <span className="text-[11px] font-medium text-muted-foreground">
              {imageFiles.length > 0
                ? `${imageFiles.length} / 3 foto dipilih`
                : existingImages.length > 0
                ? `${existingImages.length} / 3 foto tersimpan`
                : "0 / 3 foto"}
            </span>
          </div>

          <input
            id="itemImage"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={isPending || imageFiles.length >= 3}
            onChange={(event) => {
              const selected = Array.from(event.target.files || []);
              if (selected.length === 0) return;

              for (const file of selected) {
                if (file.size > 5 * 1024 * 1024) {
                  setErrorMessage(`Ukuran berkas "${file.name}" melebihi batas maksimal 5 MB.`);
                  event.target.value = "";
                  return;
                }
              }

              const combined = [...imageFiles, ...selected].slice(0, 3);
              if (imageFiles.length + selected.length > 3) {
                toast.info(
                  "Batas Foto",
                  "Maksimal 3 foto per barang. Hanya 3 foto pertama yang akan disimpan."
                );
              }

              setErrorMessage(null);
              setImageFiles(combined);
              setHasChangedImages(true);
              event.target.value = "";
            }}
            className="block w-full text-xs text-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-foreground hover:file:bg-muted disabled:opacity-50"
          />

          {/* Grid Preview Foto Baru yang Dipilih */}
          {previewUrls.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                Pratinjau foto yang akan diunggah:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {previewUrls.map((url, idx) => (
                  <div
                    key={url}
                    className="group relative h-28 overflow-hidden rounded-md border border-border bg-card shadow-xs"
                  >
                    <Image
                      src={url}
                      alt={`Pratinjau ${idx + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-80" />
                    <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      Foto {idx + 1} {idx === 0 && "(Utama)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setImageFiles((prev) => prev.filter((_, i) => i !== idx));
                        setHasChangedImages(true);
                      }}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow-xs transition hover:scale-110"
                      title="Hapus foto ini"
                      aria-label={`Hapus foto ${idx + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 right-1 truncate text-[10px] text-white/90">
                      {imageFiles[idx]?.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : isEdit && existingImages.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                Foto barang yang saat ini tersimpan:
              </p>
              <div className="grid grid-cols-3 gap-2">
                {existingImages.map((img, idx) => (
                  <div
                    key={img.id || idx}
                    className="group relative h-28 overflow-hidden rounded-md border border-border bg-card shadow-xs"
                  >
                    <Image
                      src={img.url}
                      alt={`Foto tersimpan ${idx + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-70" />
                    <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      Foto {idx + 1} {idx === 0 && "(Utama)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setExistingImages((prev) => prev.filter((_, i) => i !== idx));
                        setHasChangedImages(true);
                      }}
                      className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white shadow-xs transition hover:scale-110"
                      title="Hapus foto ini"
                      aria-label={`Hapus foto ${idx + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <ImagePlus className="h-3.5 w-3.5" />
              Pilih hingga 3 file gambar untuk melampirkan foto aset fisik.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Kode Barang */}
          <div className="ml-0.5 space-y-1.5">
            <label
              htmlFor="code"
              className="block text-xs font-medium text-foreground"
            >
              Kode Barang *
            </label>
            <input
              id="code"
              type="text"
              required
              disabled={isPending}
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              placeholder="Contoh: INV-001"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm uppercase text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            {fieldErrors.code && (
              <p className="text-xs text-destructive">
                {fieldErrors.code[0]}
              </p>
            )}
          </div>

          {/* Kategori */}
          <div className="space-y-1.5">
            <label
              htmlFor="category"
              className="block text-xs font-medium text-foreground"
            >
              Kategori *
            </label>
            <input
              id="category"
              type="text"
              required
              disabled={isPending}
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder="Elektronik, Multimedia, dll."
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            {fieldErrors.category && (
              <p className="text-xs text-destructive">
                {fieldErrors.category[0]}
              </p>
            )}
          </div>
        </div>

        {/* Nama Barang */}
        <div className="ml-0.5 space-y-1.5">
          <label
            htmlFor="name"
            className="block text-xs font-medium text-foreground"
          >
            Nama Barang *
          </label>
          <input
            id="name"
            type="text"
            required
            disabled={isPending}
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="Contoh: Laptop Lenovo ThinkPad L14"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          {fieldErrors.name && (
            <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
          )}
        </div>

        {/* Rincian Kuantitas Kondisi Fisik */}
        <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Rincian Kuantitas Kondisi Fisik *
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Total Fisik: <strong className="text-foreground">{totalCalculated} unit</strong>
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Unit Baik */}
            <div className="space-y-1">
              <label htmlFor="goodQuantity" className="block text-[11px] font-medium text-foreground">
                Kondisi Baik *
              </label>
              <input
                id="goodQuantity"
                type="number"
                min={0}
                required
                disabled={isPending}
                value={formData.goodQuantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    goodQuantity: Math.max(0, Number(e.target.value)),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              {fieldErrors.goodQuantity && (
                <p className="text-[11px] text-destructive">{fieldErrors.goodQuantity[0]}</p>
              )}
            </div>

            {/* Unit Rusak Ringan */}
            <div className="space-y-1">
              <label htmlFor="lightDamageQuantity" className="block text-[11px] font-medium text-foreground">
                Rusak Ringan
              </label>
              <input
                id="lightDamageQuantity"
                type="number"
                min={0}
                required
                disabled={isPending}
                value={formData.lightDamageQuantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lightDamageQuantity: Math.max(0, Number(e.target.value)),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              {fieldErrors.lightDamageQuantity && (
                <p className="text-[11px] text-destructive">{fieldErrors.lightDamageQuantity[0]}</p>
              )}
            </div>

            {/* Unit Rusak Berat */}
            <div className="space-y-1">
              <label htmlFor="heavyDamageQuantity" className="block text-[11px] font-medium text-foreground">
                Rusak Berat
              </label>
              <input
                id="heavyDamageQuantity"
                type="number"
                min={0}
                required
                disabled={isPending}
                value={formData.heavyDamageQuantity}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    heavyDamageQuantity: Math.max(0, Number(e.target.value)),
                  })
                }
                className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              {fieldErrors.heavyDamageQuantity && (
                <p className="text-[11px] text-destructive">{fieldErrors.heavyDamageQuantity[0]}</p>
              )}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            * Unit kondisi Baik & Rusak Ringan otomatis masuk ke kuota siap pakai untuk dipinjam.
          </p>
        </div>

        {/* Lokasi Gudang / Rak */}
        <div className="ml-0.5 space-y-1.5">
          <label
            htmlFor="location"
            className="block text-xs font-medium text-foreground"
          >
            Lokasi Penyimpanan (Gudang/Rak/Ruang) *
          </label>
          <input
            id="location"
            type="text"
            required
            disabled={isPending}
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            placeholder="Contoh: Lemari Aset 1 / Ruang Server"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          {fieldErrors.location && (
            <p className="text-xs text-destructive">
              {fieldErrors.location[0]}
            </p>
          )}
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
            <span>{isEdit ? "Simpan Perubahan" : "Tambah Barang"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export function ItemModal({
  open,
  onClose,
  initialData,
  onSuccess,
}: ItemModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity"
        onClick={onClose}
      />

      {/* Form ter-reset otomatis via key ketika initialData berganti */}
      <ItemForm
        key={initialData?.id || "create-new"}
        initialData={initialData}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
}
