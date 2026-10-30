"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { Role } from "@prisma/client";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Ringkasan Dasbor",
    description: "Statistik aset inventaris dan aktivitas sirkulasi",
  },
  "/barang": {
    title: "Master Barang",
    description: "Data aset, kategori, kondisi fisik, dan ketersediaan unit",
  },
  "/riwayat": {
    title: "Riwayat Peminjaman",
    description: "Status pengajuan dan riwayat peminjaman Anda",
  },
  "/sirkulasi": {
    title: "Sirkulasi Peminjaman",
    description: "Pencatatan peminjaman dan pengembalian aset",
  },
  "/aktivitas": {
    title: "Log Aktivitas & Audit Trail",
    description: "Rekam jejak kronologis dan transparansi riwayat perubahan data master aset serta transaksi sirkulasi BPTI.",
  },
};

export function DashboardHeader({ role, name }: { role: Role; name: string }) {
  const pathname = usePathname();
  const current = pageTitles[pathname] || {
    title: "Administrasi",
    description: "Sistem Manajemen Inventaris BPTI",
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <div className="pl-10 lg:pl-0">
        <span className="block text-sm font-semibold text-foreground sm:text-base">
          {current.title}
        </span>
        <p className="hidden text-xs text-muted-foreground sm:block">
          {current.description}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Toggle Dark/Light Mode */}
        <ThemeToggle />

        {/* Info Sesi Administrator */}
        <div className="flex items-center gap-2 border-l border-border pl-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {name} · {role === Role.ADMIN ? "Admin" : "User"}
          </span>
        </div>
      </div>
    </header>
  );
}
