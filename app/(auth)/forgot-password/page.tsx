import type { Metadata } from "next";
import Image from "next/image";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Lupa Kata Sandi — Sistem Inventaris BPTI",
  description: "Pemulihan kata sandi akun inventaris dengan verifikasi One-Time Password (OTP)",
};

export default function ForgotPasswordPage() {
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
              Pemulihan Kata Sandi
            </h1>
            <p className="text-sm text-muted-foreground">
              Verifikasi identitas via One-Time Password (OTP)
            </p>
          </div>
        </div>

        {/* Kartu Form Reset Password */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
          <ForgotPasswordForm />
        </div>

        {/* Footer Hak Cipta & Info */}
        <footer className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Badan Pengembangan Teknologi Informasi (BPTI)
        </footer>
      </div>
    </main>
  );
}

