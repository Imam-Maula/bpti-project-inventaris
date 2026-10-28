import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "bpti_session";

async function getSessionRole(request: NextRequest): Promise<"ADMIN" | "USER" | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  try {
    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    return payload.role === "ADMIN" || payload.role === "USER" ? payload.role : null;
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const role = await getSessionRole(request);

  if (pathname === "/login" || pathname === "/register") {
    if (role) {
      return NextResponse.redirect(
        new URL(role === "ADMIN" ? "/" : "/barang", request.url)
      );
    }
    return NextResponse.next();
  }

  if (!role) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (role === "USER" && pathname === "/") {
    return NextResponse.redirect(new URL("/barang", request.url));
  }
  if (
    role === "USER" &&
    (pathname === "/aktivitas" || pathname.startsWith("/sirkulasi"))
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
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
