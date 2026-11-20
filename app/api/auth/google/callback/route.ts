import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";

const GOOGLE_OAUTH_STATE_COOKIE = "bpti_google_oauth_state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailCheckSchema = z.string().email().max(254).trim().toLowerCase();

function buildLoginErrorResponse(requestUrl: string, message: string) {
  const loginUrl = new URL("/login", requestUrl);
  loginUrl.searchParams.set("error", message);
  const response = NextResponse.redirect(loginUrl);
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  return response;
}

function isAllowedGoogleDomain(email: string): boolean {
  const rawDomains = process.env.GOOGLE_ALLOWED_DOMAINS?.trim();
  if (!rawDomains) return true;

  const allowedDomains = rawDomains
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  if (allowedDomains.length === 0) return true;

  const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
  return allowedDomains.includes(emailDomain);
}

interface GoogleProfile {
  email: string;
  name: string;
}

async function resolveSimulatorProfile(
  url: URL
): Promise<{ profile?: GoogleProfile; error?: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (process.env.NODE_ENV === "production" || (clientId && clientSecret)) {
    return {
      error: "Mode simulator Google OAuth tidak tersedia pada konfigurasi ini.",
    };
  }

  const parsedEmail = emailCheckSchema.safeParse(url.searchParams.get("email") ?? "");
  if (!parsedEmail.success) {
    return { error: "Format email akun Google simulator tidak valid." };
  }

  const rawName = (url.searchParams.get("name") ?? "").trim();
  const fallbackName = parsedEmail.data.split("@")[0] || "Pengguna Google";
  const displayName = (rawName.length >= 2 ? rawName : fallbackName).slice(0, 100);

  return {
    profile: {
      email: parsedEmail.data,
      name: displayName,
    },
  };
}

async function resolveOAuthProfile(
  url: URL,
  requestUrl: string
): Promise<{ profile?: GoogleProfile; error?: string }> {
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    return {
      error: "Masuk dengan akun Google dibatalkan atau ditolak oleh pengguna.",
    };
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const savedState = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (!code || !state || !savedState || state !== savedState) {
    return {
      error: "Sesi otentikasi Google tidak valid atau sudah kedaluwarsa.",
    };
  }

  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return { error: "Konfigurasi Google OAuth belum lengkap pada server." };
  }

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    new URL("/api/auth/google/callback", requestUrl).toString();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return { error: "Gagal menukar kode otorisasi dengan Google." };
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    return { error: "Token akses Google tidak diterima." };
  }

  const userInfoRes = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }
  );

  if (!userInfoRes.ok) {
    return { error: "Gagal mengambil informasi profil akun Google." };
  }

  const userInfo = (await userInfoRes.json()) as {
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (!userInfo.email || userInfo.email_verified === false) {
    return { error: "Email pada akun Google belum terverifikasi." };
  }

  const parsedEmail = emailCheckSchema.safeParse(userInfo.email);
  if (!parsedEmail.success) {
    return { error: "Alamat email akun Google tidak valid." };
  }

  const rawName = (userInfo.name ?? "").trim();
  const fallbackName = parsedEmail.data.split("@")[0] || "Pengguna Google";

  return {
    profile: {
      email: parsedEmail.data,
      name: (rawName.length >= 2 ? rawName : fallbackName).slice(0, 100),
    },
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const isSimulator = url.searchParams.get("sim") === "1";

  let profile: GoogleProfile | undefined;
  let failureMessage: string | undefined;

  try {
    const resolved = isSimulator
      ? await resolveSimulatorProfile(url)
      : await resolveOAuthProfile(url, request.url);

    profile = resolved.profile;
    failureMessage = resolved.error;
  } catch (error) {
    console.error("[Google OAuth Callback] Kesalahan verifikasi OAuth:", error);
    failureMessage = "Terjadi kendala saat menghubungkan ke layanan Google.";
  }

  if (!profile) {
    return buildLoginErrorResponse(
      request.url,
      failureMessage ?? "Otentikasi Google gagal."
    );
  }

  if (!isAllowedGoogleDomain(profile.email)) {
    return buildLoginErrorResponse(
      request.url,
      "Domain email Google Anda tidak diizinkan untuk mengakses sistem ini."
    );
  }

  let destination = "/barang";

  try {
    let user = await prisma.user.findUnique({
      where: { email: profile.email },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        email: true,
        isVerified: true,
        userCategory: true,
        identityNumber: true,
        phone: true,
      },
    });

    if (!user) {
      const generatedUsername = `google-${randomBytes(6).toString("hex")}`;
      const passwordHash = await hashPassword(randomBytes(24).toString("hex"));

      try {
        user = await prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            username: generatedUsername,
            password: passwordHash,
            role: Role.USER,
            isVerified: true,
          },
          select: {
            id: true,
            username: true,
            name: true,
            role: true,
            email: true,
            isVerified: true,
            userCategory: true,
            identityNumber: true,
            phone: true,
          },
        });
      } catch (createError) {
        if (
          createError instanceof Prisma.PrismaClientKnownRequestError &&
          createError.code === "P2002"
        ) {
          user = await prisma.user.findUnique({
            where: { email: profile.email },
            select: {
              id: true,
              username: true,
              name: true,
              role: true,
              email: true,
              isVerified: true,
              userCategory: true,
              identityNumber: true,
              phone: true,
            },
          });
        } else {
          throw createError;
        }
      }
    } else if (!user.isVerified) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          email: true,
          isVerified: true,
          userCategory: true,
          identityNumber: true,
          phone: true,
        },
      });
    }

    if (!user) {
      return buildLoginErrorResponse(
        request.url,
        "Gagal memproses akun pengguna Google."
      );
    }

    await createSession(
      user.id,
      user.username,
      user.name,
      user.role,
      user.email
    );

    if (user.role === Role.ADMIN) {
      destination = "/";
    } else if (!user.userCategory || !user.identityNumber || !user.phone) {
      destination = "/complete-profile";
    } else {
      destination = "/barang";
    }
  } catch (error) {
    console.error("[Google OAuth Callback] Kesalahan database:", error);
    return buildLoginErrorResponse(
      request.url,
      "Gagal terhubung ke database saat memproses akun Google."
    );
  }

  redirect(destination);
}
