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
    <div
      className={
        isAdmin
          ? "flex h-full min-h-0 flex-1 flex-col overflow-hidden"
          : "flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden"
      }
    >
      <div
        className={
          isAdmin
            ? "shrink-0 space-y-0.5 pb-2.5"
            : "shrink-0 space-y-1"
        }
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {user.role === Role.ADMIN ? "Katalog Master Barang" : "Katalog Barang"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {user.role === Role.ADMIN
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
