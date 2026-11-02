"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { Role } from "@prisma/client";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Ringkasan Dasbor",
    description: "Statistik aset inventaris dan aktivitas sirkulasi BPTI",
  },
  "/barang": {
    title: "Master Barang",
    description: "Data aset, kategori, kondisi fisik, dan ketersediaan unit",
  },
  "/riwayat": {
    title: "Riwayat Peminjaman",
    description: "Status pengajuan dan riwayat peminjaman aset",
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
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <div className="pl-10 lg:pl-0">
        <h1 className="text-xl font-semibold text-foreground leading-tight">
          {current.title}
        </h1>
        <p className="hidden text-xs text-muted-foreground sm:block">
          {current.description}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Toggle Dark/Light Mode */}
        <ThemeToggle />

        {/* Info Sesi Administrator */}
        <div className="flex items-center gap-2 border-l border-border pl-3 text-xs">
          <span className="font-medium text-foreground">
            {name}
          </span>
          <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
            {role === Role.ADMIN ? "Admin" : "User"}
          </span>
        </div>
      </div>
    </header>
  );
}
