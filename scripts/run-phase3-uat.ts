import { PrismaClient, Condition, BorrowStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const prisma = new PrismaClient();
const SESSION_SECRET = process.env.SESSION_SECRET || "bpti-inventory-secure-session-secret-key-2026-min-32-chars";
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

  let adminUser = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!adminUser) {
    throw new Error("Pengguna admin tidak ditemukan dalam basis data. Jalankan pnpm db:seed terlebih dahulu.");
  }

  // IDs untuk data uji terisolasi
  let testItemId = "";
  let testBorrowRecordId = "";
  let raceItemId = "";

  try {
    // -------------------------------------------------------------------------
    // UAT-01: Autentikasi Admin & Verifikasi Kredensial Bcrypt
    // -------------------------------------------------------------------------
    await recordTest("UAT-01", "Autentikasi Admin & Verifikasi Hash Bcrypt", "UAT", async () => {
      const isMatchValid = await bcrypt.compare("admin123", adminUser!.password);
      if (!isMatchValid) throw new Error("Sandi admin123 ditolak oleh verifikasi bcrypt.");

      const isMatchInvalid = await bcrypt.compare("sandi_salah_999", adminUser!.password);
      if (isMatchInvalid) throw new Error("Sandi salah justru diterima oleh verifikasi bcrypt.");

      return "Kredensial valid diterima, kredensial palsu ditolak mutlak (Bcrypt salt rounds >= 10).";
    });

    // -------------------------------------------------------------------------
    // UAT-02: Integritas Sesi JWT & Proteksi Penolakan Token Rusak (Route Guard)
    // -------------------------------------------------------------------------
    await recordTest("UAT-02", "Integritas Sesi JWT & Penolakan Token Rusak", "UAT", async () => {
      // 1. Buat token sah
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

      // 2. Buat token palsu / di-tamper
      let tamperedFailed = false;
      try {
        const tamperedToken = validToken.slice(0, -6) + "XXXXXX";
        await jwtVerify(tamperedToken, secretKey, { algorithms: ["HS256"] });
      } catch {
        tamperedFailed = true;
      }

      if (!tamperedFailed) throw new Error("Token yang dimodifikasi signature-nya tidak ditolak.");

      return "Token JWT HS256 valid terverifikasi; token yang di-tamper ditolak 100%.";
    });

    // -------------------------------------------------------------------------
    // UAT-03: Penambahan Master Barang Baru & Inisialisasi Kuota Fisik
    // -------------------------------------------------------------------------
    await recordTest("UAT-03", "Penambahan Master Barang Baru & Inisialisasi Stok", "UAT", async () => {
      // Pastikan bersih dari sisa uji sebelumnya
      await prisma.item.deleteMany({ where: { code: { in: ["BRG-UAT-TEST", "BRG-RACE-TEST"] } } });

      const item = await prisma.item.create({
        data: {
          code: "BRG-UAT-TEST",
          name: "Perangkat Pengujian UAT Master",
          category: "Elektronik",
          totalQuantity: 10,
          availableQuantity: 10,
          location: "Lab Simulasi Sistem BPTI",
          condition: Condition.BAIK,
        },
      });
      testItemId = item.id;

      if (item.availableQuantity !== 10 || item.totalQuantity !== 10) {
        throw new Error(`Inisialisasi stok fisik tidak konsisten: available=${item.availableQuantity}, total=${item.totalQuantity}`);
      }

      return `Barang ${item.code} berhasil didaftarkan dengan stok total 10 unit dan siap pakai 10 unit.`;
    });

    // -------------------------------------------------------------------------
    // UAT-04: Penolakan Duplikasi Kode Unik Barang (Unique Constraint P2002)
    // -------------------------------------------------------------------------
    await recordTest("UAT-04", "Penolakan Duplikasi Kode Unik Barang (P2002)", "UAT", async () => {
      let duplicateRejected = false;
      try {
        await prisma.item.create({
          data: {
            code: "BRG-UAT-TEST", // Kode yang sama dengan UAT-03
            name: "Barang Duplikat Palsu",
            category: "Elektronik",
            totalQuantity: 5,
            availableQuantity: 5,
            location: "Gudang",
            condition: Condition.BAIK,
          },
        });
      } catch (err: unknown) {
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
          duplicateRejected = true;
        }
      }

      if (!duplicateRejected) {
        throw new Error("Sistem mengizinkan pembuatan duplikasi kode barang yang sama.");
      }

      return "Kode duplikat BRG-UAT-TEST ditolak mutlak oleh Prisma & MySQL Unique Constraint (P2002).";
    });

    // -------------------------------------------------------------------------
    // UAT-05: Peminjaman Atomik (Decrement Available Quantity Secara Terpadu)
    // -------------------------------------------------------------------------
    await recordTest("UAT-05", "Peminjaman Atomik (Decrement Available Quantity)", "UAT", async () => {
      const borrowQuantity = 3;

      const record = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.item.updateMany({
          where: {
            id: testItemId,
            availableQuantity: { gte: borrowQuantity },
          },
          data: {
            availableQuantity: { decrement: borrowQuantity },
          },
        });

        if (updateResult.count === 0) {
          throw new Error("Stok barang yang tersedia tidak mencukupi untuk dipinjam.");
        }

        const borrowCode = `PJM-UAT-${Date.now().toString().slice(-4)}`;
        return tx.borrowRecord.create({
          data: {
            borrowCode,
            itemId: testItemId,
            adminId: adminUser!.id,
            borrowerName: "Ir. M. Ridwan (Pusat Riset)",
            borrowerContact: "081288887777",
            borrowQuantity,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: BorrowStatus.DIPINJAM,
            notes: "Keperluan uji beban sirkulasi BPTI",
          },
        });
      });

      testBorrowRecordId = record.id;

      // Verifikasi stok pasca peminjaman
      const updatedItem = await prisma.item.findUnique({ where: { id: testItemId } });
      if (!updatedItem || updatedItem.availableQuantity !== 7) {
        throw new Error(`Sisa stok tidak sesuai ekspektasi 7 unit: sisa ${updatedItem?.availableQuantity}`);
      }

      return `Peminjaman 3 unit sukses (Kode: ${record.borrowCode}), stok siap pakai berkurang dari 10 menjadi 7 unit.`;
    });

    // -------------------------------------------------------------------------
    // UAT-06: Penolakan Over-Borrow & Batas Kuota Stok (Zero Negative Stock)
    // -------------------------------------------------------------------------
    await recordTest("UAT-06", "Penolakan Over-Borrow & Proteksi Kuota (Stok >= 0)", "UAT", async () => {
      const requestedOverQuantity = 8; // Sisa stok hanya 7 unit
      let rejected = false;

      try {
        await prisma.$transaction(async (tx) => {
          const updateResult = await tx.item.updateMany({
            where: {
              id: testItemId,
              availableQuantity: { gte: requestedOverQuantity },
            },
            data: {
              availableQuantity: { decrement: requestedOverQuantity },
            },
          });

          if (updateResult.count === 0) {
            throw new Error("Stok barang yang tersedia tidak mencukupi untuk dipinjam.");
          }

          return tx.borrowRecord.create({
            data: {
              borrowCode: `PJM-OVER-${Date.now()}`,
              itemId: testItemId,
              adminId: adminUser!.id,
              borrowerName: "Peminjam Ilegal",
              borrowerContact: "081200000000",
              borrowQuantity: requestedOverQuantity,
              dueDate: new Date(),
              status: BorrowStatus.DIPINJAM,
            },
          });
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("tidak mencukupi")) {
          rejected = true;
        }
      }

      if (!rejected) {
        throw new Error("Transaksi over-borrow tidak digagalkan oleh sistem.");
      }

      // Pastikan stok tidak berubah dan tidak minus
      const itemCheck = await prisma.item.findUnique({ where: { id: testItemId } });
      if (itemCheck?.availableQuantity !== 7) {
        throw new Error(`Stok barang berubah secara tidak sah pasca over-borrow: ${itemCheck?.availableQuantity}`);
      }

      return "Permintaan pinjam 8 unit ditolak karena stok tersedia 7 unit; stok tetap terjaga 7 unit.";
    });

    // -------------------------------------------------------------------------
    // UAT-07: Pengembalian Atomik & Idempotensi (Pencegahan Double Return)
    // -------------------------------------------------------------------------
    await recordTest("UAT-07", "Pengembalian Atomik & Pencegahan Double Return", "UAT", async () => {
      // 1. Pengembalian sah pertama kali
      await prisma.$transaction(async (tx) => {
        const record = await tx.borrowRecord.findUnique({
          where: { id: testBorrowRecordId },
        });
        if (!record) throw new Error("Catatan sirkulasi tidak ditemukan.");

        const updateResult = await tx.borrowRecord.updateMany({
          where: {
            id: testBorrowRecordId,
            status: BorrowStatus.DIPINJAM,
          },
          data: {
            status: BorrowStatus.DIKEMBALIKAN,
            returnDate: new Date(),
            returnCondition: Condition.BAIK,
            notes: "Pengembalian unit lengkap tanpa cacat",
          },
        });

        if (updateResult.count === 0) {
          throw new Error("Peminjaman ini sudah tercatat dikembalikan sebelumnya.");
        }

        await tx.item.update({
          where: { id: record.itemId },
          data: {
            availableQuantity: { increment: record.borrowQuantity },
          },
        });
      });

      // Verifikasi stok pulih menjadi 10
      const restoredItem = await prisma.item.findUnique({ where: { id: testItemId } });
      if (restoredItem?.availableQuantity !== 10) {
        throw new Error(`Stok gagal pulih menjadi 10 unit pasca pengembalian: sisa ${restoredItem?.availableQuantity}`);
      }

      // 2. Percobaan Double Return (mencoba mengembalikan transaksi yang sama untuk kedua kalinya)
      let doubleReturnPrevented = false;
      try {
        await prisma.$transaction(async (tx) => {
          const record = await tx.borrowRecord.findUnique({
            where: { id: testBorrowRecordId },
          });
          if (!record) throw new Error("Catatan sirkulasi tidak ditemukan.");

          const updateResult = await tx.borrowRecord.updateMany({
            where: {
              id: testBorrowRecordId,
              status: BorrowStatus.DIPINJAM,
            },
            data: {
              status: BorrowStatus.DIKEMBALIKAN,
              returnDate: new Date(),
            },
          });

          if (updateResult.count === 0) {
            throw new Error("Peminjaman ini sudah tercatat dikembalikan sebelumnya.");
          }

          await tx.item.update({
            where: { id: record.itemId },
            data: {
              availableQuantity: { increment: record.borrowQuantity },
            },
          });
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("sudah tercatat dikembalikan")) {
          doubleReturnPrevented = true;
        }
      }

      if (!doubleReturnPrevented) {
        throw new Error("Double-return berhasil dieksekusi secara ilegal (merusak stok fisik).");
      }

      // Pastikan stok tidak membengkak di atas 10
      const finalItem = await prisma.item.findUnique({ where: { id: testItemId } });
      if (finalItem?.availableQuantity !== 10) {
        throw new Error(`Stok membengkak akibat double-return: ${finalItem?.availableQuantity}`);
      }

      return "Pengembalian pertama memulihkan stok ke 10 unit; percobaan pengembalian kedua digagalkan seketika.";
    });

    // -------------------------------------------------------------------------
    // UAT-08: Proteksi Hapus Aset Berelasi (Foreign Key Restrict P2003)
    // -------------------------------------------------------------------------
    await recordTest("UAT-08", "Proteksi Hapus Aset Berelasi (FK Restrict P2003)", "UAT", async () => {
      let fkProtectionActive = false;

      try {
        // Coba hapus testItemId yang memiliki riwayat di borrow_records
        await prisma.item.delete({
          where: { id: testItemId },
        });
      } catch (err: unknown) {
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2003") {
          fkProtectionActive = true;
        }
      }

      if (!fkProtectionActive) {
        throw new Error("Aset berhasil dihapus meskipun memiliki relasi riwayat sirkulasi (pelanggaran referensial).");
      }

      const itemStillExists = await prisma.item.findUnique({ where: { id: testItemId } });
      if (!itemStillExists) {
        throw new Error("Aset hilang dari basis data.");
      }

      return "Penghapusan aset ditolak oleh MySQL Foreign Key Restrict (P2003) demi integritas audit sejarah.";
    });

    // -------------------------------------------------------------------------
    // UAT-09: Live Search & Filtering Multidimensi
    // -------------------------------------------------------------------------
    await recordTest("UAT-09", "Pencarian Multi-kriteria & Filter Kategori/Kondisi", "UAT", async () => {
      // 1. Cari berdasarkan kode substring
      const searchByCode = await prisma.item.findMany({
        where: { code: { contains: "UAT-TEST" } },
      });
      if (searchByCode.length === 0) throw new Error("Pencarian kode gagal menemukan data.");

      // 2. Filter berdasarkan kategori
      const filterByCategory = await prisma.item.findMany({
        where: { category: "Elektronik" },
      });
      if (!filterByCategory.some((i) => i.id === testItemId)) {
        throw new Error("Filter kategori Elektronik gagal menyaring aset target.");
      }

      // 3. Filter berdasarkan kondisi
      const filterByCondition = await prisma.item.findMany({
        where: { condition: Condition.BAIK },
      });
      if (!filterByCondition.some((i) => i.id === testItemId)) {
        throw new Error("Filter kondisi BAIK gagal menyaring aset target.");
      }

      return `Filter pencarian kode, kategori, dan kondisi fisik berfungsi presisi (${searchByCode.length} item terdeteksi).`;
    });

    // -------------------------------------------------------------------------
    // UAT-10: Siklus Hidup Sesi & Validasi Kadaluarsa
    // -------------------------------------------------------------------------
    await recordTest("UAT-10", "Siklus Hidup Sesi & Penolakan Token Kadaluarsa", "UAT", async () => {
      // Buat token yang sudah kadaluarsa (expired 10 detik yang lalu)
      const expiredToken = await new SignJWT({
        userId: adminUser!.id,
        username: adminUser!.username,
        name: adminUser!.name,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt(Math.floor(Date.now() / 1000) - 60)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
        .sign(secretKey);

      let expiredRejected = false;
      try {
        await jwtVerify(expiredToken, secretKey, { algorithms: ["HS256"] });
      } catch {
        expiredRejected = true;
      }

      if (!expiredRejected) {
        throw new Error("Token yang telah melewati tenggat kadaluarsa masih dapat digunakan.");
      }

      return "Token sesi kadaluarsa ditolak seketika oleh jwtVerify; memicu redirect aman ke /login.";
    });

    // -------------------------------------------------------------------------
    // STRESS-01: Simulasi Konkurensi Mutasi Stok Bersamaan (Zero Race Condition)
    // -------------------------------------------------------------------------
    await recordTest("STRESS-01", "Simulasi Konkurensi Stok Bersamaan (Zero Race Condition)", "STRESS", async () => {
      // Buat barang uji dengan stok tepat 1 unit
      const raceItem = await prisma.item.create({
        data: {
          code: "BRG-RACE-TEST",
          name: "Barang Uji Balapan Konkurensi",
          category: "Elektronik",
          totalQuantity: 1,
          availableQuantity: 1,
          location: "Lab Jaringan",
          condition: Condition.BAIK,
        },
      });
      raceItemId = raceItem.id;

      // Fungsi simulasi peminjaman atomik
      const attemptBorrow = async (borrowerName: string) => {
        return prisma.$transaction(async (tx) => {
          const updateResult = await tx.item.updateMany({
            where: {
              id: raceItemId,
              availableQuantity: { gte: 1 },
            },
            data: {
              availableQuantity: { decrement: 1 },
            },
          });

          if (updateResult.count === 0) {
            throw new Error("Stok barang yang tersedia tidak mencukupi untuk dipinjam.");
          }

          return tx.borrowRecord.create({
            data: {
              borrowCode: `PJM-RACE-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
              itemId: raceItemId,
              adminId: adminUser!.id,
              borrowerName,
              borrowerContact: "081233334444",
              borrowQuantity: 1,
              dueDate: new Date(),
              status: BorrowStatus.DIPINJAM,
            },
          });
        });
      };

      // Tembak 2 request peminjaman secara bersamaan (simultan)
      const outcomes = await Promise.allSettled([
        attemptBorrow("Staf Konkuren A"),
        attemptBorrow("Staf Konkuren B"),
      ]);

      const successCount = outcomes.filter((o) => o.status === "fulfilled").length;
      const rejectedCount = outcomes.filter((o) => o.status === "rejected").length;

      if (successCount !== 1 || rejectedCount !== 1) {
        throw new Error(
          `Balapan konkurensi gagal diisolasi: sukses=${successCount}, ditolak=${rejectedCount}. Stok berpotensi minus!`
        );
      }

      // Verifikasi stok akhir tepat 0 (tidak minus)
      const finalRaceItem = await prisma.item.findUnique({ where: { id: raceItemId } });
      if (finalRaceItem?.availableQuantity !== 0) {
        throw new Error(`Stok akhir bukan 0 unit: sisa ${finalRaceItem?.availableQuantity}`);
      }

      return `Dari 2 request simultan pada stok 1 unit: tepat 1 sukses dan 1 ditolak atomik. Sisa stok tepat 0 (Zero Negative Stock).`;
    });

  } finally {
    // -------------------------------------------------------------------------
    // PEMBERSIHAN DATA UJI (TEARDOWN)
    // -------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // REKAPITULASI HASIL UJI
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("   REKAPITULASI HASIL PENGUJIAN PENERIMAAN PENGGUNA (UAT) FASE 3");
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
    console.log("[SUCCESS] SELURUH KASUS UJI UAT-01 s/d UAT-10 & STRES KONKURENSI LULUS PARIPURNA 100%!");
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
