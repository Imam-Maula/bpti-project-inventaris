import { z } from "zod";

const nameSchema = z.string().min(2, "Nama minimal 2 karakter").max(100).trim();
const usernameSchema = z
  .string()
  .min(3, "Username minimal 3 karakter")
  .max(50, "Username maksimal 50 karakter")
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "Username hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung"
  )
  .trim();
const emailSchema = z
  .string()
  .email("Format email tidak valid")
  .max(254, "Email maksimal 254 karakter")
  .trim()
  .toLowerCase();
const phoneSchema = z
  .string()
  .min(8, "Nomor telepon minimal 8 karakter")
  .max(20, "Nomor telepon maksimal 20 karakter")
  .regex(
    /^[\d\s+\-()]+$/,
    "Format nomor telepon hanya boleh memuat angka, spasi, dan simbol (+ - ())"
  )
  .trim();

export const createManagedUserSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(100),
});

export const updateManagedUserSchema = z.object({
  id: z.string().uuid("ID akun tidak valid"),
  name: nameSchema,
  username: usernameSchema,
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    emailSchema.nullable()
  ),
  phone: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    phoneSchema.nullable()
  ),
  password: z.union([z.literal(""), z.string().min(8, "Kata sandi minimal 8 karakter").max(100)]),
  isVerified: z.boolean(),
});

export type CreateManagedUserInput = z.infer<typeof createManagedUserSchema>;
export type UpdateManagedUserInput = z.infer<typeof updateManagedUserSchema>;
