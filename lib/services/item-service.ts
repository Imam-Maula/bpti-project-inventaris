import { PrismaClient, Prisma, Condition, ItemStatus } from "@prisma/client";
import { CreateItemInput, UpdateItemInput } from "@/lib/validations/item";

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
  const { code, name, category, totalQuantity, location, condition } = data;

  return db.item.create({
    data: {
      code,
      name,
      category,
      totalQuantity,
      availableQuantity: totalQuantity,
      quarantinedQuantity: 0,
      location,
      condition,
    },
  });
}

export async function updateItemAtomicService(
  db: PrismaClient,
  data: UpdateItemInput
) {
  const { id, code, name, category, totalQuantity, location, condition } = data;

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
    const currentlyQuarantined = existing.quarantinedQuantity ?? 0;
    const minimumTotalRequired = currentlyBorrowed + currentlyQuarantined;

    if (totalQuantity < minimumTotalRequired) {
      throw new Error(
        `Jumlah total (${totalQuantity} unit) tidak boleh kurang dari unit yang aktif dipinjam (${currentlyBorrowed} unit) dan dikarantina (${currentlyQuarantined} unit). Minimal ${minimumTotalRequired} unit.`
      );
    }

    const deltaTotal = totalQuantity - existing.totalQuantity;
    const newAvailableQuantity = existing.availableQuantity + deltaTotal;

    if (newAvailableQuantity < 0) {
      throw new Error(
        "Pengurangan kuota total menyebabkan stok siap pakai menjadi negatif."
      );
    }

    return tx.item.update({
      where: { id },
      data: {
        code,
        name,
        category,
        totalQuantity,
        availableQuantity: newAvailableQuantity,
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

    if (existing.quarantinedQuantity < quantityToRestore) {
      throw new Error(
        `Unit karantina yang ada (${existing.quarantinedQuantity} unit) tidak mencukupi untuk dipulihkan (${quantityToRestore} unit).`
      );
    }

    return tx.item.update({
      where: { id },
      data: {
        quarantinedQuantity: { decrement: quantityToRestore },
        availableQuantity: { increment: quantityToRestore },
      },
    });
  });
}
