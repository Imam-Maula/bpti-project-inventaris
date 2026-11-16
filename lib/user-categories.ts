export const USER_CATEGORIES = ["DOSEN", "MAHASISWA", "STAFF"] as const;

export type UserCategoryValue = (typeof USER_CATEGORIES)[number];

export const USER_CATEGORY_DETAILS: Record<
  UserCategoryValue,
  { label: string; identifierLabel: string }
> = {
  DOSEN: { label: "Dosen", identifierLabel: "NIDN" },
  MAHASISWA: { label: "Mahasiswa", identifierLabel: "NIM" },
  STAFF: { label: "Staff/Tendik", identifierLabel: "NIP" },
};
