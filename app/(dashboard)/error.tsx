"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    // Log kesalahan untuk audit internal
    console.error("Dashboard Boundary Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>

      <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
        Terjadi Gangguan pada Layanan
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        Sistem tidak dapat memproses data inventaris saat ini. Hal ini dapat disebabkan oleh gangguan koneksi basis data atau parameter query yang tidak valid.
      </p>

      {error.digest && (
        /* deslop-ignore-next-line 34 */
        <p className="mt-2 text-xs font-mono text-muted-foreground/80">
          Kode referensi insiden: <span className="font-semibold text-foreground">{error.digest}</span>
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus:outline-hidden focus:ring-1 focus:ring-ring"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Coba Muat Ulang</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-xs font-medium text-foreground hover:bg-muted focus:outline-hidden focus:ring-1 focus:ring-ring"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>
    </div>
  );
}
