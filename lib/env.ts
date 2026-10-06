import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET wajib minimal 16 karakter"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Kesalahan konfigurasi variabel lingkungan (.env):", parsedEnv.error.format());
  throw new Error("Konfigurasi variabel lingkungan (.env) tidak valid.");
}

export const env = parsedEnv.data;
