"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Condition } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/dal";
import {
  createItemSchema,
  updateItemSchema,
  CreateItemInput,
  UpdateItemInput,
} from "@/lib/validations/item";

export interface ItemActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

/**
 * Mengambil daftar seluruh barang master dengan filter opsional (pencarian, kategori, kondisi).
 */
export async function getItemsAction(params?: {
  search?: string;
  category?: string;
  condition?: Condition;
}) {
  await requireAuth();

  const where: Prisma.ItemWhereInput = {};

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

  return prisma.item.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Mengambil detail satu barang berdasarkan ID.
 */
export async function getItemByIdAction(id: string) {
  await requireAuth();

  return prisma.item.findUnique({
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

/**
 * Membuat master barang baru.
 * Saat barang pertama kali dibuat, availableQuantity sama dengan totalQuantity.
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

  const { code, name, category, totalQuantity, location, condition } =
    validated.data;

  try {
    const newItem = await prisma.item.create({
      data: {
        code,
        name,
        category,
        totalQuantity,
        availableQuantity: totalQuantity,
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
 * Memvalidasi agar totalQuantity baru tidak lebih kecil dari jumlah unit yang sedang dipinjam.
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

  const { id, code, name, category, totalQuantity, location, condition } =
    validated.data;

  try {
    const existing = await prisma.item.findUnique({
      where: { id },
      include: {
        borrowRecords: {
          where: { status: "DIPINJAM" },
        },
      },
    });

    if (!existing) {
      return {
        success: false,
        message: "Barang tidak ditemukan.",
      };
    }

    // Hitung unit yang sedang dipinjam saat ini
    const currentlyBorrowed = existing.totalQuantity - existing.availableQuantity;

    if (totalQuantity < currentlyBorrowed) {
      return {
        success: false,
        message: `Jumlah total tidak boleh kurang dari unit yang sedang aktif dipinjam (${currentlyBorrowed} unit).`,
      };
    }

    const newAvailableQuantity = totalQuantity - currentlyBorrowed;

    const updated = await prisma.item.update({
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

    revalidatePath("/barang");
    revalidatePath("/sirkulasi");
    revalidatePath("/");

    return {
      success: true,
      message: `Data barang "${updated.name}" berhasil diperbarui.`,
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

    console.error("Kesalahan saat memperbarui barang:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server saat memperbarui data barang.",
    };
  }
}

/**
 * Menghapus master barang.
 * Dilarang jika barang sedang dipinjam atau memiliki rekaman relasi foreign-key.
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

    const deleted = await prisma.item.delete({
      where: { id },
    });

    revalidatePath("/barang");
    revalidatePath("/");

    return {
      success: true,
      message: `Barang "${deleted.name}" (${deleted.code}) berhasil dihapus.`,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") {
        return {
          success: false,
          message:
            "Barang tidak dapat dihapus dari basis data karena memiliki riwayat sirkulasi peminjaman masa lalu.",
        };
      }
    }

    console.error("Kesalahan saat menghapus barang:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server saat menghapus barang.",
    };
  }
}