import type { Metadata } from "next";
import { BorrowStatus, Role } from "@prisma/client";
import { getUserBorrowRecordsAction } from "@/actions/borrow-actions";
import { requireRole } from "@/lib/dal";
import { RejectionReasonDialog } from "@/components/borrow/rejection-reason-dialog";
import { AlertCircle, CheckCircle2, Clock, PackageCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Riwayat Peminjaman — BPTI Inventaris",
  description: "Daftar dan status pengajuan peminjaman barang inventaris Anda.",
};

const statusLabels: Record<BorrowStatus, string> = {
  PENDING: "Menunggu persetujuan",
  APPROVED: "Disetujui — menunggu diambil",
  DIPINJAM: "Sedang dipinjam",
  DIKEMBALIKAN: "Dikembalikan",
  DITOLAK: "Ditolak",
  TERLAMBAT: "Terlambat",
};

export default async function RiwayatPage() {
  await requireRole(Role.USER);
  const records = await getUserBorrowRecordsAction();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Riwayat Peminjaman
        </h1>
        <p className="text-sm text-muted-foreground">
          Pantau status semua pengajuan peminjaman yang Anda kirim.
        </p>
      </div>

      {records.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Anda belum memiliki pengajuan peminjaman.
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => (
            <article
              key={record.id}
              className="rounded-lg border border-border bg-card p-4 shadow-xs sm:p-5"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="font-semibold text-foreground">{record.item.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {record.item.code} · {record.borrowCode}
                  </p>
                </div>
                <StatusBadge status={record.status} />
              </div>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-muted-foreground">Jumlah</dt>
                  <dd className="mt-1 text-foreground">
                    {record.borrowQuantity} unit
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Tanggal pinjam</dt>
                  <dd className="mt-1 text-foreground">
                    {new Date(record.borrowDate).toLocaleDateString("id-ID")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Tanggal kembali</dt>
                  <dd className="mt-1 text-foreground">
                    {new Date(record.dueDate).toLocaleDateString("id-ID")}
                  </dd>
                </div>
              </dl>

              {record.status === BorrowStatus.APPROVED && (
                <p className="mt-4 flex items-center gap-2 rounded-md bg-blue-500/10 px-3 py-2 text-sm text-blue-800 dark:text-blue-300">
                  <PackageCheck className="h-4 w-4 shrink-0" />
                  Silakan ambil barang di kantor BPTI.
                </p>
              )}
              {record.status === BorrowStatus.DITOLAK && record.rejectionReason && (
                <RejectionReasonDialog
                  borrowCode={record.borrowCode}
                  reason={record.rejectionReason}
                />
              )}
              {record.notes && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Catatan: {record.notes}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: BorrowStatus }) {
  const isRejected = status === BorrowStatus.DITOLAK;
  const isApproved = status === BorrowStatus.APPROVED;
  const isReturned = status === BorrowStatus.DIKEMBALIKAN;
  const Icon = isRejected ? AlertCircle : isApproved || isReturned ? CheckCircle2 : Clock;
  const colorClass = isRejected
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : isApproved
      ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
      : isReturned
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : status === BorrowStatus.DIPINJAM || status === BorrowStatus.TERLAMBAT
          ? "border-primary/20 bg-primary/10 text-primary"
          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";

  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${colorClass}`}>
      <Icon className="h-3.5 w-3.5" />
      {statusLabels[status]}
    </span>
  );
}
