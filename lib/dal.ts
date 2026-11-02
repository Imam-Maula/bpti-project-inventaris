import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession, SessionPayload } from "@/lib/session";
import { Role } from "@prisma/client";

async function findUserWithRetry(userId: string, maxAttempts = 2) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          isVerified: true,
        },
      });
    } catch (error) {
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      throw error;
    }
  }
}

/**
 * Memastikan sesi pengguna valid untuk operasi Server Actions / Server Components.
 * Melempar error atau redirect jika sesi tidak ditemukan.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }

  let user;
  try {
    user = await findUserWithRetry(session.userId);
  } catch (error) {
    console.error("[DAL requireAuth] Gagal terhubung ke database:", error);
    throw new Error(
      "Tidak dapat terhubung ke server database MySQL (127.0.0.1:3306). Pastikan Laragon/MySQL sudah aktif dan berjalan."
    );
  }

  if (!user || (user.role === Role.USER && !user.isVerified)) {
    redirect("/login");
  }
  return { ...session, ...user };
}

export async function requireRole(role: Role): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.role !== role) {
    redirect(session.role === Role.ADMIN ? "/" : "/barang");
  }
  return session;
}

export async function requireAdmin(): Promise<SessionPayload> {
  return requireRole(Role.ADMIN);
}

/**
 * Mendapatkan profil data admin aktif saat ini secara aman (DTO tanpa password hash).
 * Dibungkus dengan React cache() untuk deduping request dalam 1 siklus render.
 */
export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  try {
    const user = await findUserWithRetry(session.userId);
    return user ?? null;
  } catch (error) {
    console.error("Gagal mengambil data user aktif:", error);
    return null;
  }
});
