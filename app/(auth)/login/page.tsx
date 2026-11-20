import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Masuk — Sistem Inventaris BPTI",
  description: "Portal masuk Sistem Inventaris Badan Pengembangan Teknologi Informasi",
};

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    verified?: string;
    google_sim?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const initialError = typeof params.error === "string" ? params.error : undefined;
  const isVerifiedNotice = params.verified === "1";
  const hasGoogleOAuthEnv = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
  const showGoogleSimulator =
    params.google_sim === "1" &&
    process.env.NODE_ENV !== "production" &&
    !hasGoogleOAuthEnv;

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12 text-foreground sm:px-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Header Identitas BPTI */}
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-32 items-center justify-center">
            <Image
              src="/bpti-logo.png"
              alt="Logo BPTI Uhamka"
              width={128}
              height={56}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Sistem Inventaris BPTI
            </h1>
            <p className="text-sm text-muted-foreground">
              Badan Pengembangan Teknologi Informasi
            </p>
          </div>
        </div>

        {/* Kartu Form Login Solid */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
          <LoginForm
            initialError={initialError}
            isVerifiedNotice={isVerifiedNotice}
            showGoogleSimulator={showGoogleSimulator}
          />
        </div>

        {/* Footer Hak Cipta & Info */}
        <footer className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Badan Pengembangan Teknologi Informasi (BPTI)
        </footer>
      </div>
    </main>
  );
}