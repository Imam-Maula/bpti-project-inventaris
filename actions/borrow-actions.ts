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
 */
export async function getCirculationMetricsAction() {
  await requireAuth();

  const now = new Date();

  const [
    itemAggregates,
    totalJenisAset,
    totalTransaksiDipinjam,
    totalTerlambat,
    totalDikembalikan,
  ] = await Promise.all([
    prisma.item.aggregate({
      _sum: {
        totalQuantity: true,
        availableQuantity: true,
      },
    }),
    prisma.item.count(),
    prisma.borrowRecord.count({
      where: { status: "DIPINJAM" },
    }),
    prisma.borrowRecord.count({
      where: {
        status: "DIPINJAM",
        dueDate: { lt: now },
      },
    }),
    prisma.borrowRecord.count({
      where: { status: "DIKEMBALIKAN" },
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

      // 3. Catat rekaman peminjaman
      const record = await tx.borrowRecord.create({
        data: {
          borrowCode,
          itemId,
          adminId: session.userId,
          borrowerName,
          borrowerContact,
          borrowQuantity,
          dueDate,
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

      // 3. Kembalikan stok barang yang dipinjam
      await tx.item.update({
        where: { id: record.itemId },
        data: {
          availableQuantity: { increment: record.borrowQuantity },
        },
      });

      return record;
    });

    revalidatePath("/sirkulasi");
    revalidatePath("/barang");
    revalidatePath("/");

    return {
      success: true,
      message: `Barang "${result.item.name}" (${result.borrowCode}) telah berhasil dikembalikan.`,
      data: result,
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