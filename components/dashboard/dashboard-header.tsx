"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Ringkasan Dasbor",
    description: "Statistik aset inventaris dan aktivitas sirkulasi",
  },
  "/barang": {
    title: "Master Barang",
    description: "Data aset, kategori, kondisi fisik, dan ketersediaan unit",
  },
  "/sirkulasi": {
    title: "Sirkulasi Peminjaman",
    description: "Pencatatan peminjaman dan pengembalian aset",
  },
};

export function DashboardHeader() {
  const pathname = usePathname();
  const current = pageTitles[pathname] || {
    title: "Administrasi",
    description: "Sistem Manajemen Inventaris BPTI",
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background px-6">
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
          <span className="font-medium text-foreground">Admin</span>
        </div>
      </div>
    </header>
  );
}
