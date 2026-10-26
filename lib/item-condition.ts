import { Condition } from "@prisma/client";

/**
 * Menghitung kondisi dominan dari suatu jenis barang
 * berdasarkan perbandingan kuantitas kondisi fisiknya.
 */
export function getDominantCondition(
  goodQuantity: number,
  lightDamageQuantity: number,
  heavyDamageQuantity: number
): Condition {
  if (
    goodQuantity >= lightDamageQuantity &&
    goodQuantity >= heavyDamageQuantity
  ) {
    return Condition.BAIK;
  }
  if (lightDamageQuantity >= heavyDamageQuantity) {
    return Condition.RUSAK_RINGAN;
  }
  return Condition.RUSAK_BERAT;
}
