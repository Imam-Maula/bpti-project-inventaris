import { Condition, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    select: {
      id: true,
      totalQuantity: true,
      goodQuantity: true,
      lightDamageQuantity: true,
      heavyDamageQuantity: true,
      resolvedDamagedQuantity: true,
      condition: true,
    },
  });

  let migratedItems = 0;

  for (const item of items) {
    const initializedQuantity =
      item.goodQuantity +
      item.lightDamageQuantity +
      item.heavyDamageQuantity;
    if (initializedQuantity > 0) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          availableQuantity: item.goodQuantity + item.lightDamageQuantity,
        },
      });
      continue;
    }

    const [damagedReturns, activeBorrowSummary, activeBorrows] =
      await Promise.all([
        prisma.borrowRecord.aggregate({
          where: {
            itemId: item.id,
            status: "DIKEMBALIKAN",
            returnCondition: "RUSAK_BERAT",
          },
          _sum: { borrowQuantity: true },
        }),
        prisma.borrowRecord.aggregate({
          where: { itemId: item.id, status: "DIPINJAM" },
          _sum: { borrowQuantity: true },
        }),
        prisma.borrowRecord.findMany({
          where: { itemId: item.id, status: "DIPINJAM" },
          select: { id: true, borrowQuantity: true },
        }),
      ]);

    const activeBorrowQuantity =
      activeBorrowSummary._sum.borrowQuantity ?? 0;
    const historicalDamagedQuantity =
      damagedReturns._sum.borrowQuantity ?? 0;
    const unborrowedQuantity = Math.max(
      0,
      item.totalQuantity - activeBorrowQuantity
    );
    const historicalHeavyQuantity = Math.max(
      0,
      historicalDamagedQuantity - item.resolvedDamagedQuantity
    );
    const heavyDamageQuantity = Math.min(
      historicalHeavyQuantity ||
        (item.condition === Condition.RUSAK_BERAT
          ? unborrowedQuantity
          : 0),
      unborrowedQuantity
    );
    const lightDamageQuantity =
      item.condition === Condition.RUSAK_RINGAN && historicalHeavyQuantity === 0
        ? unborrowedQuantity
        : 0;
    const goodQuantity = Math.max(
      0,
      unborrowedQuantity - heavyDamageQuantity - lightDamageQuantity
    );
    const condition =
      heavyDamageQuantity > 0
        ? Condition.RUSAK_BERAT
        : lightDamageQuantity > 0
          ? Condition.RUSAK_RINGAN
          : Condition.BAIK;

    await prisma.$transaction(async (tx) => {
      await tx.item.update({
        where: { id: item.id },
        data: {
          goodQuantity,
          lightDamageQuantity,
          heavyDamageQuantity,
          availableQuantity: goodQuantity + lightDamageQuantity,
          condition,
        },
      });

      for (const borrow of activeBorrows) {
        await tx.borrowRecord.update({
          where: { id: borrow.id },
          data: {
            borrowGoodQuantity: borrow.borrowQuantity,
            borrowLightDamageQuantity: 0,
          },
        });
      }
    });
    migratedItems++;
  }

  console.log(
    `[SUCCESS] Backfill kondisi barang selesai. ${migratedItems} barang diperbarui.`
  );
}

main()
  .catch((error) => {
    console.error("[ERROR] Gagal melakukan backfill kondisi barang:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
