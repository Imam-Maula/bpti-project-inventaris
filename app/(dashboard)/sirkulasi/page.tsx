import type { Metadata } from "next";
import { getBorrowRecordsAction } from "@/actions/borrow-actions";
import { getItemsAction } from "@/actions/item-actions";
import { BorrowListClient } from "@/components/borrow/borrow-list-client";

export const metadata: Metadata = {
  title: "Sirkulasi Peminjaman — BPTI Inventaris",
  description: "Pencatatan sirkulasi peminjaman dan pengembalian unit inventaris BPTI",
};

export default async function SirkulasiPage() {
  const [records, items] = await Promise.all([
    getBorrowRecordsAction(),
    getItemsAction(),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Sirkulasi Peminjaman
        </h1>
        <p className="text-sm text-muted-foreground">
          Pantau transaksi peminjaman aktif, batas waktu pengembalian, dan riwayat sirkulasi unit fisik.
        </p>
      </div>

      <BorrowListClient initialRecords={records} availableItems={items} />
    </div>
  );
}