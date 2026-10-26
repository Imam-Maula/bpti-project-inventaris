"use server";

import { revalidatePath } from "next/cache";
import { BorrowStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/dal";
import {
  createBorrowSchema,
  returnBorrowSchema,
  CreateBorrowInput,
  ReturnBorrowInput,
} from "@/lib/validations/borrow";
import {
  getBorrowRecordsService,
  getCirculationMetricsService,
  createBorrowTransactionService,
  returnBorrowTransactionService,
} from "@/lib/services/borrow-service";
import { recordAuditLogService } from "@/lib/services/audit-service";

export interface BorrowActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

/**
 * Mengambil daftar seluruh catatan sirkulasi peminjaman.
 * Mendukung filter status operasional termasuk TERLAMBAT/OVERDUE.
 */
export async function getBorrowRecordsAction(params?: {
  status?: BorrowStatus | "OVERDUE";
  search?: string;
}) {
  await requireAuth();
  return getBorrowRecordsService(prisma, params);
}

/**
 * Mengambil ringkasan statistik metrik sirkulasi dan fisik aset untuk Dasbor (FR-UI-01).
 * Mematuhi invarian: Total Fisik = Siap Pakai + Dipinjam + Karantina/Perbaikan.
 */
export async function getCirculationMetricsAction(params?: {
  startDate?: Date;
  endDate?: Date;
}) {
  await requireAuth();
  return getCirculationMetricsService(prisma, params);
}

/**
 * Membuat transaksi peminjaman barang baru secara atomik.
 * Mencegah race-condition penurunan stok dengan updateMany bersyarat (CAS).
 */
export async function createBorrowAction(
  data: CreateBorrowInput
): Promise<BorrowActionResult> {
  const session = await requireAuth();

  const validated = createBorrowSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      message: "Data peminjaman tidak valid.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    const record = await createBorrowTransactionService(
      prisma,
      session.userId,
      validated.data
    );

    await recordAuditLogService(prisma, {
      action: "CATAT_PEMINJAMAN",
      entityType: "BORROW_RECORD",
      entityId: record.id,
      adminId: session.userId,
      details: `Mencatat peminjaman ${record.borrowQuantity} unit aset "${record.item.name}" (${record.item.code}) oleh ${record.borrowerName} (${record.borrowerContact}) dengan kode ${record.borrowCode}.`,
      newValue: {
        id: record.id,
        borrowCode: record.borrowCode,
        itemId: record.itemId,
        itemName: record.item.name,
        borrowerName: record.borrowerName,
        borrowerContact: record.borrowerContact,
        borrowQuantity: record.borrowQuantity,
        borrowDate: record.borrowDate,
        dueDate: record.dueDate,
        status: record.status,
      },
    });

    revalidatePath("/sirkulasi");
    revalidatePath("/barang");
    revalidatePath("/aktivitas");
    revalidatePath("/");

    return {
      success: true,
      message: `Peminjaman "${record.item.name}" berhasil dicatat dengan kode ${record.borrowCode}.`,
      data: record,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan server saat memproses transaksi peminjaman.";

    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Memproses pengembalian barang secara atomik.
 * Mencegah double return dan memulihkan stok atau mencatat ke karantina jika rusak berat.
 */
export async function returnBorrowAction(
  data: ReturnBorrowInput
): Promise<BorrowActionResult> {
  const session = await requireAuth();

  const validated = returnBorrowSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      message: "Data pengembalian tidak valid.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await returnBorrowTransactionService(prisma, validated.data);

    await recordAuditLogService(prisma, {
      action: "PENGEMBALIAN_BARANG",
      entityType: "BORROW_RECORD",
      entityId: result.record.id,
      adminId: session.userId,
      details: `Mencatat pengembalian aset "${result.record.item.name}" (${result.record.borrowCode}) oleh ${result.record.borrowerName}. Kondisi: ${validated.data.returnCondition}.${result.isDamagedHeavy ? " Teridentifikasi rusak berat dan dipindahkan ke karantina/perbaikan." : " Unit dipulihkan ke stok siap pakai."}`,
      newValue: {
        id: result.record.id,
        borrowCode: result.record.borrowCode,
        itemName: result.record.item.name,
        borrowerName: result.record.borrowerName,
        returnDate: result.record.returnDate,
        returnCondition: result.record.returnCondition,
        status: result.record.status,
        isDamagedHeavy: result.isDamagedHeavy,
      },
    });

    revalidatePath("/sirkulasi");
    revalidatePath("/barang");
    revalidatePath("/aktivitas");
    revalidatePath("/");

    const quarantineNote = result.isDamagedHeavy
      ? ` ${result.record.borrowQuantity} unit teridentifikasi RUSAK BERAT dan otomatis dicatat ke kuota karantina/perbaikan aset BPTI.`
      : " Unit berhasil dipulihkan ke stok siap pakai.";

    return {
      success: true,
      message: `Barang "${result.record.item.name}" (${result.record.borrowCode}) telah berhasil dikembalikan.${quarantineNote}`,
      data: result.record,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan server saat memproses pengembalian barang.";

    return {
      success: false,
      message: errorMessage,
    };
  }
}