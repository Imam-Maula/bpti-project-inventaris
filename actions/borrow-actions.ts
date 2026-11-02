"use server";

import { revalidatePath } from "next/cache";
import { BorrowStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireRole } from "@/lib/dal";
import {
  createBorrowSchema,
  requestBorrowSchema,
  rejectBorrowSchema,
  returnBorrowSchema,
  CreateBorrowInput,
  RequestBorrowInput,
  ReturnBorrowInput,
} from "@/lib/validations/borrow";
import {
  getBorrowRecordsService,
  getCirculationMetricsService,
  createBorrowTransactionService,
  requestBorrowService,
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
  await requireAdmin();
  return getBorrowRecordsService(prisma, params);
}

export async function getUserBorrowRecordsAction() {
  const session = await requireRole(Role.USER);
  return getBorrowRecordsService(prisma, { userId: session.userId });
}

/**
 * Mengambil ringkasan statistik metrik sirkulasi dan fisik aset untuk Dasbor (FR-UI-01).
 * Mematuhi invarian: Total Fisik = Siap Pakai + Dipinjam + Karantina/Perbaikan.
 */
export async function getCirculationMetricsAction(params?: {
  startDate?: Date;
  endDate?: Date;
}) {
  await requireAdmin();
  return getCirculationMetricsService(prisma, params);
}

/**
 * Membuat transaksi peminjaman barang baru secara atomik.
 * Mencegah race-condition penurunan stok dengan updateMany bersyarat (CAS).
 */
export async function createBorrowAction(
  data: CreateBorrowInput
): Promise<BorrowActionResult> {
  const session = await requireAdmin();

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
export async function returnItem(
  data: ReturnBorrowInput
): Promise<BorrowActionResult> {
  const session = await requireAdmin();

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

    revalidateBorrowPages();

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

export async function returnBorrowAction(
  data: ReturnBorrowInput
): Promise<BorrowActionResult> {
  return returnItem(data);
}

export async function requestBorrow(
  input: RequestBorrowInput
): Promise<BorrowActionResult> {
  const session = await requireRole(Role.USER);
  const validated = requestBorrowSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      message: "Data pengajuan peminjaman tidak valid.",
      errors: validated.error.flatten().fieldErrors,
    };
  }
  if (!session.email) {
    return {
      success: false,
      message: "Akun belum memiliki email terverifikasi untuk kontak peminjaman.",
    };
  }

  try {
    const record = await requestBorrowService(
      prisma,
      session.userId,
      validated.data,
      { name: session.name, email: session.email }
    );
    revalidateBorrowPages();
    return {
      success: true,
      message: `Pengajuan berhasil dikirim dengan kode ${record.borrowCode}. Stok baru berkurang saat barang diambil.`,
      data: record,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mengirim pengajuan peminjaman.",
    };
  }
}

export async function approveBorrow(id: string): Promise<BorrowActionResult> {
  const session = await requireAdmin();
  try {
    const record = await prisma.$transaction(async (tx) => {
      const current = await tx.borrowRecord.findUnique({
        where: { id },
        include: { item: { select: { name: true, code: true } } },
      });
      if (!current || current.status !== BorrowStatus.PENDING) {
        throw new Error("Pengajuan tidak ditemukan atau sudah diproses.");
      }
      const changed = await tx.borrowRecord.updateMany({
        where: { id, status: BorrowStatus.PENDING },
        data: {
          status: BorrowStatus.APPROVED,
          adminId: session.userId,
          rejectionReason: null,
        },
      });
      if (changed.count !== 1) throw new Error("Pengajuan sudah diproses.");
      return current;
    });
    await recordAuditLogService(prisma, {
      action: "SETUJUI_PEMINJAMAN",
      entityType: "BORROW_RECORD",
      entityId: id,
      adminId: session.userId,
      details: `Menyetujui pengajuan ${record.borrowCode} untuk barang "${record.item.name}".`,
      newValue: { status: BorrowStatus.APPROVED },
    });
    revalidateBorrowPages();
    return { success: true, message: "Pengajuan peminjaman disetujui." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal menyetujui pengajuan.",
    };
  }
}

