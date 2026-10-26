import { z } from "zod";
import { ItemStatus } from "@prisma/client";

const itemFieldsSchema = z.object({
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
  goodQuantity: z.coerce
    .number()
    .int("Jumlah unit baik harus berupa bilangan bulat")
    .min(0, "Jumlah unit baik tidak boleh kurang dari 0")
    .max(100000, "Jumlah unit melebihi batas wajar"),
  lightDamageQuantity: z.coerce
    .number()
    .int("Jumlah unit rusak ringan harus berupa bilangan bulat")
    .min(0, "Jumlah unit rusak ringan tidak boleh kurang dari 0")
    .max(100000, "Jumlah unit melebihi batas wajar"),
  heavyDamageQuantity: z.coerce
    .number()
    .int("Jumlah unit rusak berat harus berupa bilangan bulat")
    .min(0, "Jumlah unit rusak berat tidak boleh kurang dari 0")
    .max(100000, "Jumlah unit melebihi batas wajar"),
  location: z
    .string()
    .min(2, "Lokasi penyimpanan minimal 2 karakter")
    .max(100, "Lokasi penyimpanan maksimal 100 karakter")
    .trim(),
  status: z.nativeEnum(ItemStatus).optional(),
});

function validateQuantities(
  data: z.infer<typeof itemFieldsSchema>,
  ctx: z.RefinementCtx
) {
  const totalQuantity =
    data.goodQuantity + data.lightDamageQuantity + data.heavyDamageQuantity;

  if (totalQuantity < 1) {
    ctx.addIssue({
      code: "custom",
      path: ["goodQuantity"],
      message: "Total unit fisik minimal 1 unit (jumlahkan unit baik, rusak ringan, atau berat)",
    });
  }
  if (totalQuantity > 100000) {
    ctx.addIssue({
      code: "custom",
      path: ["goodQuantity"],
      message: "Jumlah total unit melebihi batas wajar",
    });
  }
}

export const itemSchema = itemFieldsSchema.superRefine(validateQuantities);

export const createItemSchema = itemSchema;

export const updateItemSchema = itemFieldsSchema.extend({
  id: z.string().uuid("ID barang tidak valid"),
}).superRefine(validateQuantities);

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
