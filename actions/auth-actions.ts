"use server";

import { redirect } from "next/navigation";
import { randomInt } from "node:crypto";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  comparePassword,
  createSession,
  deleteSession,
  verifySession,
  hashPassword,
} from "@/lib/auth";
import {
  loginSchema,
  registerUserSchema,
  verifyOtpSchema,
  requestResetOtpSchema,
  verifyResetOtpSchema,
  resetPasswordWithOtpSchema,
  type RegisterUserInput,
  type ResetPasswordWithOtpInput,
} from "@/lib/validations/auth";
import { sendOtpEmail, sendPasswordResetOtpEmail } from "@/lib/mail";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginRateLimit,
} from "@/lib/rate-limiter";

export interface AuthActionResult {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  email?: string;
}

/**
 * Server Action untuk autentikasi login administrator BPTI.
 * Dilengkapi proteksi brute-force rate limiter dan pencetakan cookie sesi JWT.
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
  const rateLimitKey = username.toLowerCase();

  // 1. Periksa batas laju percobaan login (Rate Limiting)
  const rateLimitStatus = checkLoginRateLimit(rateLimitKey);
  if (!rateLimitStatus.allowed) {
    const minutesLeft = Math.ceil((rateLimitStatus.retryAfterSeconds || 60) / 60);
    return {
      success: false,
      message: `Terlalu banyak percobaan login gagal. Demi keamanan, silakan coba lagi dalam ${minutesLeft} menit.`,
    };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    // Gunakan pesan generik untuk mencegah kebocoran informasi validitas username
    if (!user) {
      recordFailedLogin(rateLimitKey);
      return {
        success: false,
        message: "Username atau password tidak sesuai.",
      };
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      recordFailedLogin(rateLimitKey);
      return {
        success: false,
        message: "Username atau password tidak sesuai.",
      };
    }

    if (user.role === Role.USER && !user.isVerified) {
      return {
        success: false,
        message: "Akun belum diverifikasi. Silakan selesaikan verifikasi OTP dari email.",
      };
    }

    // Reset percobaan jika login berhasil
    resetLoginRateLimit(rateLimitKey);

    await createSession(user.id, user.username, user.name, user.role, user.email);
  } catch (error) {
    console.error("Kesalahan server saat login:", error);
    return {
      success: false,
      message: "Terjadi kendala pada server saat memproses login.",
    };
  }

  const session = await verifySession();
  redirect(session?.role === Role.ADMIN ? "/" : "/barang");
}

export async function registerUser(
  input: RegisterUserInput
): Promise<AuthActionResult> {
  const validated = registerUserSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      message: "Data pendaftaran tidak valid.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { name, username, email, phone, password } = validated.data;
  const existing = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    select: { id: true },
  });
  if (existing) {
    return {
      success: false,
      message: "Username atau email sudah terdaftar.",
    };
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  let userId: string;

  try {
    const passwordHash = await hashPassword(password);
    userId = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          username,
          email,
          phone,
          password: passwordHash,
          role: Role.USER,
          isVerified: false,
        },
        select: { id: true },
      });
      await tx.otpVerification.upsert({
        where: { email },
        update: { code, attempts: 0, expiresAt },
        create: { email, code, attempts: 0, expiresAt },
      });
      return user.id;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        message: "Username atau email sudah terdaftar.",
      };
    }
    console.error("Kesalahan saat membuat pendaftaran user:", error);
    return {
      success: false,
      message: "Terjadi kendala server saat memproses pendaftaran.",
    };
  }

  try {
    await sendOtpEmail(email, code);
  } catch (error) {
    console.error("Gagal mengirim email OTP:", error);
    await prisma.$transaction([
      prisma.otpVerification.deleteMany({ where: { email } }),
      prisma.user.deleteMany({ where: { id: userId, isVerified: false } }),
    ]);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengirim OTP. Periksa konfigurasi email lalu coba lagi.",
    };
  }

  return {
    success: true,
    email,
    message: "Kode OTP telah dikirim ke email Anda dan berlaku selama 5 menit.",
  };
}

export async function verifyOtp(emailInput: string, codeInput: string): Promise<AuthActionResult> {
  const validated = verifyOtpSchema.safeParse({
    email: emailInput,
    code: codeInput,
  });
  if (!validated.success) {
    return {
      success: false,
      message: validated.error.issues[0]?.message ?? "Kode OTP tidak valid.",
    };
  }

  const { email, code } = validated.data;
  try {
    return await prisma.$transaction(async (tx) => {
      const otp = await tx.otpVerification.findUnique({ where: { email } });
      if (!otp) {
        return {
          success: false,
          message: "Kode OTP tidak ditemukan. Silakan ulangi pendaftaran.",
        };
      }

      const now = new Date();
      if (otp.expiresAt <= now) {
        await tx.otpVerification.deleteMany({ where: { email } });
        return {
          success: false,
          message: "Kode OTP telah kedaluwarsa. Silakan daftar kembali.",
        };
      }
      if (otp.attempts >= 5) {
        return {
          success: false,
          message: "Batas percobaan OTP tercapai. Silakan daftar kembali untuk kode baru.",
        };
      }
      if (otp.code !== code) {
        const attempt = await tx.otpVerification.updateMany({
          where: { email, attempts: { lt: 5 }, expiresAt: { gt: now } },
          data: { attempts: { increment: 1 } },
        });
        return {
          success: false,
          message:
            attempt.count === 0
              ? "Batas percobaan OTP tercapai. Silakan daftar kembali untuk kode baru."
              : "Kode OTP tidak cocok.",
        };
      }

      const consumed = await tx.otpVerification.deleteMany({
        where: { email, code, attempts: { lt: 5 }, expiresAt: { gt: now } },
      });
      if (consumed.count !== 1) {
        return {
          success: false,
          message: "Kode OTP sudah digunakan atau kedaluwarsa.",
        };
      }

      const verified = await tx.user.updateMany({
        where: { email, role: Role.USER },
        data: { isVerified: true },
      });
      if (verified.count === 0) {
        return { success: false, message: "Akun pendaftar tidak ditemukan." };
      }

      return {
        success: true,
        email,
        message: "Email berhasil diverifikasi. Silakan masuk dengan akun Anda.",
      };
    });
  } catch (error) {
    console.error("Kesalahan saat memverifikasi OTP:", error);
    return {
      success: false,
      message: "Terjadi kendala server saat memverifikasi OTP.",
    };
  }
}

/**
 * Server Action: Mengirim kode OTP pemulihan kata sandi ke email pengguna.
 */
