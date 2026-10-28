"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/dal";
import {
  getAuditLogsService,
  getAuditLogsByEntityService,
  AuditLogWithAdmin,
} from "@/lib/services/audit-service";

/**
 * Mengambil daftar catatan log audit sistem BPTI (terproteksi sesi admin).
 */
export async function getAuditLogsAction(params?: {
  search?: string;
  entityType?: string;
  action?: string;
  limit?: number;
}): Promise<AuditLogWithAdmin[]> {
  await requireAuth();
  return getAuditLogsService(prisma, params);
}

/**
 * Mengambil riwayat log audit khusus untuk suatu barang master tertentu.
 */
export async function getItemAuditLogsAction(
  itemId: string
): Promise<AuditLogWithAdmin[]> {
  await requireAuth();
  return getAuditLogsByEntityService(prisma, "ITEM", itemId);
}