export async function rejectBorrow(
  id: string,
  rejectionReason: string
): Promise<BorrowActionResult> {
  const session = await requireAdmin();
  const validatedReason = rejectBorrowSchema.safeParse({ rejectionReason });
  if (!validatedReason.success) {
    return {
      success: false,
      message: validatedReason.error.flatten().fieldErrors.rejectionReason?.[0] ??
        "Alasan penolakan tidak valid.",
    };
  }

  try {
    const record = await prisma.$transaction(async (tx) => {
      const current = await tx.borrowRecord.findUnique({
        where: { id },
        include: { item: { select: { name: true } } },
      });
      if (!current || current.status !== BorrowStatus.PENDING) {
        throw new Error("Pengajuan tidak ditemukan atau sudah diproses.");
      }
      const changed = await tx.borrowRecord.updateMany({
        where: { id, status: BorrowStatus.PENDING },
        data: {
          status: BorrowStatus.DITOLAK,
          rejectionReason: validatedReason.data.rejectionReason,
          adminId: session.userId,
        },
      });
      if (changed.count !== 1) throw new Error("Pengajuan sudah diproses.");
      return current;
    });
    await recordAuditLogService(prisma, {
      action: "TOLAK_PEMINJAMAN",
      entityType: "BORROW_RECORD",
      entityId: id,
      adminId: session.userId,
      details: `Menolak pengajuan ${record.borrowCode} untuk "${record.item.name}". Alasan: ${validatedReason.data.rejectionReason}`,
      newValue: {
        status: BorrowStatus.DITOLAK,
        rejectionReason: validatedReason.data.rejectionReason,
      },
    });
    revalidateBorrowPages();
    return { success: true, message: "Pengajuan peminjaman ditolak." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal menolak pengajuan.",
    };
  }
}

export async function confirmItemTaken(id: string): Promise<BorrowActionResult> {
  const session = await requireAdmin();
  try {
    const record = await prisma.$transaction(async (tx) => {
      const current = await tx.borrowRecord.findUnique({
        where: { id },
        include: { item: { select: { id: true, name: true, code: true } } },
      });
      if (!current || current.status !== BorrowStatus.APPROVED) {
        throw new Error("Pengajuan tidak ditemukan atau belum disetujui.");
      }

      const stock = await tx.item.updateMany({
        where: {
          id: current.itemId,
          status: "AKTIF",
          availableQuantity: { gte: current.borrowQuantity },
        },
        data: { availableQuantity: { decrement: current.borrowQuantity } },
      });
      if (stock.count !== 1) {
        throw new Error("Stok tersedia tidak cukup untuk menyerahkan barang.");
      }

      const changed = await tx.borrowRecord.updateMany({
        where: { id, status: BorrowStatus.APPROVED },
        data: {
          status: BorrowStatus.DIPINJAM,
          takenAt: new Date(),
          adminId: session.userId,
        },
      });
      if (changed.count !== 1) throw new Error("Status pengajuan sudah berubah.");
      return current;
    });

    await recordAuditLogService(prisma, {
      action: "BARANG_DIAMBIL",
      entityType: "BORROW_RECORD",
      entityId: id,
      adminId: session.userId,
      details: `${record.borrowQuantity} unit "${record.item.name}" (${record.item.code}) diserahkan kepada ${record.borrowerName}.`,
      newValue: { status: BorrowStatus.DIPINJAM, takenAt: new Date() },
    });
    revalidateBorrowPages();
    return { success: true, message: "Pengambilan barang dikonfirmasi dan stok diperbarui." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Gagal mengonfirmasi pengambilan barang.",
    };
  }
}

function revalidateBorrowPages() {
  revalidatePath("/sirkulasi");
  revalidatePath("/riwayat");
  revalidatePath("/barang");
  revalidatePath("/aktivitas");
  revalidatePath("/");
}