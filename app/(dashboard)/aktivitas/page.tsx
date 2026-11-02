import type { Metadata } from "next";
import { getAuditLogsAction } from "@/actions/audit-actions";
import { AuditLogClient } from "@/components/audit/audit-log-client";

export const metadata: Metadata = {
  title: "Log Aktivitas & Audit Trail — BPTI Inventaris",
  description: "Rekam jejak histori audit transaksi dan mutasi data inventaris BPTI",
};

export default async function AktivitasPage() {
  const logs = await getAuditLogsAction({ limit: 1000 });

  return (
    <div className="flex h-full flex-1 flex-col min-h-0 overflow-hidden">
      {/* Header Halaman (Judul & Deskripsi) - Tetap Statis & Diam */}
      <div className="shrink-0 space-y-0.5 pb-2.5">
  <h1 className="text-xl font-bold tracking-tight text-foreground">
          Log Aktivitas & Audit Trail
        </h1>
        <p className="text-xs text-muted-foreground">
          Rekam jejak kronologis dan transparansi riwayat perubahan data master aset serta transaksi sirkulasi BPTI.
        </p>
      </div>

      <AuditLogClient initialLogs={logs} />
    </div>
  );
}
