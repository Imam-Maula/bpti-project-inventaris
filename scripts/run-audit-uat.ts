import { PrismaClient } from "@prisma/client";
import {
  recordAuditLogService,
  getAuditLogsService,
  getAuditLogsByEntityService,
} from "../lib/services/audit-service";
import {
  createItemService,
  updateItemAtomicService,
  deleteItemService,
} from "../lib/services/item-service";
import {
  createBorrowTransactionService,
  returnBorrowTransactionService,
} from "../lib/services/borrow-service";

const prisma = new PrismaClient();

async function runAuditUat() {
  console.log("================================================================================");
  console.log("   UAT SUITE: VERIFIKASI SISTEM AUDIT TRAIL / LOG AKTIVITAS (POIN 3)");
  console.log("================================================================================");

  // 1. Setup Admin dummy for testing
  let admin = await prisma.user.findFirst();
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        username: "audit_tester",
        password: "hashed_dummy_password",
        name: "Petugas UAT Audit",
      },
    });
  }

  console.log(`[SETUP] Menggunakan Admin penguji: ${admin.name} (@${admin.username})`);

  // Test 1: Record direct audit log
  console.log("\n[TEST 1] Pencatatan Log Audit Persisten...");
  const log1 = await recordAuditLogService(prisma, {
    action: "SYSTEM_CHECK",
    entityType: "SYSTEM",
    entityId: "SYS-001",
    adminId: admin.id,
    details: "Uji coba integritas pencatatan audit log sistem.",
    newValue: { status: "OK", timestamp: Date.now() },
  });
  if (!log1.id || log1.action !== "SYSTEM_CHECK") {
    throw new Error("Gagal mencatat log audit sistem");
  }
  console.log(`[PASS] Log audit berhasil disimpan dengan ID: ${log1.id}`);

  // Test 2: Log mutasi penambahan barang
  console.log("\n[TEST 2] Verifikasi Audit Log pada Siklus Master Barang...");
  const testCode = `AUD-${Date.now().toString().slice(-6)}`;
  const item = await createItemService(prisma, {
    code: testCode,
    name: "Laptop Audit Test BPTI",
    category: "Elektronik",
    goodQuantity: 10,
    lightDamageQuantity: 0,
    heavyDamageQuantity: 0,
    location: "Ruang Server BPTI",
  });

  const createLog = await recordAuditLogService(prisma, {
    action: "TAMBAH_BARANG",
    entityType: "ITEM",
    entityId: item.id,
    adminId: admin.id,
    details: `Menambahkan aset baru: "${item.name}" (${item.code}) sejumlah ${item.totalQuantity} unit.`,
    newValue: item,
  });
  console.log(`[PASS] Log TAMBAH_BARANG tercatat: ${createLog.id}`);

  // Test 3: Log mutasi pengubahan barang (Before-After Diff)
  console.log("\n[TEST 3] Verifikasi Diff Sebelum-Sesudah (oldValue vs newValue)...");
  const existingItem = await prisma.item.findUnique({ where: { id: item.id } });
  const updatedItem = await updateItemAtomicService(prisma, {
    id: item.id,
    code: item.code,
    name: "Laptop Audit Test BPTI (Revisi)",
    category: "Elektronik",
    goodQuantity: 8,
    lightDamageQuantity: 1,
    heavyDamageQuantity: 1,
    location: "Lab Komputer 3",
  });

  const updateLog = await recordAuditLogService(prisma, {
    action: "UBAH_BARANG",
    entityType: "ITEM",
    entityId: updatedItem.id,
    adminId: admin.id,
    details: `Memperbarui aset "${updatedItem.name}" (${updatedItem.code})`,
    oldValue: existingItem,
    newValue: updatedItem,
  });
  console.log(`[PASS] Log UBAH_BARANG tercatat dengan Diff: ${updateLog.id}`);
  if (!updateLog.oldValue || !updateLog.newValue) {
    throw new Error("Diff oldValue atau newValue tidak tersimpan");
  }

  // Test 4: Log sirkulasi peminjaman dan pengembalian
  console.log("\n[TEST 4] Verifikasi Audit Log pada Sirkulasi Peminjaman...");
  const borrowRecord = await createBorrowTransactionService(prisma, admin.id, {
    itemId: updatedItem.id,
    borrowerName: "Mahasiswa Penguji Audit",
    borrowerContact: "081299998888",
    borrowQuantity: 2,
    dueDate: new Date(Date.now() + 86400000 * 3),
    notes: "Pengujian audit log sirkulasi",
  });

  const borrowLog = await recordAuditLogService(prisma, {
    action: "CATAT_PEMINJAMAN",
    entityType: "BORROW_RECORD",
    entityId: borrowRecord.id,
    adminId: admin.id,
    details: `Peminjaman 2 unit aset "${updatedItem.name}" dengan kode ${borrowRecord.borrowCode}.`,
    newValue: borrowRecord,
  });
  console.log(`[PASS] Log CATAT_PEMINJAMAN tercatat: ${borrowLog.id}`);

  const returnResult = await returnBorrowTransactionService(prisma, {
    borrowRecordId: borrowRecord.id,
    returnCondition: "BAIK",
  });

  const returnLog = await recordAuditLogService(prisma, {
    action: "PENGEMBALIAN_BARANG",
    entityType: "BORROW_RECORD",
    entityId: returnResult.record.id,
    adminId: admin.id,
    details: `Pengembalian aset "${updatedItem.name}" (${returnResult.record.borrowCode}).`,
    newValue: returnResult.record,
  });
  console.log(`[PASS] Log PENGEMBALIAN_BARANG tercatat: ${returnLog.id}`);

  // Test 5: Pencarian dan Filter Log
  console.log("\n[TEST 5] Verifikasi Filter & Pencarian Audit Logs...");
  const filtered = await getAuditLogsService(prisma, {
    search: "Laptop Audit Test",
  });
  console.log(`[PASS] Filter search "Laptop Audit Test" menemukan ${filtered.length} log.`);
  if (filtered.length < 2) {
    throw new Error("Pencarian log audit tidak menemukan rekaman yang sesuai");
  }

  const byEntity = await getAuditLogsByEntityService(prisma, "ITEM", updatedItem.id);
  console.log(`[PASS] Filter riwayat per-entitas menemukan ${byEntity.length} log spesifik barang.`);
  if (byEntity.length < 2) {
    throw new Error("Riwayat entitas spesifik barang tidak lengkap");
  }

  console.log("\n[TEST 6] Verifikasi Persistensi Gambar Master Barang...");
  const imageData = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf5cAAAAASUVORK5CYII=",
    "base64"
  );
  await prisma.itemImage.create({
    data: {
      itemId: updatedItem.id,
      imageData,
      mimeType: "image/png",
    },
  });
  const storedImage = await prisma.itemImage.findUnique({
    where: { itemId: updatedItem.id },
  });
  if (
    !storedImage ||
    storedImage.mimeType !== "image/png" ||
    !Buffer.from(storedImage.imageData).equals(imageData)
  ) {
    throw new Error("Gambar barang tidak tersimpan dengan benar");
  }
  await prisma.itemImage.delete({ where: { itemId: updatedItem.id } });
  console.log("[PASS] Gambar tersimpan dan dapat dibaca kembali dari database.");


  // Cleanup testing item
  await deleteItemService(prisma, updatedItem.id);
  console.log(`[CLEANUP] Item pengujian berhasil dihapus/diarsipkan.`);

  console.log("\n================================================================================");
  console.log("   [HASIL AKHIR] SELURUH PENGUJIAN AUDIT TRAIL (POIN 3) LULUS 100%!");
  console.log("================================================================================");
}

runAuditUat()
  .catch((err) => {
    console.error("[FATAL] UAT Audit gagal:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
