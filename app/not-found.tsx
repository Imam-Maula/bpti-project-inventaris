import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
        <FileQuestion className="h-7 w-7" />
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
        Halaman Tidak Ditemukan (404)
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
        Tautan yang Anda tuju mungkin telah dipindahkan, dihapus, atau tidak pernah ada di sistem inventaris BPTI.
      </p>

      <div className="mt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus:outline-hidden focus:ring-1 focus:ring-ring"
        >
          <Home className="h-3.5 w-3.5" />
          <span>Kembali ke Dasbor Utama</span>
        </Link>
      </div>
    </div>
  );
}
