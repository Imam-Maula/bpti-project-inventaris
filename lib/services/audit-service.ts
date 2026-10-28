import { PrismaClient, Prisma } from "@prisma/client";

export interface RecordAuditInput {
  action: string;
  entityType: "ITEM" | "BORROW_RECORD" | "SYSTEM";
  entityId: string;
  adminId: string;
  details: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export type AuditLogWithAdmin = Prisma.AuditLogGetPayload<{
  include: {
    admin: {
      select: { id: true; name: true; username: true };
    };
  };
}>;

/**
 * Mencatat entri audit trail secara persisten ke database.
 * Dapat dieksekusi di dalam atau di luar prisma.$transaction.
 */
export async function recordAuditLogService(
  db: PrismaClient | Prisma.TransactionClient,
  input: RecordAuditInput
) {
  return db.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      adminId: input.adminId,
      details: input.details,
      oldValue:
        input.oldValue !== undefined
          ? typeof input.oldValue === "string"
            ? input.oldValue
            : JSON.stringify(input.oldValue)
          : null,
      newValue:
        input.newValue !== undefined
          ? typeof input.newValue === "string"
            ? input.newValue
            : JSON.stringify(input.newValue)
          : null,
    },
  });
}

/**
 * Mengambil daftar catatan audit trail dengan filter pencarian dan relasi admin.
 */
export async function getAuditLogsService(
  db: PrismaClient,
  params?: {
    search?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    adminId?: string;
    limit?: number;
  }
): Promise<AuditLogWithAdmin[]> {
  const where: Prisma.AuditLogWhereInput = {};

  if (params?.entityType) where.entityType = params.entityType;
  if (params?.entityId) where.entityId = params.entityId;
  if (params?.action && params.action !== "ALL") where.action = params.action;
  if (params?.adminId) where.adminId = params.adminId;

  if (params?.search) {
    where.OR = [
      { details: { contains: params.search } },
      { action: { contains: params.search } },
      { entityId: { contains: params.search } },
      { admin: { name: { contains: params.search } } },
      { admin: { username: { contains: params.search } } },
    ];
  }

  return db.auditLog.findMany({
    where,
    include: {
      admin: {
        select: { id: true, name: true, username: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: params?.limit,
  });
}

/**
 * Mengambil histori audit khusus untuk entitas tertentu (misal satu jenis barang).
 */
export async function getAuditLogsByEntityService(
  db: PrismaClient,
  entityType: "ITEM" | "BORROW_RECORD",
  entityId: string,
  limit: number = 20
): Promise<AuditLogWithAdmin[]> {
  return db.auditLog.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      admin: {
        select: { id: true, name: true, username: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
