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
  const [items, user] = await Promise.all([
    getItemsAction({ status: "ALL" }),
    requireAuth(),
  ]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {user.role === Role.ADMIN ? "Katalog Master Barang" : "Katalog Barang"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {user.role === Role.ADMIN
            ? "Kelola aset inventaris, ketersediaan unit fisik, lokasi penyimpanan, dan kondisi barang."
            : "Lihat ketersediaan barang inventaris dan ajukan peminjaman."}
        </p>
      </div>

      {user.role === Role.ADMIN ? (
        <ItemListClient initialItems={items} />
      ) : (
        <UserItemCatalog items={items.filter((item) => item.status === "AKTIF")} />
      )}
    </div>
  );
}