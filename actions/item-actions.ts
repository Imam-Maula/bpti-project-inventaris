"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Condition, ItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/dal";
import {
  createItemSchema,
  updateItemSchema,
  CreateItemInput,
  UpdateItemInput,
} from "@/lib/validations/item";
import {
  getItemsService,
  getItemByIdService,
  createItemService,
  updateItemAtomicService,
  archiveItemService,
  unarchiveItemService,
  deleteItemService,
  restoreQuarantinedItemService,
} from "@/lib/services/item-service";

export interface ItemActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

/**
 * Mengambil daftar seluruh barang master dengan filter opsional.
 */
export async function getItemsAction(params?: {
  search?: string;
  category?: string;
  condition?: Condition;
  status?: ItemStatus | "ALL";
}) {
  await requireAuth();
  return getItemsService(prisma, params);
}

/**
 * Mengambil detail satu barang berdasarkan ID.
 */
export async function getItemByIdAction(id: string) {
  await requireAuth();
  return getItemByIdService(prisma, id);
}

/**
 * Membuat master barang baru.
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

  try {
    const newItem = await createItemService(prisma, validated.data);

    revalidatePath("/barang");
    revalidatePath("/");

    return {
      success: true,
      message: `Barang "${newItem.name}" (${newItem.code}) berhasil ditambahkan.`,
      data: newItem,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        message: `Kode barang "${validated.data.code}" sudah digunakan oleh barang lain.`,
      };
    }

    console.error("Kesalahan saat menambahkan barang:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server saat menyimpan barang.",
    };
  }
}

/**
 * Memperbarui data master barang secara atomik.
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

  try {
    const updated = await updateItemAtomicService(prisma, validated.data);

    revalidatePath("/barang");
    revalidatePath("/sirkulasi");
    revalidatePath("/");

    return {
      success: true,
      message: `Data barang "${updated.name}" berhasil diperbarui.`,
      data: updated,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        message: `Kode barang "${validated.data.code}" sudah digunakan oleh barang lain.`,
      };
    }

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan server saat memperbarui data barang.";

    return {
      success: false,
      message,
    };
  }
}

/**
 * Memulihkan unit yang berstatus karantina/perbaikan kembali ke stok siap pakai.
 */
export async function restoreQuarantinedItemAction(
  id: string,
  quantityToRestore: number
): Promise<ItemActionResult> {
  await requireAuth();

  try {
    const updated = await restoreQuarantinedItemService(prisma, id, quantityToRestore);

    revalidatePath("/barang");
    revalidatePath("/sirkulasi");
    revalidatePath("/");

    return {
      success: true,
      message: `${quantityToRestore} unit barang "${updated.name}" berhasil dipulihkan dari karantina ke stok siap pakai.`,
      data: updated,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat memulihkan unit dari karantina.";
    return {
      success: false,
      message,
    };
  }
}

/**
 * Mengarsipkan master barang (Soft Delete).
 */
export async function archiveItemAction(id: string): Promise<ItemActionResult> {
  await requireAuth();

  try {
    const archived = await archiveItemService(prisma, id);

    revalidatePath("/barang");
    revalidatePath("/");

    return {
      success: true,
      message: `Barang "${archived.name}" (${archived.code}) berhasil diarsipkan.`,
      data: archived,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan server saat mengarsipkan barang.";
    return {
      success: false,
      message,
    };
  }
}

/**
 * Mengaktifkan kembali master barang yang diarsipkan ke katalog aktif.
 */
export async function unarchiveItemAction(id: string): Promise<ItemActionResult> {
  await requireAuth();

  try {
    const restored = await unarchiveItemService(prisma, id);

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
 * Jika memiliki riwayat sirkulasi masa lalu (FK Restrict P2003), otomatis dialihkan ke status Diarsipkan.
 */
export async function deleteItemAction(id: string): Promise<ItemActionResult> {
  await requireAuth();

  try {
    const result = await deleteItemService(prisma, id);

    revalidatePath("/barang");
    revalidatePath("/");

    if (result.isDeletedPermanent) {
      return {
        success: true,
        message: `Barang "${result.item.name}" (${result.item.code}) berhasil dihapus permanen.`,
      };
    } else {
      return {
        success: true,
        message: `Barang "${result.item.name}" (${result.item.code}) memiliki riwayat transaksi sirkulasi masa lalu dan berhasil diarsipkan (soft delete).`,
        data: result.item,
      };
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan server saat memproses penghapusan barang.";
    return {
      success: false,
      message,
    };
  }
}