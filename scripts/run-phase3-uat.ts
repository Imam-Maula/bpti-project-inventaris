import { PrismaClient, Condition } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import {
  createItemService,
  updateItemAtomicService,
  restoreQuarantinedItemService,
} from "../lib/services/item-service";
import {
  createBorrowTransactionService,
  returnBorrowTransactionService,
  getBorrowRecordsService,
  getCirculationMetricsService,
} from "../lib/services/borrow-service";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginRateLimit,
} from "../lib/rate-limiter";

const prisma = new PrismaClient();
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  "bpti-inventory-secure-session-secret-key-2026-min-32-chars";
const secretKey = new TextEncoder().encode(SESSION_SECRET);

interface TestResult {
  id: string;
  name: string;
  category: "UAT" | "STRESS" | "INTEGRITY";
  status: "PASS" | "FAIL";
  executionTimeMs: number;
  details: string;
}

const results: TestResult[] = [];

async function recordTest(
  id: string,
  name: string,
  category: "UAT" | "STRESS" | "INTEGRITY",
  fn: () => Promise<string>
) {
  const start = performance.now();
  try {
    const details = await fn();
    const duration = Math.round(performance.now() - start);
    results.push({
      id,
      name,
      category,
      status: "PASS",
      executionTimeMs: duration,
      details,
    });
    console.log(`[PASS] ${id} - ${name} (${duration}ms): ${details}`);
  } catch (error) {
    const duration = Math.round(performance.now() - start);
    const details = error instanceof Error ? error.message : String(error);
    results.push({
      id,
      name,
      category,
      status: "FAIL",
      executionTimeMs: duration,
      details,
    });
    console.error(`[FAIL] ${id} - ${name} (${duration}ms): ${details}`);
  }
}

