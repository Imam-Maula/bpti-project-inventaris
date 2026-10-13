"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  comparePassword,
  createSession,
  deleteSession,
  verifySession,
} from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";

export interface AuthActionResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Server Action untuk autentikasi login administrator BPTI.
 * Menggunakan perbandingan password bcrypt dan mencetak cookie sesi stateless JWT.
 */
export async function loginAction(
  _prevState: unknown,
  formData: FormData
): Promise<AuthActionResult> {
  const rawData = {
    username: formData.get("username"),
    password: formData.get("password"),
  };

  const validated = loginSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      message: "Data masukan formulir tidak valid.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { username, password } = validated.data;

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    // Gunakan pesan generik untuk mencegah kebocoran informasi validitas username
    if (!user) {
      return {
        success: false,
        message: "Username atau password tidak sesuai.",
      };
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return {
        success: false,
        message: "Username atau password tidak sesuai.",
      };
    }

    await createSession(user.id, user.username, user.name);
  } catch (error) {
    console.error("Kesalahan server saat login:", error);
    return {
      success: false,
      message: "Terjadi kendala pada server saat memproses login.",
    };
  }

  redirect("/");
}

/**
 * Server Action untuk logout administrator dan menghapus cookie sesi.
 */
export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

/**
 * Server Action untuk mengecek sesi aktif saat ini.
 */
export async function getSessionAction() {
  return verifySession();
}