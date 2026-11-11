import { z } from "zod";
import { USER_CATEGORIES } from "@/lib/user-categories";

const nameSchema = z.string().min(2, "Nama minimal 2 karakter").max(100).trim();
const userCategorySchema = z.enum(USER_CATEGORIES);
const identityNumberSchema = z
  .string()
  .trim()
  .min(1, "NIDN, NIM, atau NIP wajib diisi")
  .max(30, "NIDN, NIM, atau NIP maksimal 30 angka")
  .regex(/^\d+$/, "NIDN, NIM, atau NIP hanya boleh berisi angka");
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
  userCategory: userCategorySchema,
  identityNumber: identityNumberSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: z.string().min(8, "Kata sandi minimal 8 karakter").max(100),
});

export const updateManagedUserSchema = z.object({
  id: z.string().uuid("ID akun tidak valid"),
  name: nameSchema,
  userCategory: userCategorySchema,
  identityNumber: identityNumberSchema,
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
