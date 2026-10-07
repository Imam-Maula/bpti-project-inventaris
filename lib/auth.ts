import "server-only";
import bcrypt from "bcryptjs";
import {
  createSession,
  verifySession,
  deleteSession,
  encrypt,
  decrypt,
  type SessionPayload,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

const SALT_ROUNDS = 12;

/**
 * Melakukan hashing password menggunakan algoritma Bcrypt dengan 12 putaran garam (salt).
 */
export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, SALT_ROUNDS);
}

/**
 * Membandingkan password teks polos dengan password hash Bcrypt secara aman terhadap timing attack.
 */
export async function comparePassword(
  plainText: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainText, hashedPassword);
}

export {
  createSession,
  verifySession,
  deleteSession,
  encrypt,
  decrypt,
  SESSION_COOKIE_NAME,
  type SessionPayload,
};
