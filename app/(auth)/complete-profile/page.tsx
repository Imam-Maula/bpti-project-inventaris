import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { CompleteProfileForm } from "@/components/auth/complete-profile-form";
import { requireAuth } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Lengkapi Profil Civitas — Sistem Inventaris BPTI",
  description: "Lengkapi kategori pengguna, NIDN/NIM/NIP, dan nomor WhatsApp setelah masuk dengan Google",
};

export default async function CompleteProfilePage() {
  const user = await requireAuth();

  if (user.role === Role.ADMIN) {
    redirect("/");
  }

  if (
    user.userCategory &&
    user.identityNumber &&
    user.phone &&
    !user.username.startsWith("google-")
  ) {
    redirect("/barang");
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12 text-foreground sm:px-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-32 items-center justify-center">
            <Image
              src="/bpti-logo.png"
              alt="Logo BPTI UHAMKA"
              width={128}
              height={56}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Lengkapi Identitas Civitas
            </h1>
            <p className="text-sm text-muted-foreground">
              Diperlukan untuk pencatatan peminjaman & Berita Acara BPTI
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
          <CompleteProfileForm
            initialName={user.name}
            email={user.email ?? "-"}
          />
        </div>
      </div>
    </main>
  );
}
