import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "bpti_session";

async function getSessionInfo(
  request: NextRequest
): Promise<{ role: "ADMIN" | "USER"; username: string } | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    if (
      (payload.role === "ADMIN" || payload.role === "USER") &&
      typeof payload.username === "string"
    ) {
      return { role: payload.role, username: payload.username };
    }
    return null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSessionInfo(request);

  if (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password"
  ) {
    if (session) {
      if (session.role === "USER" && session.username.startsWith("google-")) {
        return NextResponse.redirect(new URL("/complete-profile", request.url));
      }
      return NextResponse.redirect(
        new URL(session.role === "ADMIN" ? "/" : "/barang", request.url)
      );
    }
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    session.role === "USER" &&
    session.username.startsWith("google-") &&
    pathname !== "/complete-profile"
  ) {
    return NextResponse.redirect(new URL("/complete-profile", request.url));
  }

  if (session.role === "USER" && pathname === "/") {
    return NextResponse.redirect(new URL("/barang", request.url));
  }
  if (
    session.role === "USER" &&
    (pathname === "/aktivitas" ||
      pathname.startsWith("/sirkulasi") ||
      pathname.startsWith("/pengguna"))
  ) {
    return NextResponse.redirect(new URL("/barang", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match semua rute kecuali file aset statis dan metadata browser:
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|map)$).*)",
  ],
};
