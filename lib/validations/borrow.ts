import { z } from "zod";
import { Condition } from "@prisma/client";

export const borrowerPhoneSchema = z
  .string()
  .min(8, "Nomor telepon/WhatsApp peminjam minimal 8 karakter")
  .max(20, "Nomor telepon/WhatsApp peminjam maksimal 20 karakter")
  .regex(
    /^[\d\s+\-()]+$/,
    "Format nomor telepon hanya boleh memuat angka, spasi, dan tanda (+ - ())"
  )
  .trim();

export const borrowerEmailSchema = z
  .string()
  .email("Format alamat email peminjam tidak valid")
  .max(100, "Alamat email peminjam maksimal 100 karakter")
  .trim()
  .toLowerCase();

export const createBorrowSchema = z.object({
  itemId: z.string().uuid("Aset inventaris yang dipilih tidak valid"),
  borrowerName: z
    .string()
    .min(2, "Nama staf peminjam minimal 2 karakter")
    .max(100, "Nama staf peminjam maksimal 100 karakter")
    .trim(),
  borrowerPhone: borrowerPhoneSchema,
  borrowerEmail: borrowerEmailSchema,
  borrowerContact: z.string().optional(),
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

export const requestBorrowSchema = z
  .object({
    itemId: z.string().uuid("Aset inventaris yang dipilih tidak valid"),
    borrowQuantity: z.coerce
      .number()
      .int("Jumlah unit pinjam harus berupa bilangan bulat")
      .min(1, "Jumlah unit pinjam minimal 1 unit"),
    borrowDate: z.coerce.date({ message: "Tanggal pinjam tidak valid" }),
    dueDate: z.coerce.date({ message: "Tanggal kembali tidak valid" }),
    borrowerPhone: borrowerPhoneSchema,
    borrowerEmail: borrowerEmailSchema.optional(),
    notes: z.string().max(500, "Catatan keperluan maksimal 500 karakter").optional(),
  })
  .refine((data) => data.dueDate >= data.borrowDate, {
    path: ["dueDate"],
    message: "Tanggal kembali harus sama atau setelah tanggal pinjam",
  });

export const rejectBorrowSchema = z.object({
  rejectionReason: z
    .string()
    .min(3, "Alasan penolakan minimal 3 karakter")
    .max(500, "Alasan penolakan maksimal 500 karakter")
    .trim(),
});

export type RequestBorrowInput = z.infer<typeof requestBorrowSchema>;
