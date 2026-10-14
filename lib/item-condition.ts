import { Condition } from "@prisma/client";

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
