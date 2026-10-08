"use client";

import { useState, useTransition } from "react";
import { Condition, Item } from "@prisma/client";
import { createItemAction, updateItemAction } from "@/actions/item-actions";
import { useToast } from "@/components/ui/toast";
import { X, Loader2, AlertCircle } from "lucide-react";

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

  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    category: string;
    totalQuantity: number;
    location: string;
    condition: Condition;
  }>({
    code: initialData?.code || "",
    name: initialData?.name || "",
    category: initialData?.category || "",
    totalQuantity: initialData?.totalQuantity || 1,
    location: initialData?.location || "",
    condition: initialData?.condition || Condition.BAIK,
  });

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
          totalQuantity: Number(formData.totalQuantity),
          location: formData.location,
          condition: formData.condition,
        });

        if (!res.success) {
          const msg = res.message || "Gagal memperbarui data barang.";
          setErrorMessage(msg);
          if (res.errors) setFieldErrors(res.errors);
          toast.error("Gagal Memperbarui Aset", msg);
        } else {
          toast.success("Data Barang Diperbarui", res.message);
          onSuccess();
          onClose();
        }
      } else {
        const res = await createItemAction({
          code: formData.code,
          name: formData.name,
          category: formData.category,
          totalQuantity: Number(formData.totalQuantity),
          location: formData.location,
          condition: formData.condition,
        });

        if (!res.success) {
          const msg = res.message || "Gagal menambahkan barang baru.";
          setErrorMessage(msg);
          if (res.errors) setFieldErrors(res.errors);
          toast.error("Gagal Menyimpan Aset", msg);
        } else {
          toast.success("Aset Berhasil Didaftarkan", res.message);
          onSuccess();
          onClose();
        }
      }
    });
  };

  return (
    <div className="relative z-10 w-full max-w-lg rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
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
      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Kode Barang */}
          <div className="space-y-1.5">
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
        <div className="space-y-1.5">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Total Unit */}
          <div className="space-y-1.5">
            <label
              htmlFor="totalQuantity"
              className="block text-xs font-medium text-foreground"
            >
              Total Unit Fisik *
            </label>
            <input
              id="totalQuantity"
              type="number"
              min={1}
              required
              disabled={isPending}
              value={formData.totalQuantity}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  totalQuantity: Math.max(1, Number(e.target.value)),
                })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            {fieldErrors.totalQuantity && (
              <p className="text-xs text-destructive">
                {fieldErrors.totalQuantity[0]}
              </p>
            )}
          </div>

          {/* Kondisi Fisik */}
          <div className="space-y-1.5">
            <label
              htmlFor="condition"
              className="block text-xs font-medium text-foreground"
            >
              Kondisi Fisik *
            </label>
            <select
              id="condition"
              disabled={isPending}
              value={formData.condition}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  condition: e.target.value as Condition,
                })
              }
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value={Condition.BAIK}>BAIK (Siap Pakai)</option>
              <option value={Condition.RUSAK_RINGAN}>RUSAK RINGAN</option>
              <option value={Condition.RUSAK_BERAT}>RUSAK BERAT</option>
            </select>
          </div>
        </div>

        {/* Lokasi Gudang / Rak */}
        <div className="space-y-1.5">
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
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
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
