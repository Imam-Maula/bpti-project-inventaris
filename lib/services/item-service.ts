import { PrismaClient, Prisma, Condition, ItemStatus } from "@prisma/client";
import { CreateItemInput, UpdateItemInput } from "@/lib/validations/item";
import { getDominantCondition } from "@/lib/item-condition";

/**
 * Service domain untuk manajemen katalog aset inventaris kantor BPTI.
 * Terpisah dari transport layer (Server Actions/HTTP) agar dapat diuji secara murni.
 */
export async function getItemsService(
  db: PrismaClient,
  params?: {
    search?: string;
    category?: string;
    condition?: Condition;
    status?: ItemStatus | "ALL";
  }
) {
  const where: Prisma.ItemWhereInput = {};

  if (params?.status && params.status !== "ALL") {
    where.status = params.status;
  } else if (!params?.status) {
    where.status = "AKTIF";
  }

  if (params?.search) {
    where.OR = [
      { code: { contains: params.search } },
      { name: { contains: params.search } },
      { location: { contains: params.search } },
    ];
  }

  if (params?.category) {
    where.category = params.category;
  }

  if (params?.condition) {
    where.condition = params.condition;
  }

  return db.item.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function getItemByIdService(db: PrismaClient, id: string) {
  return db.item.findUnique({
    where: { id },
    include: {
      borrowRecords: {
        where: { status: "DIPINJAM" },
        take: 5,
        orderBy: { borrowDate: "desc" },
      },
    },
  });
}

export async function createItemService(
  db: PrismaClient,
  data: CreateItemInput
) {
  const { code, name, category, goodQuantity, lightDamageQuantity, heavyDamageQuantity, location } = data;

  const totalQuantity = goodQuantity + lightDamageQuantity + heavyDamageQuantity;
  const availableQuantity = goodQuantity + lightDamageQuantity; // Unit baik dan rusak ringan siap pakai
  const condition = getDominantCondition(goodQuantity, lightDamageQuantity, heavyDamageQuantity);

  return db.item.create({
    data: {
      code,
      name,
      category,
      totalQuantity,
      availableQuantity,
      goodQuantity,
      lightDamageQuantity,
      heavyDamageQuantity,
      resolvedDamagedQuantity: 0,
      location,
      condition,
    },
  });
}

export async function updateItemAtomicService(
  db: PrismaClient,
  data: UpdateItemInput
) {
  const { id, code, name, category, goodQuantity, lightDamageQuantity, heavyDamageQuantity, location } = data;

  const totalQuantity = goodQuantity + lightDamageQuantity + heavyDamageQuantity;
  const condition = getDominantCondition(goodQuantity, lightDamageQuantity, heavyDamageQuantity);

  return db.$transaction(async (tx) => {
    const existing = await tx.item.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new Error("Barang tidak ditemukan.");
    }

    const activeBorrowAgg = await tx.borrowRecord.aggregate({
      where: {
        itemId: id,
        status: "DIPINJAM",
      },
      _sum: {
        borrowQuantity: true,
      },
    });

    const currentlyBorrowed = activeBorrowAgg._sum.borrowQuantity ?? 0;
    const currentlyHeavyDamaged = heavyDamageQuantity;
    const minimumTotalRequired = currentlyBorrowed + currentlyHeavyDamaged;

    if (totalQuantity < minimumTotalRequired) {
      throw new Error(
        `Jumlah total (${totalQuantity} unit) tidak boleh kurang dari unit yang aktif dipinjam (${currentlyBorrowed} unit) dan rusak berat (${currentlyHeavyDamaged} unit). Minimal ${minimumTotalRequired} unit.`
      );
    }

    // Stok tersedia adalah unit (baik + rusak ringan) dikurangi unit yang sedang aktif dipinjam
    const usableStock = goodQuantity + lightDamageQuantity;
    const newAvailableQuantity = Math.max(0, usableStock - currentlyBorrowed);

    return tx.item.update({
      where: { id },
      data: {
        code,
        name,
        category,
        totalQuantity,
        availableQuantity: newAvailableQuantity,
        goodQuantity,
        lightDamageQuantity,
        heavyDamageQuantity,
        location,
        condition,
      },
    });
  });
}

