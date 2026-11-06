import type { Metadata } from "next";
import { getManagedUsersAction } from "@/actions/user-actions";
import { UserManagementClient } from "@/components/users/user-management-client";
import { requireAdmin } from "@/lib/dal";

export const metadata: Metadata = {
  title: "Kelola Akun User — BPTI Inventaris",
  description: "Kelola akun pengguna yang terdaftar pada sistem inventaris BPTI",
};

export default async function PenggunaPage() {
  await requireAdmin();
  const users = await getManagedUsersAction();

  return (
    <div className="flex h-full flex-1 flex-col min-h-0 overflow-hidden">
      <div className="shrink-0 space-y-0.5 pb-2.5">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Kelola Akun User
        </h1>
        <p className="text-xs text-muted-foreground">
          Lihat, tambah, ubah, dan hapus akun pengguna yang terdaftar.
        </p>
      </div>
      <UserManagementClient initialUsers={users} />
    </div>
  );
}
