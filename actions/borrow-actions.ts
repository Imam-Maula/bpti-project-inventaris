"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { Prisma, BorrowStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/dal";
import {
  createBorrowSchema,
  returnBorrowSchema,
  CreateBorrowInput,
  ReturnBorrowInput,
} from "@/lib/validations/borrow";

export interface BorrowActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

/**
 * Menghasilkan kode unik transaksi peminjaman (contoh: PJM-20261006-A1B2)
 */
function generateBorrowCode(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `PJM-${dateStr}-${randomSuffix}`;
}

/**
 * Mengambil daftar seluruh catatan sirkulasi peminjaman.
 */
export async function getBorrowRecordsAction(params?: {
  status?: BorrowStatus;
  search?: string;
}) {
  await requireAuth();

  const where: Prisma.BorrowRecordWhereInput = {};

  if (params?.status) {
    where.status = params.status;
  }

  if (params?.search) {
    where.OR = [
      { borrowCode: { contains: params.search } },
      { borrowerName: { contains: params.search } },
      { borrowerContact: { contains: params.search } },
      { item: { name: { contains: params.search } } },
      { item: { code: { contains: params.search } } },
    ];
  }

  return prisma.borrowRecord.findMany({
    where,
    include: {
      item: {
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          location: true,
          condition: true,
        },
      },
      admin: {
        select: {
          id: true,
          name: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Mengambil ringkasan statistik metrik sirkulasi dan fisik aset untuk Dasbor (FR-UI-01).
 * Mendukung filter rentang tanggal opsional untuk analisis sirkulasi berkala.
 */
export async function getCirculationMetricsAction(params?: {
  startDate?: Date;
  endDate?: Date;
}) {
  await requireAuth();

  const now = new Date();
  const dateFilter: Prisma.BorrowRecordWhereInput = {};
  if (params?.startDate || params?.endDate) {
    dateFilter.borrowDate = {};
    if (params.startDate) dateFilter.borrowDate.gte = params.startDate;
    if (params.endDate) dateFilter.borrowDate.lte = params.endDate;
  }

  const [
    itemAggregates,
    totalJenisAset,
    totalTransaksiDipinjam,
    totalTerlambat,
    totalDikembalikan,
  ] = await Promise.all([
    prisma.item.aggregate({
      where: { status: "AKTIF" },
      _sum: {
        totalQuantity: true,
        availableQuantity: true,
      },
    }),
    prisma.item.count({
      where: { status: "AKTIF" },
    }),
    prisma.borrowRecord.count({
      where: { ...dateFilter, status: "DIPINJAM" },
    }),
    prisma.borrowRecord.count({
      where: {
        ...dateFilter,
        status: "DIPINJAM",
        dueDate: { lt: now },
      },
    }),
    prisma.borrowRecord.count({
      where: { ...dateFilter, status: "DIKEMBALIKAN" },
    }),
  ]);

  const totalUnitFisik = itemAggregates._sum.totalQuantity ?? 0;
  const totalUnitSiapPakai = itemAggregates._sum.availableQuantity ?? 0;
  const totalUnitDipinjam = Math.max(0, totalUnitFisik - totalUnitSiapPakai);

  return {
    totalJenisAset,
    totalUnitFisik,
    totalUnitDipinjam,
    totalUnitSiapPakai,
    totalTransaksiDipinjam,
    totalTerlambat,
    totalDikembalikan,
  };
}

/**
 * Membuat transaksi peminjaman barang baru secara atomik.
 * Mencegah race-condition penurunan stok dengan updateMany bersyarat (availableQuantity >= borrowQuantity).
 * Mengambil adminId langsung dari sesi terautentikasi (mencegah impersonation).
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

  const { itemId, borrowerName, borrowerContact, borrowQuantity, dueDate, notes } =
    validated.data;

  try {
    const borrowRecord = await prisma.$transaction(async (tx) => {
      // 1. Pengurangan stok secara atomik bersyarat
      const updateResult = await tx.item.updateMany({
        where: {
          id: itemId,
          availableQuantity: { gte: borrowQuantity },
        },
        data: {
          availableQuantity: { decrement: borrowQuantity },
        },
      });

      if (updateResult.count === 0) {
        throw new Error("Stok barang yang tersedia tidak mencukupi untuk dipinjam.");
      }

      // 2. Buat kode transaksi unik
      let borrowCode = generateBorrowCode();
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 5) {
        const existing = await tx.borrowRecord.findUnique({
          where: { borrowCode },
        });
        if (!existing) {
          isUnique = true;
        } else {
          borrowCode = generateBorrowCode();
          attempts++;
        }
      }

      // 3. Catat rekaman peminjaman (tenggat waktu diatur ke akhir hari 23:59:59.999 agar adil)
      const adjustedDueDate = new Date(dueDate);
      adjustedDueDate.setHours(23, 59, 59, 999);

      const record = await tx.borrowRecord.create({
        data: {
          borrowCode,
          itemId,
          adminId: session.userId,
          borrowerName,
          borrowerContact,
          borrowQuantity,
          dueDate: adjustedDueDate,
          notes: notes || null,
          status: "DIPINJAM",
        },
        include: {
          item: {
            select: { name: true, code: true },
          },
        },
      });

      return record;
    });

    revalidatePath("/sirkulasi");
    revalidatePath("/barang");
    revalidatePath("/");

    return {
      success: true,
      message: `Peminjaman "${borrowRecord.item.name}" berhasil dicatat dengan kode ${borrowRecord.borrowCode}.`,
      data: borrowRecord,
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
 * Mencegah duplikasi pengembalian (double return) dengan updateMany bersyarat (status = DIPINJAM).
 * Mengembalikan stok yang dipinjam ke unit tersedia.
 */
export async function returnBorrowAction(
  data: ReturnBorrowInput
): Promise<BorrowActionResult> {
  await requireAuth();

  const validated = returnBorrowSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      message: "Data pengembalian tidak valid.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { borrowRecordId, returnCondition, notes } = validated.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Dapatkan informasi rekaman peminjaman
      const record = await tx.borrowRecord.findUnique({
        where: { id: borrowRecordId },
        include: { item: true },
      });

      if (!record) {
        throw new Error("Catatan peminjaman tidak ditemukan.");
      }

      // 2. Tandai pengembalian secara atomik bersyarat untuk mencegah double-return
      const updateResult = await tx.borrowRecord.updateMany({
        where: {
          id: borrowRecordId,
          status: "DIPINJAM",
        },
        data: {
          status: "DIKEMBALIKAN",
          returnDate: new Date(),
          returnCondition,
          notes: notes
            ? record.notes
              ? `${record.notes} | Catatan Kembali: ${notes}`
              : `Catatan Kembali: ${notes}`
            : record.notes,
        },
      });

      if (updateResult.count === 0) {
        throw new Error("Peminjaman ini sudah tercatat dikembalikan sebelumnya.");
      }

      // 3. Kembalikan stok barang yang dipinjam atau karantina jika rusak berat
      const isDamagedHeavy = returnCondition === "RUSAK_BERAT";

      if (isDamagedHeavy) {
        // Unit teridentifikasi RUSAK BERAT: otomatis dikarantina (tidak ditambahkan ke availableQuantity)
        await tx.item.update({
          where: { id: record.itemId },
          data: {
            condition: "RUSAK_BERAT",
          },
        });
      } else {
        // Unit kondisi BAIK / RUSAK_RINGAN: pulihkan ke stok siap pakai
        await tx.item.update({
          where: { id: record.itemId },
          data: {
            availableQuantity: { increment: record.borrowQuantity },
          },
        });
      }

      return { record, isDamagedHeavy };
    });

    revalidatePath("/sirkulasi");
    revalidatePath("/barang");
    revalidatePath("/");

    const quarantineNote = result.isDamagedHeavy
      ? " Unit teridentifikasi RUSAK BERAT dan otomatis dikarantina (tidak dimasukkan ke stok siap pakai)."
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