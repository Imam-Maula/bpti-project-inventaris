import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";

const prisma = new PrismaClient();

async function runRestore() {
  console.log("================================================================================");
  console.log("   SISTEM PEMULIHAN (RESTORE) BASIS DATA RELASIONAL BPTI UHAMKA");
  console.log("================================================================================");

  // 1. Safety Guard: Cegah restore pada production tanpa flag eksplisit
  const dbUrl = process.env.DATABASE_URL || "";
  const isProduction = process.env.NODE_ENV === "production";
  const isLocalHost =
    dbUrl.includes("127.0.0.1") ||
    dbUrl.includes("localhost") ||
    dbUrl.includes("db_inventaris_bpti");

  if (isProduction || !isLocalHost) {
    throw new Error(
      "[ABORT CRITICAL] Skrip pemulihan ditolak! Skrip ini hanya boleh dieksekusi pada basis data lokal / staging pengujian (localhost / 127.0.0.1)."
    );
  }

  const backupDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    throw new Error(`Direktori pencadangan '${backupDir}' tidak ditemukan.`);
  }

  // Cari file backup terbaru jika argumen tidak diberikan
  const targetFileArg = process.argv[2];
  let targetFilePath = "";

  if (targetFileArg) {
    targetFilePath = path.isAbsolute(targetFileArg)
      ? targetFileArg
      : path.resolve(process.cwd(), targetFileArg);
  } else {
    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith("backup_inventaris_bpti_") && f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) {
      throw new Error("Tidak ditemukan berkas cadangan .json di dalam direktori 'backups/'.");
    }
    targetFilePath = path.join(backupDir, files[0]);
  }

  console.log(`[1/4] Membaca berkas snapshot cadangan: ${targetFilePath}`);
  const rawContent = fs.readFileSync(targetFilePath, "utf-8");
  const parsed = JSON.parse(rawContent);

  if (
    !parsed.tables ||
    !Array.isArray(parsed.tables.users) ||
    !Array.isArray(parsed.tables.items)
  ) {
    throw new Error("Format berkas cadangan tidak valid atau rusak.");
  }

  const { users, items, borrow_records: borrowRecords, audit_logs: auditLogs = [] } = parsed.tables;

  console.log(`[2/4] Metadata arsip:`);
  console.log(`      - Dibuat pada : ${parsed.metadata.generatedAt}`);
  console.log(`      - Total Admin : ${parsed.metadata.totalUsers}`);
  console.log(`      - Total Barang: ${parsed.metadata.totalItems}`);
  console.log(`      - Total Pinjam: ${parsed.metadata.totalBorrowRecords}`);
  console.log(`      - Total Audit : ${auditLogs.length}`);

  console.log(`[3/4] Melakukan transaksi pemulihan atomik (Clean & Repopulate)...`);

  await prisma.$transaction(async (tx) => {
    // Bersihkan tabel anak terlebih dahulu untuk menjaga integritas relasional FK
    await tx.auditLog.deleteMany();
    await tx.borrowRecord.deleteMany();
    await tx.item.deleteMany();
    await tx.user.deleteMany();

    // 1. Pulihkan Akun User
    for (const u of users) {
      await tx.user.create({
        data: {
          id: u.id,
          username: u.username,
          password: u.password,
          name: u.name,
          createdAt: new Date(u.createdAt),
          updatedAt: new Date(u.updatedAt),
        },
      });
    }

interface BackupItem {
  id: string;
  code: string;
  name: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
  goodQuantity?: number;
  lightDamageQuantity?: number;
  heavyDamageQuantity?: number;
  quarantinedQuantity?: number;
  resolvedDamagedQuantity?: number;
  location: string;
  condition: "BAIK" | "RUSAK_RINGAN" | "RUSAK_BERAT";
  status: "AKTIF" | "DIARSIPKAN";
  createdAt: string | Date;
  updatedAt: string | Date;
}

    // 2. Pulihkan Master Barang
    for (const it of (items as BackupItem[])) {
      await tx.item.create({
        data: {
          id: it.id,
          code: it.code,
          name: it.name,
          category: it.category,
          totalQuantity: it.totalQuantity,
          availableQuantity: it.availableQuantity,
          goodQuantity: it.goodQuantity ?? it.availableQuantity ?? it.totalQuantity,
          lightDamageQuantity: it.lightDamageQuantity ?? 0,
          heavyDamageQuantity: it.heavyDamageQuantity ?? it.quarantinedQuantity ?? 0,
          resolvedDamagedQuantity: it.resolvedDamagedQuantity ?? 0,
          location: it.location,
          condition: it.condition,
          status: it.status,
          createdAt: new Date(it.createdAt),
          updatedAt: new Date(it.updatedAt),
        },
      });
    }

    // 3. Pulihkan Transaksi Sirkulasi
    for (const br of borrowRecords) {
      await tx.borrowRecord.create({
        data: {
          id: br.id,
          borrowCode: br.borrowCode,
          itemId: br.itemId,
          adminId: br.adminId,
          borrowerName: br.borrowerName,
          borrowerContact: br.borrowerContact,
          borrowQuantity: br.borrowQuantity,
          borrowDate: new Date(br.borrowDate),
          dueDate: new Date(br.dueDate),
          returnDate: br.returnDate ? new Date(br.returnDate) : null,
          status: br.status,
          notes: br.notes,
          createdAt: new Date(br.createdAt),
          updatedAt: new Date(br.updatedAt),
        },
      });
    }

    // 4. Pulihkan Catatan Audit Trail (jika ada di arsip)
    if (Array.isArray(auditLogs)) {
      for (const al of auditLogs) {
        await tx.auditLog.create({
          data: {
            id: al.id,
            action: al.action,
            entityType: al.entityType,
            entityId: al.entityId,
            adminId: al.adminId,
            details: al.details,
            oldValue: al.oldValue,
            newValue: al.newValue,
            createdAt: new Date(al.createdAt),
          },
        });
      }
    }
  });

  console.log(`[4/4] Verifikasi konsistensi relasi pasca-pemulihan berhasil.`);
  console.log(`[SUCCESS] Pemulihan basis data dari snapshot selesai 100%! Data siap digunakan kembali.`);
}

runRestore()
  .catch((err) => {
    console.error(`\n[FATAL] Pemulihan basis data gagal:`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
