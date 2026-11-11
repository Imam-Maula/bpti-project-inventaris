import { z } from "zod";
import { USER_CATEGORIES } from "@/lib/user-categories";

export const loginSchema = z.object({
  userCategory: z.enum(USER_CATEGORIES),
  identifier: z
    .string()
    .trim()
    .min(1, "NIDN, NIM, NIP, atau username admin wajib diisi")
    .max(50, "ID maksimal 50 karakter"),
  password: z
    .string()
    .min(6, "Password minimal 6 karakter")
    .max(100, "Password maksimal 100 karakter"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerUserSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100).trim(),
  userCategory: z.enum(USER_CATEGORIES),
  identityNumber: z
    .string()
    .trim()
    .min(1, "NIDN, NIM, atau NIP wajib diisi")
    .max(30, "NIDN, NIM, atau NIP maksimal 30 angka")
    .regex(/^\d+$/, "NIDN, NIM, atau NIP hanya boleh berisi angka"),
  email: z.string().email("Format email tidak valid").max(254).trim().toLowerCase(),
  phone: z
    .string()
    .min(8, "Nomor telepon/WhatsApp minimal 8 karakter")
    .max(20, "Nomor telepon/WhatsApp maksimal 20 karakter")
    .regex(
      /^[\d\s+\-()]+$/,
      "Format nomor telepon hanya boleh memuat angka, spasi, dan simbol (+ - ())"
    )
    .trim(),
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(100),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("Format email tidak valid").max(254).trim().toLowerCase(),
  code: z.string().regex(/^\d{6}$/, "Kode OTP harus terdiri dari 6 angka"),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export const requestResetOtpSchema = z.object({
  email: z.string().email("Format email tidak valid").max(254).trim().toLowerCase(),
});

export const verifyResetOtpSchema = z.object({
  email: z.string().email("Format email tidak valid").max(254).trim().toLowerCase(),
  code: z.string().regex(/^\d{6}$/, "Kode OTP harus terdiri dari 6 angka"),
});

export const resetPasswordWithOtpSchema = z
  .object({
    email: z.string().email("Format email tidak valid").max(254).trim().toLowerCase(),
    code: z.string().regex(/^\d{6}$/, "Kode OTP harus terdiri dari 6 angka"),
    newPassword: z.string().min(8, "Kata sandi baru minimal 8 karakter").max(100),
    confirmPassword: z.string().min(8, "Konfirmasi kata sandi minimal 8 karakter").max(100),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi kata sandi tidak cocok dengan kata sandi baru",
  });

export type RequestResetOtpInput = z.infer<typeof requestResetOtpSchema>;
export type VerifyResetOtpInput = z.infer<typeof verifyResetOtpSchema>;
export type ResetPasswordWithOtpInput = z.infer<typeof resetPasswordWithOtpSchema>;