export async function requestPasswordResetOtp(emailInput: string): Promise<AuthActionResult> {
  const validated = requestResetOtpSchema.safeParse({ email: emailInput });
  if (!validated.success) {
    return {
      success: false,
      message: validated.error.issues[0]?.message ?? "Format email tidak valid.",
    };
  }

  const { email } = validated.data;

  try {
    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, name: true, isVerified: true },
    });

    if (!user) {
      return {
        success: false,
        message: "Email tidak ditemukan dalam sistem akun inventaris.",
      };
    }

    const code = randomInt(100_000, 1_000_000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    await prisma.passwordResetOtp.upsert({
      where: { email },
      update: { code, attempts: 0, expiresAt },
      create: { email, code, attempts: 0, expiresAt },
    });

    await sendPasswordResetOtpEmail(email, code);

    return {
      success: true,
      email,
      message: "Kode OTP untuk reset kata sandi telah dikirimkan ke email Anda.",
    };
  } catch (error) {
    console.error("Kesalahan saat meminta OTP reset kata sandi:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Terjadi kendala saat mengirimkan OTP.",
    };
  }
}

/**
 * Server Action: Memverifikasi kode OTP reset password.
 */
export async function verifyPasswordResetOtp(
  emailInput: string,
  codeInput: string
): Promise<AuthActionResult> {
  const validated = verifyResetOtpSchema.safeParse({ email: emailInput, code: codeInput });
  if (!validated.success) {
    return {
      success: false,
      message: validated.error.issues[0]?.message ?? "Kode OTP tidak valid.",
    };
  }

  const { email, code } = validated.data;
  const now = new Date();

  try {
    const otp = await prisma.passwordResetOtp.findUnique({ where: { email } });
    if (!otp) {
      return {
        success: false,
        message: "Permintaan OTP reset kata sandi tidak ditemukan atau telah kedaluwarsa.",
      };
    }

    if (otp.expiresAt <= now) {
      await prisma.passwordResetOtp.deleteMany({ where: { email } });
      return {
        success: false,
        message: "Kode OTP telah kedaluwarsa. Silakan minta kode OTP baru.",
      };
    }

    if (otp.attempts >= 5) {
      return {
        success: false,
        message: "Batas percobaan OTP terlampaui. Silakan minta kode OTP baru.",
      };
    }

    if (otp.code !== code) {
      await prisma.passwordResetOtp.updateMany({
        where: { email, attempts: { lt: 5 }, expiresAt: { gt: now } },
        data: { attempts: { increment: 1 } },
      });
      return {
        success: false,
        message: "Kode OTP tidak cocok. Periksa kembali email Anda.",
      };
    }

    return {
      success: true,
      email,
      message: "Kode OTP valid.",
    };
  } catch (error) {
    console.error("Kesalahan verifikasi OTP reset password:", error);
    return {
      success: false,
      message: "Terjadi kesalahan saat memverifikasi kode OTP.",
    };
  }
}

