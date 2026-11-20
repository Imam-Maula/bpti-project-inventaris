import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GOOGLE_OAUTH_STATE_COOKIE = "bpti_google_oauth_state";

/**
 * Mengarahkan pengguna ke halaman persetujuan Google OAuth 2.0
 * atau mengaktifkan Simulator Login Google pada mode development bila kredensial OAuth belum diisi.
 */
export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    if (process.env.NODE_ENV === "production") {
      const errorUrl = new URL("/login", request.url);
      errorUrl.searchParams.set(
        "error",
        "Konfigurasi Google OAuth belum diatur pada server."
      );
      return NextResponse.redirect(errorUrl);
    }

    const simUrl = new URL("/login", request.url);
    simUrl.searchParams.set("google_sim", "1");
    return NextResponse.redirect(simUrl);
  }

  const state = randomBytes(24).toString("hex");
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    new URL("/api/auth/google/callback", request.url).toString();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("access_type", "online");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
