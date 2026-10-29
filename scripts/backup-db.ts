import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";

const prisma = new PrismaClient();

async function runBackup() {
  console.log("================================================================================");
  console.log("   SISTEM PENCADANGAN BASIS DATA RELASIONAL BPTI UHAMKA");
  console.log("================================================================================");

  const backupDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);

  const backupFileName = `backup_inventaris_bpti_${timestamp}.json`;
  const backupFilePath = path.join(backupDir, backupFileName);

  console.log(`[1/4] Mengambil seluruh data relasional dari MySQL...`);

  const [users, items, borrowRecords, auditLogs, itemImages] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        username: true,
        password: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.item.findMany({
      orderBy: { code: "asc" },
    }),
    prisma.borrowRecord.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.itemImage.findMany({
      orderBy: { itemId: "asc" },
    }),
  ]);

  const totalPhysical = items.reduce((acc, i) => acc + i.totalQuantity, 0);
  const totalAvailable = items.reduce((acc, i) => acc + i.availableQuantity, 0);
  const totalQuarantined = items.reduce((acc, i) => acc + (i.heavyDamageQuantity ?? 0), 0);

  const backupPayload = {
    metadata: {
      system: "Sistem Informasi Inventaris BPTI UHAMKA",
      generatedAt: new Date().toISOString(),
      schemaVersion: "5.22.0",
      totalUsers: users.length,
      totalItems: items.length,
      totalBorrowRecords: borrowRecords.length,
      totalAuditLogs: auditLogs.length,
      totalItemImages: itemImages.length,
      stockSummary: {
        totalPhysical,
        totalAvailable,
        totalQuarantined,
      },
    },
    tables: {
      users,
      items,
      borrow_records: borrowRecords,
      audit_logs: auditLogs,
      item_images: itemImages.map(({ imageData, ...image }) => ({
        ...image,
        imageData: Buffer.from(imageData).toString("base64"),
      })),
    },
  };

  console.log(`[2/4] Metadata rekapitulasi:`);
  console.log(`      - Total Pengguna Admin : ${users.length}`);
  console.log(`      - Total Jenis Barang   : ${items.length}`);
  console.log(`      - Total Riwayat Pinjam : ${borrowRecords.length}`);
  console.log(`      - Total Log Aktivitas  : ${auditLogs.length}`);
  console.log(`      - Total Gambar Barang  : ${itemImages.length}`);
  console.log(`      - Total Unit Fisik Aset: ${totalPhysical} unit`);

  console.log(`[3/4] Menulis berkas cadangan ke ${backupFilePath}...`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupPayload, null, 2), "utf-8");

  const fileStats = fs.statSync(backupFilePath);
  const fileSizeKb = (fileStats.size / 1024).toFixed(2);

  console.log(`[4/4] Berkas cadangan berhasil disimpan (${fileSizeKb} KB).`);
  console.log(`[SUCCESS] Pencadangan basis data tuntas 100%!`);
  console.log(`Lokasi arsip: ${backupFilePath}`);
}

runBackup()
  .catch((err) => {
    console.error("[ERROR] Gagal melakukan pencadangan basis data:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
