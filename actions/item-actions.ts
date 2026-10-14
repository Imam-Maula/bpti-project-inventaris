"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Condition, ItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/dal";
import { getDominantCondition } from "@/lib/item-condition";
import {
  createItemSchema,
  updateItemSchema,
  CreateItemInput,
  UpdateItemInput,
} from "@/lib/validations/item";

type ItemStockSummary = {
  borrowedQuantity: number;
  borrowedGoodQuantity: number;
  borrowedLightDamageQuantity: number;
  damagedQuantity: number;
};

async function getItemStockSummaries(
  itemIds: string[]
): Promise<Map<string, ItemStockSummary>> {
  if (itemIds.length === 0) {
    return new Map();
  }

  const [borrowedItems, items] = await Promise.all([
    prisma.borrowRecord.groupBy({
      by: ["itemId"],
      where: {
        itemId: { in: itemIds },
        status: "DIPINJAM",
      },
      _sum: {
        borrowQuantity: true,
        borrowGoodQuantity: true,
        borrowLightDamageQuantity: true,
      },
    }),
    prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, heavyDamageQuantity: true },
    }),
  ]);

  const summaries = new Map<string, ItemStockSummary>(
    itemIds.map((itemId) => [
      itemId,
      {
        borrowedQuantity: 0,
        borrowedGoodQuantity: 0,
        borrowedLightDamageQuantity: 0,
        damagedQuantity: 0,
      },
    ])
  );

  for (const { itemId, _sum } of borrowedItems) {
    const summary = summaries.get(itemId)!;
    summary.borrowedQuantity = _sum.borrowQuantity ?? 0;
    summary.borrowedGoodQuantity = _sum.borrowGoodQuantity ?? 0;
    summary.borrowedLightDamageQuantity =
      _sum.borrowLightDamageQuantity ?? 0;
  }
  for (const item of items) {
    summaries.get(item.id)!.damagedQuantity = item.heavyDamageQuantity;
  }

  return summaries;
}

export interface ItemActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

/**
 * Mengambil daftar seluruh barang master dengan filter opsional (pencarian, kategori, kondisi, status).
 */
export async function getItemsAction(params?: {
  search?: string;
  category?: string;
  condition?: Condition;
  status?: ItemStatus | "ALL";
}) {
  await requireAuth();

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

  const items = await prisma.item.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  const stockSummaries = await getItemStockSummaries(
    items.map((item) => item.id)
  );

  const itemsWithStockSummary = items.map((item) => ({
    ...item,
    condition: getDominantCondition(
      item.goodQuantity +
        (stockSummaries.get(item.id)?.borrowedGoodQuantity ?? 0),
      item.lightDamageQuantity +
        (stockSummaries.get(item.id)?.borrowedLightDamageQuantity ?? 0),
      item.heavyDamageQuantity
    ),
    borrowedQuantity: stockSummaries.get(item.id)?.borrowedQuantity ?? 0,
    borrowedGoodQuantity:
      stockSummaries.get(item.id)?.borrowedGoodQuantity ?? 0,
    borrowedLightDamageQuantity:
      stockSummaries.get(item.id)?.borrowedLightDamageQuantity ?? 0,
    goodQuantity:
      item.goodQuantity +
      (stockSummaries.get(item.id)?.borrowedGoodQuantity ?? 0),
    lightDamageQuantity:
      item.lightDamageQuantity +
      (stockSummaries.get(item.id)?.borrowedLightDamageQuantity ?? 0),
    damagedQuantity: stockSummaries.get(item.id)?.damagedQuantity ?? 0,
  }));

  if (!params?.condition) {
    return itemsWithStockSummary;
  }

  return itemsWithStockSummary.filter((item) => {
    switch (params.condition) {
      case Condition.BAIK:
        return item.goodQuantity > 0;
      case Condition.RUSAK_RINGAN:
        return item.lightDamageQuantity > 0;
      case Condition.RUSAK_BERAT:
        return item.heavyDamageQuantity > 0;
    }
  });
}

/**
 * Mengambil detail satu barang berdasarkan ID.
 */