/**
 * Server Action: Memperbarui kata sandi akun dengan kode OTP secara atomik.
 */
export async function resetPasswordWithOtp(
  input: ResetPasswordWithOtpInput
): Promise<AuthActionResult> {
  const validated = resetPasswordWithOtpSchema.safeParse(input);
  if (!validated.success) {
    return {
      success: false,
      message: validated.error.issues[0]?.message ?? "Data reset kata sandi tidak valid.",
      errors: validated.error.flatten().fieldErrors,
    };
  }

  const { email, code, newPassword } = validated.data;
  const now = new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      const otp = await tx.passwordResetOtp.findUnique({ where: { email } });
      if (!otp) {
        return {
          success: false,
          message: "Permintaan OTP tidak ditemukan. Silakan ulangi langkah pemulihan.",
        };
      }

      if (otp.expiresAt <= now) {
        await tx.passwordResetOtp.deleteMany({ where: { email } });
        return {
          success: false,
          message: "Kode OTP telah kedaluwarsa. Silakan minta kode baru.",
        };
      }

      if (otp.attempts >= 5) {
        return {
          success: false,
          message: "Batas percobaan OTP tercapai. Silakan ajukan ulang kode OTP baru.",
        };
      }

      if (otp.code !== code) {
        await tx.passwordResetOtp.updateMany({
          where: { email, attempts: { lt: 5 }, expiresAt: { gt: now } },
          data: { attempts: { increment: 1 } },
        });
        return {
          success: false,
          message: "Kode OTP tidak valid.",
        };
      }

      // Hapus OTP yang sudah dipakai
      await tx.passwordResetOtp.deleteMany({ where: { email, code } });

      // Hash password baru dengan bcrypt
      const passwordHash = await hashPassword(newPassword);

      // Update password user
      const updatedUser = await tx.user.updateMany({
        where: { email },
        data: { password: passwordHash },
      });

      if (updatedUser.count === 0) {
        return {
          success: false,
          message: "Akun dengan email ini tidak ditemukan.",
        };
      }

      return {
        success: true,
        email,
        message: "Kata sandi Anda berhasil diperbarui. Silakan masuk menggunakan kata sandi baru.",
      };
    });
  } catch (error) {
    console.error("Kesalahan saat mereset kata sandi dengan OTP:", error);
    return {
      success: false,
      message: "Terjadi kendala pada server saat memperbarui kata sandi.",
    };
  }
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
