import { z } from "zod";
import { Condition, ItemStatus } from "@prisma/client";

export const itemSchema = z.object({
  code: z
    .string()
    .min(2, "Kode inventaris minimal 2 karakter")
    .max(50, "Kode inventaris maksimal 50 karakter")
    .regex(
      /^[A-Za-z0-9\-_]+$/,
      "Kode inventaris hanya boleh berisi huruf, angka, dan tanda hubung (-)"
    )
    .trim()
    .toUpperCase(),
  name: z
    .string()
    .min(2, "Nama barang minimal 2 karakter")
    .max(150, "Nama barang maksimal 150 karakter")
    .trim(),
  category: z
    .string()
    .min(2, "Kategori aset minimal 2 karakter")
    .max(50, "Kategori aset maksimal 50 karakter")
    .trim(),
  totalQuantity: z.coerce
    .number()
    .int("Jumlah total unit harus berupa bilangan bulat")
    .min(1, "Jumlah total unit minimal 1 unit")
    .max(100000, "Jumlah total unit melebihi batas wajar"),
  location: z
    .string()
    .min(2, "Lokasi penyimpanan minimal 2 karakter")
    .max(100, "Lokasi penyimpanan maksimal 100 karakter")
    .trim(),
  condition: z.nativeEnum(Condition, {
    message: "Kondisi fisik barang wajib dipilih (BAIK, RUSAK_RINGAN, RUSAK_BERAT)",
  }),
  status: z.nativeEnum(ItemStatus).optional(),
});

export const createItemSchema = itemSchema;

export const updateItemSchema = itemSchema.extend({
  id: z.string().uuid("ID barang tidak valid"),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
