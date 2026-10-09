import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== VERIFIKASI EMPIRIS BASIS DATA BPTI ===");
  const items = await prisma.item.findMany({
    orderBy: { code: "asc" },
    select: {
      code: true,
      name: true,
      totalQuantity: true,
      availableQuantity: true,
      location: true,
      condition: true,
    },
  });
  console.log("\n[1] Data Master Barang:");
  console.table(items);

  const totalPhysical = items.reduce((acc, i) => acc + i.totalQuantity, 0);
  const totalAvailable = items.reduce((acc, i) => acc + i.availableQuantity, 0);
  console.log(`\nAggregated Physical Stock: Total = ${totalPhysical}, Siap Pakai = ${totalAvailable}`);

  const records = await prisma.borrowRecord.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      borrowCode: true,
      borrowerName: true,
      borrowerContact: true,
      borrowQuantity: true,
      status: true,
      borrowDate: true,
      dueDate: true,
      returnDate: true,
      item: {
        select: { code: true, name: true },
      },
    },
  });
  console.log("\n[2] Riwayat Sirkulasi BorrowRecord:");
  console.table(
    records.map((r) => ({
      code: r.borrowCode,
      peminjam: r.borrowerName,
      kontak: r.borrowerContact,
      barang: `${r.item.code} - ${r.item.name}`,
      qty: r.borrowQuantity,
      status: r.status,
      tenggat: r.dueDate.toISOString().split("T")[0],
      kembali: r.returnDate ? r.returnDate.toISOString().split("T")[0] : "-",
    }))
  );
}

main()
  .catch((err) => {
    console.error("Error checking database:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
