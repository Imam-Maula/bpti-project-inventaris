"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

interface RootErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    console.error("Root Boundary Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
        Aplikasi Mengalami Kesalahan Fatal
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        Sistem manajemen inventaris BPTI mengalami gangguan tak terduga. Tim pengelola sistem telah mencatat kejadian ini.
      </p>

      {error.digest && (
        /* deslop-ignore-next-line 34 */
        <p className="mt-2 text-xs font-mono text-muted-foreground">
          Incident ID: <span className="font-semibold text-foreground">{error.digest}</span>
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus:outline-hidden focus:ring-1 focus:ring-ring"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Muat Ulang Halaman</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted focus:outline-hidden focus:ring-1 focus:ring-ring"
        >
          <Home className="h-4 w-4" />
          <span>Ke Halaman Utama</span>
        </Link>
      </div>
    </div>
  );
}
