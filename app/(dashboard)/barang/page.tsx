import type { Metadata } from "next";
import { getItemsAction } from "@/actions/item-actions";
import { ItemListClient } from "@/components/items/item-list-client";

export const metadata: Metadata = {
  title: "Katalog Master Barang — BPTI Inventaris",
  description: "Manajemen katalog master data barang inventaris BPTI",
};

export default async function BarangPage() {
  const items = await getItemsAction({ status: "ALL" });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Katalog Master Barang
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola aset inventaris, ketersediaan unit fisik, lokasi penyimpanan, dan kondisi barang.
        </p>
      </div>

      <ItemListClient initialItems={items} />
    </div>
  );
}