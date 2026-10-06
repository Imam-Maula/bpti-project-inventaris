import { z } from "zod";
import { Condition } from "@prisma/client";

export const itemSchema = z.object({
  code: z
    .string()
    .min(2, "Kode barang minimal 2 karakter")
    .max(50, "Kode barang maksimal 50 karakter")
    .trim()
    .toUpperCase(),
  name: z
    .string()
    .min(2, "Nama barang minimal 2 karakter")
    .max(150, "Nama barang maksimal 150 karakter")
    .trim(),
  category: z
    .string()
    .min(2, "Kategori minimal 2 karakter")
    .max(50, "Kategori maksimal 50 karakter")
    .trim(),
  totalQuantity: z.coerce
    .number()
    .int("Jumlah total harus berupa bilangan bulat")
    .min(1, "Jumlah total minimal 1 unit"),
  location: z
    .string()
    .min(2, "Lokasi penyimpanan minimal 2 karakter")
    .max(100, "Lokasi penyimpanan maksimal 100 karakter")
    .trim(),
  condition: z.nativeEnum(Condition, {
    message: "Kondisi barang tidak valid",
  }),
});

export const createItemSchema = itemSchema;

export const updateItemSchema = itemSchema.extend({
  id: z.string().uuid("ID barang tidak valid"),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
