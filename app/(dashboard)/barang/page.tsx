import type { Metadata } from "next";
import { getItemsAction } from "@/actions/item-actions";
import { ItemListClient } from "@/components/items/item-list-client";
import { UserItemCatalog } from "@/components/items/user-item-catalog";
import { requireAuth } from "@/lib/dal";
import { Role } from "@prisma/client";

export const metadata: Metadata = {
  title: "Katalog Master Barang — BPTI Inventaris",
  description: "Manajemen katalog master data barang inventaris BPTI",
};

export default async function BarangPage() {
  const user = await requireAuth();
  const isAdmin = user.role === Role.ADMIN;
  const items = await getItemsAction(isAdmin ? { status: "ALL" } : { status: "AKTIF" });

  return (
    <div className="flex h-full flex-1 flex-col min-h-0 overflow-hidden">
      {/* Header Halaman (Judul & Deskripsi) - Tetap Statis & Diam */}
      <div className="shrink-0 space-y-0.5 pb-2.5">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {isAdmin ? "Katalog Master Barang" : "Katalog Barang"}
        </h1>
        <p className="text-xs text-muted-foreground">
          {isAdmin
            ? "Kelola aset inventaris, ketersediaan unit fisik, lokasi penyimpanan, dan kondisi barang."
            : "Lihat ketersediaan barang inventaris dan ajukan peminjaman."}
        </p>
      </div>

      {isAdmin ? (
        <ItemListClient initialItems={items} />
      ) : (
        <UserItemCatalog items={items} />
      )}
    </div>
  );
}