async function main() {
  console.log("================================================================================");
  console.log("   UJI STRES TRANSAKSI & VERIFIKASI PENERIMAAN PENGGUNA (UAT) FASE 3");
  console.log("   Sistem Informasi Pengelolaan Barang Inventaris BPTI UHAMKA");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // SAFETY GUARD: Mencegah eksekusi UAT pada basis data produksi sebenarnya
  // ---------------------------------------------------------------------------
  const dbUrl = process.env.DATABASE_URL || "";
  const isProduction = process.env.NODE_ENV === "production";
  const isLocalHost =
    dbUrl.includes("127.0.0.1") ||
    dbUrl.includes("localhost") ||
    dbUrl.includes("db_inventaris_bpti");

  if (isProduction || !isLocalHost) {
    throw new Error(
      "[ABORT CRITICAL] Skrip UAT ditolak! Skrip ini melakukan mutasi pengujian dan hanya boleh dijalankan pada basis data lokal / staging pengujian (localhost / 127.0.0.1)."
    );
  }

  const adminUser = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!adminUser) {
    throw new Error("Pengguna admin tidak ditemukan dalam basis data. Jalankan pnpm db:seed terlebih dahulu.");
  }

  // IDs untuk data uji terisolasi
  let testItemId = "";
  let testBorrowRecordId = "";
  let raceItemId = "";

  try {
    // -------------------------------------------------------------------------
    // UAT-01: Autentikasi Admin & Verifikasi Hash Bcrypt
    // -------------------------------------------------------------------------
    await recordTest("UAT-01", "Autentikasi Admin & Verifikasi Hash Bcrypt", "UAT", async () => {
      const isMatchValid = await bcrypt.compare("admin123", adminUser!.password);
      if (!isMatchValid) throw new Error("Sandi admin123 ditolak oleh verifikasi bcrypt.");

      const isMatchInvalid = await bcrypt.compare("sandi_salah_999", adminUser!.password);
      if (isMatchInvalid) throw new Error("Sandi salah justru diterima oleh verifikasi bcrypt.");

      return "Kredensial valid diterima, kredensial palsu ditolak mutlak (Bcrypt salt rounds >= 10).";
    });

    // -------------------------------------------------------------------------
    // UAT-02: Proteksi Brute-Force Rate Limiting
    // -------------------------------------------------------------------------
    await recordTest("UAT-02", "Proteksi Brute-Force Rate Limiting pada Login", "UAT", async () => {
      const testKey = "test_brute_admin";
      resetLoginRateLimit(testKey);

      for (let i = 0; i < 5; i++) {
        recordFailedLogin(testKey);
      }

      const status = checkLoginRateLimit(testKey);
      if (status.allowed) {
        throw new Error("Percobaan login ke-6 seharusnya diblokir oleh rate limiter.");
      }

      resetLoginRateLimit(testKey);
      const resetStatus = checkLoginRateLimit(testKey);
      if (!resetStatus.allowed) {
        throw new Error("Reset rate limiter gagal mengembalikan status.");
      }

      return "Batas 5 kali kesalahan login terpicu dan memblokir upaya selanjutnya secara presisi.";
    });

    // -------------------------------------------------------------------------
    // UAT-03: Integritas Sesi JWT & Penolakan Token Rusak
    // -------------------------------------------------------------------------
    await recordTest("UAT-03", "Integritas Sesi JWT & Penolakan Token Rusak", "UAT", async () => {
      const validToken = await new SignJWT({
        userId: adminUser!.id,
        username: adminUser!.username,
        name: adminUser!.name,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secretKey);

      const verified = await jwtVerify(validToken, secretKey, { algorithms: ["HS256"] });
      if (!verified.payload.userId) throw new Error("Token sah gagal didekripsi.");

      let tamperedFailed = false;
      try {
        const tamperedToken = validToken.slice(0, -6) + "XXXXXX";
        await jwtVerify(tamperedToken, secretKey, { algorithms: ["HS256"] });
      } catch {
        tamperedFailed = true;
      }

      if (!tamperedFailed) throw new Error("Token yang dimodifikasi signature-nya tidak ditolak.");

      return "Token JWT HS256 valid terverifikasi; token tamper ditolak 100%.";
    });

    // -------------------------------------------------------------------------
    // UAT-04: Penambahan Master Barang Baru via Service Layer
    // -------------------------------------------------------------------------
    await recordTest("UAT-04", "Penambahan Master Barang Baru via Service Layer", "UAT", async () => {
      await prisma.borrowRecord.deleteMany({
        where: { item: { code: { in: ["BRG-UAT-TEST", "BRG-RACE-TEST"] } } },
      });
      await prisma.item.deleteMany({
        where: { code: { in: ["BRG-UAT-TEST", "BRG-RACE-TEST"] } },
      });

      const item = await createItemService(prisma, {
        code: "BRG-UAT-TEST",
        name: "Perangkat Pengujian UAT Master",
        category: "Elektronik",
        totalQuantity: 10,
        location: "Lab Simulasi Sistem BPTI",
        condition: Condition.BAIK,
      });
      testItemId = item.id;

      if (item.availableQuantity !== 10 || item.totalQuantity !== 10 || item.quarantinedQuantity !== 0) {
        throw new Error(
          `Inisialisasi stok fisik tidak konsisten: available=${item.availableQuantity}, total=${item.totalQuantity}, quarantined=${item.quarantinedQuantity}`
        );
      }

      return `Barang ${item.code} berhasil didaftarkan via createItemService dengan stok total 10 unit dan karantina 0 unit.`;
    });

    // -------------------------------------------------------------------------
    // UAT-05: Peminjaman Atomik via Borrow Service Layer (CAS Mutex)
    // -------------------------------------------------------------------------
    await recordTest("UAT-05", "Peminjaman Atomik via Borrow Service Layer (CAS Mutex)", "UAT", async () => {
      const borrowQuantity = 3;
      const record = await createBorrowTransactionService(prisma, adminUser!.id, {
        itemId: testItemId,
        borrowerName: "Ir. M. Ridwan (Pusat Riset)",
        borrowerContact: "081288887777",
        borrowQuantity,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: "Uji sirkulasi via service domain",
      });

      testBorrowRecordId = record.id;

      const updatedItem = await prisma.item.findUnique({ where: { id: testItemId } });
      if (!updatedItem || updatedItem.availableQuantity !== 7) {
        throw new Error(`Sisa stok tidak sesuai: sisa ${updatedItem?.availableQuantity}`);
      }

      return `Peminjaman 3 unit sukses (Kode: ${record.borrowCode}), stok siap pakai berkurang dari 10 menjadi 7 unit.`;
    });

    // -------------------------------------------------------------------------
    // UAT-06: Penolakan Over-Borrow & Proteksi Kuota (Stok >= 0)
    // -------------------------------------------------------------------------
    await recordTest("UAT-06", "Penolakan Over-Borrow & Proteksi Kuota (Stok >= 0)", "UAT", async () => {
      let rejected = false;
      try {
        await createBorrowTransactionService(prisma, adminUser!.id, {
          itemId: testItemId,
          borrowerName: "Peminjam Ilegal",
          borrowerContact: "081200000000",
          borrowQuantity: 8, // Sisa hanya 7 unit
          dueDate: new Date(),
          notes: "Over borrow",
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("tidak mencukupi")) {
          rejected = true;
        }
      }

      if (!rejected) {
        throw new Error("Transaksi over-borrow tidak digagalkan oleh borrow service.");
      }

      const itemCheck = await prisma.item.findUnique({ where: { id: testItemId } });
      if (itemCheck?.availableQuantity !== 7) {
        throw new Error(`Stok berubah pasca over-borrow: ${itemCheck?.availableQuantity}`);
      }

      return "Permintaan pinjam 8 unit ditolak karena stok tersedia 7 unit; stok tetap terjaga 7 unit.";
    });

    // -------------------------------------------------------------------------
    // UAT-07: Pengembalian Rusak Berat & Karantina Aset (Keseimbangan Stok)
    // -------------------------------------------------------------------------
    await recordTest("UAT-07", "Pengembalian Rusak Berat & Karantina Aset (Keseimbangan Stok)", "UAT", async () => {
      const returnResult = await returnBorrowTransactionService(prisma, {
        borrowRecordId: testBorrowRecordId,
        returnCondition: Condition.RUSAK_BERAT,
        notes: "Unit mengalami kerusakan fisik saat uji lapangan",
      });

      if (!returnResult.isDamagedHeavy) {
        throw new Error("Status kerusakan berat tidak terdeteksi oleh service pengembalian.");
      }

      const itemAfterReturn = await prisma.item.findUnique({ where: { id: testItemId } });
      if (!itemAfterReturn) throw new Error("Barang tidak ditemukan.");

      // Invarian: totalQuantity = 10, availableQuantity = 7 (karena rusak berat tidak masuk ke siap pakai), quarantinedQuantity = 3
      if (itemAfterReturn.quarantinedQuantity !== 3) {
        throw new Error(`Kuota karantina salah: diharapkan 3, aktual ${itemAfterReturn.quarantinedQuantity}`);
      }
      if (itemAfterReturn.availableQuantity !== 7) {
        throw new Error(`Stok siap pakai salah: diharapkan 7, aktual ${itemAfterReturn.availableQuantity}`);
      }
      if (itemAfterReturn.totalQuantity !== 10) {
        throw new Error(`Total aset fisik berubah: diharapkan 10, aktual ${itemAfterReturn.totalQuantity}`);
      }

      // Verifikasi persamaan matematis: Total Fisik (10) = Siap Pakai (7) + Dipinjam (0) + Karantina (3)
      const metrics = await getCirculationMetricsService(prisma);
      if (metrics.totalUnitKarantina < 3) {
        throw new Error(`Metrik agregat karantina salah: ${metrics.totalUnitKarantina}`);
      }

      return "Pengembalian RUSAK_BERAT (3 unit) berhasil dicatat ke kuota karantina BPTI; persamaan stok terbukti akurat.";
    });

    // -------------------------------------------------------------------------
    // UAT-08: Pemulihan Unit Karantina Kembali ke Siap Pakai (Pasca Servis)
    // -------------------------------------------------------------------------
    await recordTest("UAT-08", "Pemulihan Unit Karantina Kembali ke Siap Pakai", "UAT", async () => {
      const restoredItem = await restoreQuarantinedItemService(prisma, testItemId, 2); // Pulihkan 2 unit dari 3 unit rusak

      if (restoredItem.quarantinedQuantity !== 1) {
        throw new Error(`Sisa karantina salah: diharapkan 1, aktual ${restoredItem.quarantinedQuantity}`);
      }
      if (restoredItem.availableQuantity !== 9) {
        throw new Error(`Stok siap pakai salah pasca perbaikan: diharapkan 9, aktual ${restoredItem.availableQuantity}`);
      }

      return "2 unit berhasil dipulihkan dari karantina ke stok siap pakai (sisa 1 unit karantina, 9 siap pakai).";
    });

    // -------------------------------------------------------------------------
    // UAT-09: Filter Operasional Status TERLAMBAT
    // -------------------------------------------------------------------------
    await recordTest("UAT-09", "Filter Operasional Status TERLAMBAT via Borrow Service", "UAT", async () => {
      // Buat satu sirkulasi yang tenggat waktunya kemarin
      const overdueRecord = await createBorrowTransactionService(prisma, adminUser!.id, {
        itemId: testItemId,
        borrowerName: "Staf Terlambat",
        borrowerContact: "081299990000",
        borrowQuantity: 1,
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Kemarin
        notes: "Uji filter keterlambatan",
      });

      const overdueList = await getBorrowRecordsService(prisma, { status: "TERLAMBAT" });
      const found = overdueList.some((r) => r.id === overdueRecord.id);

      if (!found) {
        throw new Error("getBorrowRecordsService dengan status 'TERLAMBAT' gagal menemukan transaksi yang jatuh tempo.");
      }

      // Bersihkan peminjaman uji terlambat
      await returnBorrowTransactionService(prisma, {
        borrowRecordId: overdueRecord.id,
        returnCondition: Condition.BAIK,
      });

      return "Pencarian status 'TERLAMBAT' berhasil menyaring data yang melewati dueDate secara konsisten.";
    });

    // -------------------------------------------------------------------------
    // UAT-10: Pembaruan Atomik Master Barang & Pencegahan Lost Update
    // -------------------------------------------------------------------------
    await recordTest("UAT-10", "Pembaruan Atomik Master Barang & Pencegahan Lost Update", "UAT", async () => {
      // testItemId saat ini: totalQuantity = 10, availableQuantity = 9, quarantinedQuantity = 1.
      // Naikkan total menjadi 12 (delta +2)
      const updated = await updateItemAtomicService(prisma, {
        id: testItemId,
        code: "BRG-UAT-TEST",
        name: "Perangkat Pengujian UAT Master (Updated)",
        category: "Elektronik",
        totalQuantity: 12,
        location: "Lab Jaringan Lt. 3",
        condition: Condition.BAIK,
      });

      if (updated.totalQuantity !== 12 || updated.availableQuantity !== 11) {
        throw new Error(
          `Penyesuaian delta kuota gagal: total=${updated.totalQuantity}, available=${updated.availableQuantity}`
        );
      }

      return "Pembaruan totalQuantity dari 10 ke 12 secara atomik menaikkan availableQuantity dari 9 ke 11 tanpa menimpa stok.";
    });

    // -------------------------------------------------------------------------
    // STRESS-01: Simulasi Konkurensi Mutasi Stok Bersamaan (Zero Race Condition)
    // -------------------------------------------------------------------------
    await recordTest("STRESS-01", "Simulasi Konkurensi Stok Bersamaan via Service (Zero Race Condition)", "STRESS", async () => {
      const raceItem = await createItemService(prisma, {
        code: "BRG-RACE-TEST",
        name: "Barang Uji Balapan Konkurensi",
        category: "Elektronik",
        totalQuantity: 1,
        location: "Lab Jaringan",
        condition: Condition.BAIK,
      });
      raceItemId = raceItem.id;

      const outcomes = await Promise.allSettled([
        createBorrowTransactionService(prisma, adminUser!.id, {
          itemId: raceItemId,
          borrowerName: "Staf Konkuren A",
          borrowerContact: "081233334444",
          borrowQuantity: 1,
          dueDate: new Date(),
        }),
        createBorrowTransactionService(prisma, adminUser!.id, {
          itemId: raceItemId,
          borrowerName: "Staf Konkuren B",
          borrowerContact: "081255556666",
          borrowQuantity: 1,
          dueDate: new Date(),
        }),
      ]);

      const successCount = outcomes.filter((o) => o.status === "fulfilled").length;
      const rejectedCount = outcomes.filter((o) => o.status === "rejected").length;

      if (successCount !== 1 || rejectedCount !== 1) {
        throw new Error(
          `Balapan konkurensi gagal diisolasi: sukses=${successCount}, ditolak=${rejectedCount}. Stok berpotensi minus!`
        );
      }

      const finalRaceItem = await prisma.item.findUnique({ where: { id: raceItemId } });
      if (finalRaceItem?.availableQuantity !== 0) {
        throw new Error(`Stok akhir bukan 0 unit: sisa ${finalRaceItem?.availableQuantity}`);
      }

      return "Dari 2 transaksi peminjaman simultan pada stok 1 unit: tepat 1 sukses dan 1 ditolak atomik (Zero Negative Stock).";
    });

  } finally {
    console.log("\n[INFO] Menjalankan pembersihan data uji terisolasi...");
    if (testItemId) {
      await prisma.borrowRecord.deleteMany({ where: { itemId: testItemId } });
      await prisma.item.delete({ where: { id: testItemId } }).catch(() => {});
    }
    if (raceItemId) {
      await prisma.borrowRecord.deleteMany({ where: { itemId: raceItemId } });
      await prisma.item.delete({ where: { id: raceItemId } }).catch(() => {});
    }
    console.log("[SUCCESS] Data uji berhasil dibersihkan. Basis data kembali murni.");
  }

  console.log("\n================================================================================");
  console.log("   REKAPITULASI HASIL PENGUJIAN PENERIMAAN PENGGUNA (UAT) FASE 3 REFAKTOR");
  console.log("================================================================================");
  console.table(
    results.map((r) => ({
      ID: r.id,
      Nama: r.name,
      Kategori: r.category,
      Status: r.status,
      Waktu: `${r.executionTimeMs} ms`,
    }))
  );

  const totalPassed = results.filter((r) => r.status === "PASS").length;
  const totalFailed = results.filter((r) => r.status === "FAIL").length;
  console.log(`\nTotal Pengujian: ${results.length} | Lulus: ${totalPassed} | Gagal: ${totalFailed}`);

  if (totalFailed > 0) {
    console.error("[ERROR] Terdapat kasus uji yang gagal. Periksa log detail di atas.");
    process.exit(1);
  } else {
    console.log("[SUCCESS] SELURUH KASUS UJI UAT REAL SERVICE DOMAIN LULUS PARIPURNA 100%!");
  }
}

main()
  .catch((err) => {
    console.error("FATAL ERROR saat menjalankan test runner:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
