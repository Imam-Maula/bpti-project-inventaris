import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "bpti_session";

async function isSessionValid(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;

  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  try {
    const secretKey = new TextEncoder().encode(secret);
    await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasValidSession = await isSessionValid(request);

  // Jika mengakses halaman login tetapi sudah login -> alihkan ke dashboard (/)
  if (pathname === "/login") {
    if (hasValidSession) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Jika mengakses halaman dashboard/master/sirkulasi tetapi belum login -> alihkan ke /login
  if (!hasValidSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match semua rute kecuali file aset statis dan metadata browser:
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
