import { PrismaClient, Condition } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai proses seeding basis data...");

  // 1. Seed Akun Admin Pertama
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashedPassword,
      name: "Administrator BPTI",
    },
  });
  console.log(`✅ Admin terdaftar/diperbarui: ${admin.username} (ID: ${admin.id})`);

  // 2. Seed Contoh Data Master Barang
  const sampleItems = [
    {
      code: "BRG-001",
      name: "Laptop Lenovo ThinkPad L14",
      category: "Elektronik",
      totalQuantity: 5,
      availableQuantity: 5,
      location: "Ruang Server BPTI",
      condition: Condition.BAIK,
    },
    {
      code: "BRG-002",
      name: "Proyektor Epson EB-X500",
      category: "Multimedia",
      totalQuantity: 3,
      availableQuantity: 3,
      location: "Gudang BPTI Lt. 2",
      condition: Condition.BAIK,
    },
    {
      code: "BRG-003",
      name: "Kabel HDMI 10 Meter",
      category: "Aksesoris",
      totalQuantity: 10,
      availableQuantity: 10,
      location: "Lemari Aset 1",
      condition: Condition.BAIK,
    },
    {
      code: "BRG-004",
      name: "Wireless Presenter Laser Pointer",
      category: "Aksesoris",
      totalQuantity: 4,
      availableQuantity: 4,
      location: "Meja Admin",
      condition: Condition.BAIK,
    },
  ];

  for (const item of sampleItems) {
    const record = await prisma.item.upsert({
      where: { code: item.code },
      update: {},
      create: item,
    });
    console.log(`📦 Barang siap: [${record.code}] ${record.name}`);
  }

  console.log("✨ Seeding basis data selesai dengan sukses!");
}

main()
  .catch((e) => {
    console.error("❌ Terjadi kesalahan saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
