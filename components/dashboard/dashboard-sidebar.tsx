"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { logoutAction } from "@/actions/auth-actions";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Boxes,
  LogOut,
  ShieldCheck,
  Menu,
  X,
  Loader2,
} from "lucide-react";

const navigationItems = [
  {
    name: "Ringkasan Dasbor",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Master Barang",
    href: "/barang",
    icon: Package,
  },
  {
    name: "Sirkulasi Peminjaman",
    href: "/sirkulasi",
    icon: ArrowLeftRight,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-sidebar text-sidebar-foreground">
      {/* Brand Header */}
      <div>
        <div className="flex items-center gap-3 border-b border-sidebar-border px-6 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
              Inventaris BPTI
            </span>
            <p className="truncate text-xs text-muted-foreground" title="Badan Pengembangan Teknologi Informasi">
              Badan Pengemb. Tek. Informasi
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="px-3 py-4">
          <p className="px-3 pb-2 text-xs font-medium text-muted-foreground">
            Menu Utama
          </p>
          <nav className="space-y-1" aria-label="Sidebar Navigation">
            {navigationItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Info & Logout Button */}
      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 flex items-center gap-2.5 rounded-md border border-sidebar-border/50 bg-sidebar-accent/50 p-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-sidebar-foreground">
              Administrator BPTI
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              Sesi Terverifikasi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-destructive transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive focus:outline-hidden focus:ring-1 focus:ring-destructive/30 disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          <span>{isPending ? "Keluar..." : "Keluar Sesi"}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="fixed top-3 left-3 z-50 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background p-1.5 text-foreground hover:bg-muted"
          aria-label="Toggle Navigation Menu"
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile Overlay & Drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-sidebar-border transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
