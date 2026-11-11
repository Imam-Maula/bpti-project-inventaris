"use server";

import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/dal";
import { hashPassword } from "@/lib/auth";
import {
  createManagedUserSchema,
  updateManagedUserSchema,
  type CreateManagedUserInput,
  type UpdateManagedUserInput,
} from "@/lib/validations/user";
import { recordAuditLogService } from "@/lib/services/audit-service";

export interface UserActionResult {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

const managedUserSelect = {
  id: true,
  username: true,
  name: true,
  email: true,
  phone: true,
  isVerified: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type ManagedUser = Prisma.UserGetPayload<{ select: typeof managedUserSelect }>;

function getSafeUserValues(user: ManagedUser) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    phone: user.phone,
    isVerified: user.isVerified,
  };
}

export async function getManagedUsersAction(): Promise<ManagedUser[]> {
  await requireAdmin();
  return prisma.user.findMany({
    where: { role: Role.USER },
    select: managedUserSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function createManagedUserAction(
  input: CreateManagedUserInput
): Promise<UserActionResult> {
  const admin = await requireAdmin();
  const validated = createManagedUserSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      message: "Data akun tidak valid.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { name, username, email, phone, password } = validated.data;

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          username,
          email,
          phone,
          password: passwordHash,
          role: Role.USER,
          isVerified: true,
        },
        select: managedUserSelect,
      });

      await recordAuditLogService(tx, {
        action: "TAMBAH_AKUN_USER",
        entityType: "USER",
        entityId: created.id,
        adminId: admin.userId,
        details: `Admin membuat akun user "${created.username}" (${created.name}).`,
        newValue: getSafeUserValues(created),
      });

      return created;
    });

    revalidatePath("/pengguna");
    revalidatePath("/aktivitas");
    return {
      success: true,
      message: `Akun "${user.username}" berhasil dibuat.`,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        message: "Username atau email sudah digunakan oleh akun lain.",
      };
    }

    console.error("Kesalahan saat membuat akun user:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server saat membuat akun.",
    };
  }
}

export async function updateManagedUserAction(
  input: UpdateManagedUserInput
): Promise<UserActionResult> {
  const admin = await requireAdmin();
  const validated = updateManagedUserSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      message: "Data perubahan akun tidak valid.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { id, name, username, email, phone, password, isVerified } = validated.data;

  try {
    const passwordHash = password ? await hashPassword(password) : undefined;
    await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({
        where: { id, role: Role.USER },
        select: managedUserSelect,
      });
      if (!existing) {
        throw new Error("USER_ACCOUNT_NOT_FOUND");
      }

      const updated = await tx.user.update({
        where: { id },
        data: {
          name,
          username,
          email,
          phone,
          isVerified,
          ...(passwordHash ? { password: passwordHash } : {}),
        },
        select: managedUserSelect,
      });

      if (existing.email && existing.email !== updated.email) {
        await tx.otpVerification.deleteMany({ where: { email: existing.email } });
        await tx.passwordResetOtp.deleteMany({ where: { email: existing.email } });
      }
      if (updated.isVerified && updated.email) {
        await tx.otpVerification.deleteMany({ where: { email: updated.email } });
      }

      await recordAuditLogService(tx, {
        action: "UBAH_AKUN_USER",
        entityType: "USER",
        entityId: updated.id,
        adminId: admin.userId,
        details: `Admin memperbarui akun user "${updated.username}" (${updated.name}).`,
        oldValue: getSafeUserValues(existing),
        newValue: getSafeUserValues(updated),
      });
    });

    revalidatePath("/pengguna");
    revalidatePath("/aktivitas");
    return { success: true, message: "Data akun berhasil diperbarui." };
  } catch (error) {
    if (error instanceof Error && error.message === "USER_ACCOUNT_NOT_FOUND") {
      return { success: false, message: "Akun user tidak ditemukan." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        message: "Username atau email sudah digunakan oleh akun lain.",
      };
    }

    console.error("Kesalahan saat memperbarui akun user:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server saat memperbarui akun.",
    };
  }
}

export async function deleteManagedUserAction(id: string): Promise<UserActionResult> {
  const admin = await requireAdmin();

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { success: false, message: "ID akun tidak valid." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { id, role: Role.USER },
        select: managedUserSelect,
      });
      if (!user) {
        throw new Error("USER_ACCOUNT_NOT_FOUND");
      }

      await tx.user.delete({ where: { id } });
      if (user.email) {
        await tx.otpVerification.deleteMany({ where: { email: user.email } });
        await tx.passwordResetOtp.deleteMany({ where: { email: user.email } });
      }

      await recordAuditLogService(tx, {
        action: "HAPUS_AKUN_USER",
        entityType: "USER",
        entityId: user.id,
        adminId: admin.userId,
        details: `Admin menghapus akun user "${user.username}" (${user.name}).`,
        oldValue: getSafeUserValues(user),
      });
    });

    revalidatePath("/pengguna");
    revalidatePath("/aktivitas");
    return { success: true, message: "Akun user berhasil dihapus." };
  } catch (error) {
    if (error instanceof Error && error.message === "USER_ACCOUNT_NOT_FOUND") {
      return { success: false, message: "Akun user tidak ditemukan." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return {
        success: false,
        message: "Akun tidak dapat dihapus karena masih terhubung dengan data lain.",
      };
    }

    console.error("Kesalahan saat menghapus akun user:", error);
    return {
      success: false,
      message: "Terjadi kesalahan server saat menghapus akun.",
    };
  }
}
