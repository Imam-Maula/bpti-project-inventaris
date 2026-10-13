import crypto from "crypto";
import { PrismaClient, Prisma, BorrowStatus, Condition } from "@prisma/client";
import { CreateBorrowInput, ReturnBorrowInput } from "@/lib/validations/borrow";

/**
 * Menghasilkan kode unik transaksi peminjaman (contoh: PJM-20261013-A1B2)
 */
export function generateBorrowCode(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `PJM-${dateStr}-${randomSuffix}`;
}

/**
 * Service domain untuk manajemen sirkulasi peminjaman aset BPTI.
 */
export async function getBorrowRecordsService(
  db: PrismaClient,
  params?: {
    status?: BorrowStatus | "OVERDUE";
    search?: string;
  }
) {
  const where: Prisma.BorrowRecordWhereInput = {};
  const now = new Date();

  if (params?.status) {
    if (params.status === "TERLAMBAT" || params.status === "OVERDUE") {
      where.status = "DIPINJAM";
      where.dueDate = { lt: now };
    } else {
      where.status = params.status;
    }
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

  return db.borrowRecord.findMany({
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
          quarantinedQuantity: true,
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

export async function getCirculationMetricsService(
  db: PrismaClient,
  params?: {
    startDate?: Date;
    endDate?: Date;
  }
) {
  const now = new Date();
  const dateFilter: Prisma.BorrowRecordWhereInput = {};
  if (params?.startDate || params?.endDate) {
    dateFilter.borrowDate = {};
    if (params.startDate) dateFilter.borrowDate.gte = params.startDate;
    if (params.endDate) dateFilter.borrowDate.lte = params.endDate;
  }

  const [
    itemAggregates,
    borrowAggregates,
    totalJenisAset,
    totalTransaksiDipinjam,
    totalTerlambat,
    totalDikembalikan,
  ] = await Promise.all([
    db.item.aggregate({
      where: { status: "AKTIF" },
      _sum: {
        totalQuantity: true,
        availableQuantity: true,
        quarantinedQuantity: true,
      },
    }),
    db.borrowRecord.aggregate({
      where: { ...dateFilter, status: "DIPINJAM" },
      _sum: {
        borrowQuantity: true,
      },
    }),
    db.item.count({
      where: { status: "AKTIF" },
    }),
    db.borrowRecord.count({
      where: { ...dateFilter, status: "DIPINJAM" },
    }),
    db.borrowRecord.count({
      where: {
        ...dateFilter,
        status: "DIPINJAM",
        dueDate: { lt: now },
      },
    }),
    db.borrowRecord.count({
      where: { ...dateFilter, status: "DIKEMBALIKAN" },
    }),
  ]);

  const totalUnitFisik = itemAggregates._sum.totalQuantity ?? 0;
  const totalUnitSiapPakai = itemAggregates._sum.availableQuantity ?? 0;
  const totalUnitKarantina = itemAggregates._sum.quarantinedQuantity ?? 0;
  const totalUnitDipinjam = borrowAggregates._sum.borrowQuantity ?? 0;

  return {
    totalJenisAset,
    totalUnitFisik,
    totalUnitDipinjam,
    totalUnitSiapPakai,
    totalUnitKarantina,
    totalTransaksiDipinjam,
    totalTerlambat,
    totalDikembalikan,
  };
}

export async function createBorrowTransactionService(
  db: PrismaClient,
  adminId: string,
  data: CreateBorrowInput
) {
  const { itemId, borrowerName, borrowerContact, borrowQuantity, dueDate, notes } = data;

  return db.$transaction(async (tx) => {
    // 1. CAS decrement bersyarat: WHERE availableQuantity >= borrowQuantity
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

    // 3. Catat sirkulasi (tenggat waktu fleksibel diset ke akhir hari)
    const adjustedDueDate = new Date(dueDate);
    adjustedDueDate.setHours(23, 59, 59, 999);

    const record = await tx.borrowRecord.create({
      data: {
        borrowCode,
        itemId,
        adminId,
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
}

export async function returnBorrowTransactionService(
  db: PrismaClient,
  data: ReturnBorrowInput
) {
  const { borrowRecordId, returnCondition, notes } = data;

  return db.$transaction(async (tx) => {
    const record = await tx.borrowRecord.findUnique({
      where: { id: borrowRecordId },
      include: { item: true },
    });

    if (!record) {
      throw new Error("Catatan peminjaman tidak ditemukan.");
    }

    // Idempotensi anti-double-return: WHERE status = 'DIPINJAM'
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

    const isDamagedHeavy = returnCondition === Condition.RUSAK_BERAT;

    if (isDamagedHeavy) {
      // Catat ke kuota karantina/perbaikan BPTI
      await tx.item.update({
        where: { id: record.itemId },
        data: {
          quarantinedQuantity: { increment: record.borrowQuantity },
        },
      });
    } else {
      // Pulihkan ke stok siap pakai
      await tx.item.update({
        where: { id: record.itemId },
        data: {
          availableQuantity: { increment: record.borrowQuantity },
        },
      });
    }

    return { record, isDamagedHeavy };
  });
}
