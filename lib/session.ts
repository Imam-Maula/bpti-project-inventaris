import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { Role } from "@prisma/client";

export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  role: Role;
  email?: string | null;
  expiresAt: Date;
}

const secretKey = new TextEncoder().encode(env.SESSION_SECRET);
export const SESSION_COOKIE_NAME = "bpti_session";

export async function encrypt(payload: Omit<SessionPayload, "expiresAt"> & { expiresAt?: Date }): Promise<string> {
  const expiresAt = payload.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return new SignJWT({ ...payload, expiresAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

const revokedTokens = new Set<string>();

export async function decrypt(token?: string): Promise<SessionPayload | null> {
  if (!token || revokedTokens.has(token)) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });
    if (
      typeof payload.userId !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.name !== "string" ||
      (payload.role !== "ADMIN" && payload.role !== "USER")
    ) {
      return null;
    }
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(
  userId: string,
  username: string,
  name: string,
  role: Role,
  email?: string | null
): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = await encrypt({ userId, username, name, role, email, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return decrypt(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    revokedTokens.add(token);
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}