export async function archiveItemService(db: PrismaClient, id: string) {
  const activeBorrows = await db.borrowRecord.count({
    where: { itemId: id, status: "DIPINJAM" },
  });

  if (activeBorrows > 0) {
    throw new Error(
      "Barang tidak dapat diarsipkan karena masih ada unit yang aktif dipinjam."
    );
  }

  return db.item.update({
    where: { id },
    data: { status: "DIARSIPKAN" },
  });
}

export async function unarchiveItemService(db: PrismaClient, id: string) {
  return db.item.update({
    where: { id },
    data: { status: "AKTIF" },
  });
}

export async function deleteItemService(db: PrismaClient, id: string) {
  const activeBorrows = await db.borrowRecord.count({
    where: {
      itemId: id,
      status: "DIPINJAM",
    },
  });

  if (activeBorrows > 0) {
    throw new Error(
      "Barang tidak dapat dihapus karena masih ada unit yang aktif dipinjam."
    );
  }

  try {
    const deleted = await db.item.delete({
      where: { id },
    });
    return { isDeletedPermanent: true, item: deleted };
  } catch (dbError) {
    if (
      dbError instanceof Prisma.PrismaClientKnownRequestError &&
      dbError.code === "P2003"
    ) {
      // Fallback otomatis ke status DIARSIPKAN jika memiliki relasi masa lalu
      const archived = await db.item.update({
        where: { id },
        data: { status: "DIARSIPKAN" },
      });
      return { isDeletedPermanent: false, item: archived };
    }
    throw dbError;
  }
}

export async function restoreQuarantinedItemService(
  db: PrismaClient,
  id: string,
  quantityToRestore: number
) {
  if (quantityToRestore <= 0) {
    throw new Error("Jumlah unit yang dipulihkan harus lebih dari 0 unit.");
  }

  return db.$transaction(async (tx) => {
    const existing = await tx.item.findUnique({ where: { id } });
    if (!existing) throw new Error("Barang tidak ditemukan.");

    if (existing.heavyDamageQuantity < quantityToRestore) {
      throw new Error(
        `Unit rusak berat yang ada (${existing.heavyDamageQuantity} unit) tidak mencukupi untuk dipulihkan (${quantityToRestore} unit).`
      );
    }

    const newGood = existing.goodQuantity + quantityToRestore;
    const newHeavy = existing.heavyDamageQuantity - quantityToRestore;
    const condition = getDominantCondition(newGood, existing.lightDamageQuantity, newHeavy);

    return tx.item.update({
      where: { id },
      data: {
        heavyDamageQuantity: { decrement: quantityToRestore },
        goodQuantity: { increment: quantityToRestore },
        availableQuantity: { increment: quantityToRestore },
        resolvedDamagedQuantity: { increment: quantityToRestore },
        condition,
      },
    });
  });
}

export async function bulkArchiveItemsService(db: PrismaClient, ids: string[]) {
  if (!ids || ids.length === 0) {
    throw new Error("Pilih setidaknya satu barang untuk diarsipkan.");
  }

  // Cek apakah ada barang yang masih aktif dipinjam
  const activeBorrowItems = await db.borrowRecord.findMany({
    where: {
      itemId: { in: ids },
      status: "DIPINJAM",
    },
    select: {
      item: { select: { code: true, name: true } },
    },
  });

  if (activeBorrowItems.length > 0) {
    const itemNames = Array.from(new Set(activeBorrowItems.map((b) => b.item.name))).join(", ");
    throw new Error(
      `Pengarsipan massal ditolak: Barang (${itemNames}) masih memiliki unit yang aktif dipinjam.`
    );
  }

  const result = await db.item.updateMany({
    where: {
      id: { in: ids },
    },
    data: {
      status: "DIARSIPKAN",
    },
  });

  return result.count;
}

export async function bulkUnarchiveItemsService(db: PrismaClient, ids: string[]) {
  if (!ids || ids.length === 0) {
    throw new Error("Pilih setidaknya satu barang untuk diaktifkan kembali.");
  }

  const result = await db.item.updateMany({
    where: {
      id: { in: ids },
    },
    data: {
      status: "AKTIF",
    },
  });

  return result.count;
}

