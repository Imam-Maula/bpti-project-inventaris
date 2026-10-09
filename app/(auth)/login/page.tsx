import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { Boxes } from "lucide-react";

export const metadata: Metadata = {
  title: "Masuk Administrator — Sistem Inventaris BPTI",
  description: "Portal masuk administrator Sistem Inventaris Badan Pengembangan Teknologi Informasi",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12 text-foreground sm:px-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Header Identitas BPTI */}
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Sistem Inventaris BPTI
          </h1>
          <p className="text-sm text-muted-foreground">
            Badan Pengembangan Teknologi Informasi
          </p>
        </div>

        {/* Kartu Form Login Solid */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
          <LoginForm />
        </div>

        {/* Footer Hak Cipta & Info */}
        <footer className="text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Badan Pengembangan Teknologi Informasi (BPTI)
        </footer>
      </div>
    </main>
  );
}