export async function getItemByIdAction(id: string) {
  await requireAuth();

  const [item, stockSummaries] = await Promise.all([
    prisma.item.findUnique({
      where: { id },
      include: {
        borrowRecords: {
          where: { status: "DIPINJAM" },
          take: 5,
          orderBy: { borrowDate: "desc" },
        },
      },
    }),
    getItemStockSummaries([id]),
  ]);

  if (!item) {
    return null;
  }

  return {
    ...item,
    condition: getDominantCondition(
      item.goodQuantity +
        (stockSummaries.get(id)?.borrowedGoodQuantity ?? 0),
      item.lightDamageQuantity +
        (stockSummaries.get(id)?.borrowedLightDamageQuantity ?? 0),
      item.heavyDamageQuantity
    ),
    borrowedQuantity: stockSummaries.get(id)?.borrowedQuantity ?? 0,
    borrowedGoodQuantity:
      stockSummaries.get(id)?.borrowedGoodQuantity ?? 0,
    borrowedLightDamageQuantity:
      stockSummaries.get(id)?.borrowedLightDamageQuantity ?? 0,
    goodQuantity:
      item.goodQuantity +
      (stockSummaries.get(id)?.borrowedGoodQuantity ?? 0),
    lightDamageQuantity:
      item.lightDamageQuantity +
      (stockSummaries.get(id)?.borrowedLightDamageQuantity ?? 0),
    damagedQuantity: stockSummaries.get(id)?.damagedQuantity ?? 0,
  };
}

/**
 * Membuat master barang baru.
 * Jumlah total dan stok siap pinjam diturunkan dari jumlah tiap kondisi.
 */
export async function createItemAction(
  data: CreateItemInput
): Promise<ItemActionResult> {
  await requireAuth();

  const validated = createItemSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      message: "Data barang tidak valid.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const {
    code,
    name,
    category,
    goodQuantity,
    lightDamageQuantity,
    heavyDamageQuantity,
    location,
  } = validated.data;
  const totalQuantity =
    goodQuantity + lightDamageQuantity + heavyDamageQuantity;
  const condition = getDominantCondition(
    goodQuantity,
    lightDamageQuantity,
    heavyDamageQuantity
  );

  try {
    const newItem = await prisma.item.create({
      data: {
        code,
        name,
        category,
        totalQuantity,
        availableQuantity: goodQuantity + lightDamageQuantity,
        goodQuantity,
        lightDamageQuantity,
        heavyDamageQuantity,
        location,
        condition,
      },
    });

    revalidatePath("/barang");
    revalidatePath("/");

    return {
      success: true,
      message: `Barang "${newItem.name}" (${newItem.code}) berhasil ditambahkan.`,
      data: newItem,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          message: `Kode barang "${code}" sudah digunakan oleh barang lain.`,
        };
      }
    }

    console.error("Kesalahan saat menambahkan barang:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server saat menyimpan barang.",
    };
  }
}

/**
 * Memperbarui data master barang.
 * Memperbarui jumlah unit tiap kondisi, dengan jumlah unit yang sedang dipinjam tetap terlindungi.
 */
export async function updateItemAction(
  data: UpdateItemInput
): Promise<ItemActionResult> {
  await requireAuth();

  const validated = updateItemSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      message: "Data pembaruan barang tidak valid.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const {
    id,
    code,
    name,
    category,
    goodQuantity,
    lightDamageQuantity,
    heavyDamageQuantity,
    location,
  } = validated.data;
  const totalQuantity =
    goodQuantity + lightDamageQuantity + heavyDamageQuantity;
  const condition = getDominantCondition(
    goodQuantity,
    lightDamageQuantity,
    heavyDamageQuantity
  );

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const [existing, activeBorrowSummary] = await Promise.all([
        tx.item.findUnique({ where: { id } }),
        tx.borrowRecord.aggregate({
          where: { itemId: id, status: "DIPINJAM" },
          _sum: {
            borrowQuantity: true,
            borrowGoodQuantity: true,
            borrowLightDamageQuantity: true,
          },
        }),
      ]);

      if (!existing) {
        throw new Error("Barang tidak ditemukan.");
      }

      const borrowedQuantity =
        activeBorrowSummary._sum.borrowQuantity ?? 0;
      const borrowedGoodQuantity =
        activeBorrowSummary._sum.borrowGoodQuantity ?? 0;
      const borrowedLightDamageQuantity =
        activeBorrowSummary._sum.borrowLightDamageQuantity ?? 0;

      if (
        goodQuantity < borrowedGoodQuantity ||
        lightDamageQuantity < borrowedLightDamageQuantity ||
        totalQuantity < borrowedQuantity
      ) {
        throw new Error(
          `Jumlah kondisi tidak boleh lebih kecil dari unit yang sedang dipinjam (Baik: ${borrowedGoodQuantity}, Rusak ringan: ${borrowedLightDamageQuantity}, Total dipinjam: ${borrowedQuantity}).`
        );
      }

      return tx.item.update({
        where: { id },
        data: {
          code,
          name,
          category,
          totalQuantity,
          goodQuantity: goodQuantity - borrowedGoodQuantity,
          lightDamageQuantity:
            lightDamageQuantity - borrowedLightDamageQuantity,
          heavyDamageQuantity,
          availableQuantity: goodQuantity + lightDamageQuantity - borrowedQuantity,
          location,
          condition,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidatePath("/barang");
    revalidatePath("/sirkulasi");
    revalidatePath("/");

    return {
      success: true,
      message: `Data barang "${updated.name}" berhasil diperbarui. Total ${totalQuantity} unit: ${goodQuantity} baik, ${lightDamageQuantity} rusak ringan, dan ${heavyDamageQuantity} rusak berat.`,
      data: updated,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          message: `Kode barang "${code}" sudah digunakan oleh barang lain.`,
        };
      }
    }

    if (
      error instanceof Error &&
      (error.message === "Barang tidak ditemukan." ||
        error.message.startsWith("Jumlah kondisi tidak boleh"))
    ) {
      return {
        success: false,
        message: error.message,
      };
    }

    console.error("Kesalahan saat memperbarui barang:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server saat memperbarui data barang.",
    };
  }
}

