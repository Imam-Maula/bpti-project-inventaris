import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession, SessionPayload } from "@/lib/session";

/**
 * Memastikan sesi pengguna valid untuk operasi Server Actions / Server Components.
 * Melempar error atau redirect jika sesi tidak ditemukan.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

/**
 * Mendapatkan profil data admin aktif saat ini secara aman (DTO tanpa password hash).
 * Dibungkus dengan React cache() untuk deduping request dalam 1 siklus render.
 */
export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
      },
    });
    return user;
  } catch (error) {
    console.error("Gagal mengambil data user aktif:", error);
    return null;
  }
});
