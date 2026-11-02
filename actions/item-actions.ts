"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Condition, ItemStatus, Item } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/dal";
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
  bulkArchiveItemsService,
  bulkUnarchiveItemsService,
} from "@/lib/services/item-service";
import { recordAuditLogService } from "@/lib/services/audit-service";

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
): Promise<ItemActionResult<Item>> {
  const session = await requireAdmin();

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

    await recordAuditLogService(prisma, {
      action: "TAMBAH_BARANG",
      entityType: "ITEM",
      entityId: newItem.id,
      adminId: session.userId,
      details: `Menambahkan aset baru: "${newItem.name}" (${newItem.code}) sejumlah ${newItem.totalQuantity} unit di ${newItem.location}.`,
      newValue: newItem,
    });

    revalidatePath("/barang");
    revalidatePath("/aktivitas");
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
): Promise<ItemActionResult<Item>> {
  const session = await requireAdmin();

  const validated = updateItemSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      message: "Data pembaruan barang tidak valid.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  try {
    const existing = await getItemByIdService(prisma, validated.data.id);
    const updated = await updateItemAtomicService(prisma, validated.data);

    await recordAuditLogService(prisma, {
      action: "UBAH_BARANG",
      entityType: "ITEM",
      entityId: updated.id,
      adminId: session.userId,
      details: `Memperbarui aset "${updated.name}" (${updated.code}): Total ${updated.totalQuantity} unit di lokasi ${updated.location}.`,
      oldValue: existing,
      newValue: updated,
    });

    revalidatePath("/barang");
    revalidatePath("/sirkulasi");
    revalidatePath("/aktivitas");
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
  const session = await requireAdmin();

  try {
    const updated = await restoreQuarantinedItemService(prisma, id, quantityToRestore);

    await recordAuditLogService(prisma, {
      action: "PULIHKAN_KARANTINA",
      entityType: "ITEM",
      entityId: updated.id,
      adminId: session.userId,
      details: `Memulihkan ${quantityToRestore} unit aset "${updated.name}" (${updated.code}) dari karantina ke stok siap pakai.`,
      newValue: {
        id: updated.id,
        name: updated.name,
        code: updated.code,
        quantityRestored: quantityToRestore,
        availableQuantity: updated.availableQuantity,
        heavyDamageQuantity: updated.heavyDamageQuantity,
      },
    });

    revalidatePath("/barang");
    revalidatePath("/sirkulasi");
    revalidatePath("/aktivitas");
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
  const session = await requireAdmin();

  try {
    const archived = await archiveItemService(prisma, id);

    await recordAuditLogService(prisma, {
      action: "ARSIPKAN_BARANG",
      entityType: "ITEM",
      entityId: archived.id,
      adminId: session.userId,
      details: `Mengarsipkan aset "${archived.name}" (${archived.code}) ke daftar arsip.`,
      newValue: {
        id: archived.id,
        name: archived.name,
        code: archived.code,
        status: archived.status,
      },
    });

    revalidatePath("/barang");
    revalidatePath("/aktivitas");
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
  const session = await requireAdmin();

  try {
    const restored = await unarchiveItemService(prisma, id);

    await recordAuditLogService(prisma, {
      action: "AKTIFKAN_BARANG",
      entityType: "ITEM",
      entityId: restored.id,
      adminId: session.userId,
      details: `Mengaktifkan kembali aset "${restored.name}" (${restored.code}) ke katalog aktif.`,
      newValue: {
        id: restored.id,
        name: restored.name,
        code: restored.code,
        status: restored.status,
      },
    });

    revalidatePath("/barang");
    revalidatePath("/aktivitas");
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
  const session = await requireAdmin();

  try {
    const result = await deleteItemService(prisma, id);

    await recordAuditLogService(prisma, {
      action: result.isDeletedPermanent ? "HAPUS_PERMANEN" : "ARSIPKAN_OTOMATIS",
      entityType: "ITEM",
      entityId: result.item.id,
      adminId: session.userId,
      details: result.isDeletedPermanent
        ? `Menghapus permanen aset "${result.item.name}" (${result.item.code}) beserta seluruh spesifikasinya.`
        : `Aset "${result.item.name}" (${result.item.code}) dialihkan menjadi arsip karena memiliki riwayat sirkulasi masa lalu.`,
      oldValue: result.item,
    });

    revalidatePath("/barang");
    revalidatePath("/aktivitas");
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

/**
 * Mengarsipkan banyak master barang sekaligus (Bulk Archive).
 */
export async function bulkArchiveItemsAction(
  ids: string[]
): Promise<ItemActionResult<{ count: number }>> {
  const session = await requireAdmin();

  try {
    const count = await bulkArchiveItemsService(prisma, ids);

    await recordAuditLogService(prisma, {
      action: "ARSIPKAN_MASSAL",
      entityType: "ITEM",
      entityId: "BULK_ACTION",
      adminId: session.userId,
      details: `Mengarsipkan ${count} barang secara massal.`,
      newValue: { count, targetIds: ids },
    });

    revalidatePath("/barang");
    revalidatePath("/aktivitas");
    revalidatePath("/");

    return {
      success: true,
      message: `${count} barang berhasil diarsipkan secara massal.`,
      data: { count },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan server saat mengarsipkan barang massal.";
    return {
      success: false,
      message,
    };
  }
}

/**
 * Mengaktifkan kembali banyak master barang yang diarsipkan sekaligus (Bulk Unarchive).
 */
export async function bulkUnarchiveItemsAction(
  ids: string[]
): Promise<ItemActionResult<{ count: number }>> {
  const session = await requireAdmin();

  try {
    const count = await bulkUnarchiveItemsService(prisma, ids);

    await recordAuditLogService(prisma, {
      action: "AKTIFKAN_MASSAL",
      entityType: "ITEM",
      entityId: "BULK_ACTION",
      adminId: session.userId,
      details: `Mengaktifkan kembali ${count} barang secara massal ke katalog aktif.`,
      newValue: { count, targetIds: ids },
    });

    revalidatePath("/barang");
    revalidatePath("/aktivitas");
    revalidatePath("/");

    return {
      success: true,
      message: `${count} barang berhasil diaktifkan kembali ke katalog aktif.`,
      data: { count },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan server saat mengaktifkan barang massal.";
    return {
      success: false,
      message,
    };
  }
}