/**
 * Mengarsipkan master barang (Soft Delete).
 */
export async function archiveItemAction(id: string): Promise<ItemActionResult> {
  await requireAuth();

  try {
    const activeBorrows = await prisma.borrowRecord.count({
      where: { itemId: id, status: "DIPINJAM" },
    });

    if (activeBorrows > 0) {
      return {
        success: false,
        message: "Barang tidak dapat diarsipkan karena masih ada unit yang aktif dipinjam.",
      };
    }

    const archived = await prisma.item.update({
      where: { id },
      data: { status: "DIARSIPKAN" },
    });

    revalidatePath("/barang");
    revalidatePath("/");

    return {
      success: true,
      message: `Barang "${archived.name}" (${archived.code}) berhasil diarsipkan.`,
      data: archived,
    };
  } catch (error) {
    console.error("Kesalahan saat mengarsipkan barang:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server saat mengarsipkan barang.",
    };
  }
}

/**
 * Mengaktifkan kembali master barang yang diarsipkan ke katalog aktif.
 */
export async function unarchiveItemAction(id: string): Promise<ItemActionResult> {
  await requireAuth();

  try {
    const restored = await prisma.item.update({
      where: { id },
      data: { status: "AKTIF" },
    });

    revalidatePath("/barang");
    revalidatePath("/");

    return {
      success: true,
      message: `Barang "${restored.name}" (${restored.code}) berhasil diaktifkan kembali ke katalog aktif.`,
      data: restored,
    };
  } catch (error) {
    console.error("Kesalahan saat mengaktifkan barang:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server saat mengaktifkan kembali barang.",
    };
  }
}

/**
 * Menghapus master barang.
 * Jika memiliki riwayat sirkulasi masa lalu (FK Restrict P2003), otomatis dialihkan ke status Diarsipkan (Soft Delete).
 */
export async function deleteItemAction(id: string): Promise<ItemActionResult> {
  await requireAuth();

  try {
    const activeBorrows = await prisma.borrowRecord.count({
      where: {
        itemId: id,
        status: "DIPINJAM",
      },
    });

    if (activeBorrows > 0) {
      return {
        success: false,
        message: "Barang tidak dapat dihapus karena masih ada unit yang aktif dipinjam.",
      };
    }

    try {
      const deleted = await prisma.item.delete({
        where: { id },
      });

      revalidatePath("/barang");
      revalidatePath("/");

      return {
        success: true,
        message: `Barang "${deleted.name}" (${deleted.code}) berhasil dihapus permanen.`,
      };
    } catch (dbError) {
      if (
        dbError instanceof Prisma.PrismaClientKnownRequestError &&
        dbError.code === "P2003"
      ) {
        // Otomatis alihkan ke status DIARSIPKAN jika memiliki relasi masa lalu
        const archived = await prisma.item.update({
          where: { id },
          data: { status: "DIARSIPKAN" },
        });

        revalidatePath("/barang");
        revalidatePath("/");

        return {
          success: true,
          message: `Barang "${archived.name}" (${archived.code}) memiliki riwayat transaksi sirkulasi masa lalu dan berhasil diarsipkan (soft delete).`,
          data: archived,
        };
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Kesalahan saat memproses penghapusan barang:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server saat memproses penghapusan barang.",
    };
  }
}