import type { Metadata } from "next";
import Link from "next/link";
import {
  getCirculationMetricsAction,
  getBorrowRecordsAction,
} from "@/actions/borrow-actions";
import { getItemsAction } from "@/actions/item-actions";
import {
  Boxes,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Plus,
  ArrowLeftRight,
  Package,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Ringkasan Dasbor — BPTI Inventaris",
  description: "Ikhtisar metrik aset dan sirkulasi peminjaman BPTI",
};

export default async function DashboardPage() {
  const [metrics, recentRecords, allItems] = await Promise.all([
    getCirculationMetricsAction(),
    getBorrowRecordsAction(),
    getItemsAction(),
  ]);

  // Ambil 5 transaksi sirkulasi terbaru
  const latestCirculation = recentRecords.slice(0, 5);

  // Aset dengan ketersediaan unit kritis (stok habis atau tersisa <= 1)
  const criticalItems = allItems
    .filter((item) => item.availableQuantity <= 1)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Halaman & Aksi Cepat */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Ringkasan Dasbor
          </h1>
          <p className="text-sm text-muted-foreground">
            Ikhtisar statistik aset, sirkulasi peminjaman aktif, dan aktivitas terkini BPTI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/barang"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-2xs hover:bg-muted focus:outline-hidden"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Barang</span>
          </Link>
          <Link
            href="/sirkulasi"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus:outline-hidden"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Catat Peminjaman</span>
          </Link>
        </div>
      </div>

      {/* Grid 4 Kartu Metrik Statistik (Solid, High-Contrast, Anti-Slop) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metrik 1: Total Master Aset */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Master Aset
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
              <Boxes className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground">
              {metrics.totalItem}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Jenis barang terdaftar di inventaris
            </p>
          </div>
        </div>

        {/* Metrik 2: Sedang Dipinjam */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Sedang Dipinjam
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground">
              {metrics.totalDipinjam}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Transaksi peminjaman aktif saat ini
            </p>
          </div>
        </div>

        {/* Metrik 3: Lewat Tenggat Waktu */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Lewat Tenggat (Overdue)
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-md ${
                metrics.totalTerlambat > 0
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-bold ${
                metrics.totalTerlambat > 0
                  ? "text-destructive"
                  : "text-foreground"
              }`}
            >
              {metrics.totalTerlambat}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Perlu konfirmasi tindak lanjut staf
            </p>
          </div>
        </div>

        {/* Metrik 4: Total Selesai Dikembalikan */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Selesai Dikembalikan
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground">
              {metrics.totalDikembalikan}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Total sirkulasi sukses tuntas
            </p>
          </div>
        </div>
      </div>

      {/* Grid Dua Kolom: Sirkulasi Terkini & Aset Kritis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom Kiri (2/3): Aktivitas Sirkulasi Terkini */}
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Aktivitas Sirkulasi Terkini
              </h2>
              <p className="text-xs text-muted-foreground">
                Daftar transaksi peminjaman terbaru yang tercatat di sistem
              </p>
            </div>
            <Link
              href="/sirkulasi"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
            {latestCirculation.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <ArrowLeftRight className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
                Belum ada aktivitas sirkulasi yang tercatat.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {latestCirculation.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex flex-col gap-2 p-4 text-xs sm:flex-row sm:items-center sm:justify-between hover:bg-muted/30"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium text-foreground">
                        {rec.item.name} &bull;{" "}
                        <span className="font-normal text-muted-foreground">
                          {rec.borrowQuantity} unit
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Peminjam:{" "}
                        <span className="text-foreground">
                          {rec.borrowerName}
                        </span>{" "}
                        &bull; Kode:{" "}
                        <span className="font-mono text-foreground">
                          {rec.borrowCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        Tenggat:{" "}
                        {new Date(rec.dueDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      {rec.status === "DIPINJAM" ? (
                        <span className="rounded border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-400">
                          Dipinjam
                        </span>
                      ) : (
                        <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                          Dikembalikan
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan (1/3): Aset Kritis / Stok Menipis */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Status Stok Kritis
              </h2>
              <p className="text-xs text-muted-foreground">
                Barang dengan unit siap pakai habis/rendah
              </p>
            </div>
            <Link
              href="/barang"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <span>Katalog</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
            {criticalItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <Package className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
                Semua barang memiliki stok siap pakai yang cukup.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {criticalItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3.5 text-xs hover:bg-muted/30"
                  >
                    <div>
                      <div className="font-medium text-foreground">
                        {item.name}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground">
                        {item.code} &bull; {item.location}
                      </div>
                    </div>
                    <span
                      className={`font-mono text-xs font-semibold ${
                        item.availableQuantity === 0
                          ? "text-destructive"
                          : "text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      Sisa {item.availableQuantity} unit
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}