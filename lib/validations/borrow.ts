import { z } from "zod";
import { Condition } from "@prisma/client";

export const createBorrowSchema = z.object({
  itemId: z.string().uuid("Item yang dipilih tidak valid"),
  borrowerName: z
    .string()
    .min(2, "Nama peminjam minimal 2 karakter")
    .max(100, "Nama peminjam maksimal 100 karakter")
    .trim(),
  borrowerContact: z
    .string()
    .min(8, "Kontak peminjam minimal 8 digit/karakter")
    .max(30, "Kontak peminjam maksimal 30 karakter")
    .trim(),
  borrowQuantity: z.coerce
    .number()
    .int("Jumlah pinjam harus berupa bilangan bulat")
    .min(1, "Jumlah pinjam minimal 1 unit"),
  dueDate: z.coerce.date({
    message: "Format tanggal batas kembali tidak valid",
  }),
  notes: z.string().max(500, "Catatan maksimal 500 karakter").optional().nullable(),
});

export const returnBorrowSchema = z.object({
  borrowRecordId: z.string().uuid("ID peminjaman tidak valid"),
  returnCondition: z.nativeEnum(Condition, {
    message: "Kondisi saat kembali harus ditentukan",
  }),
  notes: z.string().max(500, "Catatan maksimal 500 karakter").optional().nullable(),
});

export type CreateBorrowInput = z.infer<typeof createBorrowSchema>;
export type ReturnBorrowInput = z.infer<typeof returnBorrowSchema>;
