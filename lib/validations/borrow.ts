import { z } from "zod";
import { Condition } from "@prisma/client";

export const createBorrowSchema = z.object({
  itemId: z.string().uuid("Aset inventaris yang dipilih tidak valid"),
  borrowerName: z
    .string()
    .min(2, "Nama staf peminjam minimal 2 karakter")
    .max(100, "Nama staf peminjam maksimal 100 karakter")
    .trim(),
  borrowerContact: z
    .string()
    .min(8, "Nomor kontak peminjam minimal 8 karakter")
    .max(30, "Nomor kontak peminjam maksimal 30 karakter")
    .regex(
      /^[\d\s+\-()]+$/,
      "Format kontak hanya boleh memuat angka, spasi, dan tanda (+ - ())"
    )
    .trim(),
  borrowQuantity: z.coerce
    .number()
    .int("Jumlah unit pinjam harus berupa bilangan bulat")
    .min(1, "Jumlah unit pinjam minimal 1 unit"),
  dueDate: z.coerce.date({
    message: "Format tanggal batas pengembalian tidak valid",
  }),
  notes: z
    .string()
    .max(500, "Catatan keperluan maksimal 500 karakter")
    .optional()
    .nullable(),
});

export const returnBorrowSchema = z.object({
  borrowRecordId: z.string().uuid("ID transaksi peminjaman tidak valid"),
  returnCondition: z.nativeEnum(Condition, {
    message: "Kondisi fisik unit saat kembali wajib ditentukan",
  }),
  notes: z
    .string()
    .max(500, "Catatan pengembalian maksimal 500 karakter")
    .optional()
    .nullable(),
});

export type CreateBorrowInput = z.infer<typeof createBorrowSchema>;
export type ReturnBorrowInput = z.infer<typeof returnBorrowSchema>;
