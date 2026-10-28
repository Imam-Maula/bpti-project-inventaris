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
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Log Aktivitas & Audit Trail
        </h1>
        <p className="text-sm text-muted-foreground">
          Rekam jejak kronologis dan transparansi riwayat perubahan data master aset serta transaksi sirkulasi BPTI.
        </p>
      </div>

      <AuditLogClient initialLogs={logs} />
    </div>
  );
}
