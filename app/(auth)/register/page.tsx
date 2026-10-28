import type { Metadata } from "next";
import Image from "next/image";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Daftar Pengguna — Sistem Inventaris BPTI",
  description: "Daftar akun pengguna inventaris BPTI",
};

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12 text-foreground sm:px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-32 items-center justify-center">
            <Image src="/bpti-logo.png" alt="Logo BPTI UHAMKA" width={128} height={56}
              className="h-full w-full object-contain" priority />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Daftar Akun Pengguna
            </h1>
            <p className="text-sm text-muted-foreground">
              Sistem Inventaris BPTI UHAMKA
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
