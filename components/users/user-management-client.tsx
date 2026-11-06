"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createManagedUserAction,
  deleteManagedUserAction,
  updateManagedUserAction,
} from "@/actions/user-actions";
import type { UserActionResult } from "@/actions/user-actions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LiveSearch } from "@/components/tables/live-search";
import { Pagination } from "@/components/tables/pagination";
import { useToast } from "@/components/ui/toast";
import {
  CheckCircle2,
  CircleAlert,
  Edit2,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

type ManagedUser = Awaited<ReturnType<typeof import("@/actions/user-actions").getManagedUsersAction>>[number];

interface UserManagementClientProps {
  initialUsers: ManagedUser[];
}

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50";

export function UserManagementClient({ initialUsers }: UserManagementClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return initialUsers.filter((user) =>
      [user.name, user.username, user.email ?? "", user.phone ?? ""]
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [initialUsers, search]);
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const currentPage = totalPages > 0 ? Math.min(page, totalPages) : 1;
  const pageUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const closeModal = () => {
    if (isPending) return;
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleSave = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const values = {
      name: String(formData.get("name") ?? ""),
      username: String(formData.get("username") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    startTransition(async () => {
      const result: UserActionResult = editingUser
        ? await updateManagedUserAction({
            id: editingUser.id,
            ...values,
            isVerified: formData.get("isVerified") === "on",
          })
        : await createManagedUserAction(values);

      if (!result.success) {
        toast.error("Gagal menyimpan akun", result.message);
        return;
      }

      toast.success("Akun berhasil disimpan", result.message);
      setModalOpen(false);
      setEditingUser(null);
      router.refresh();
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await deleteManagedUserAction(deleteTarget.id);
      if (!result.success) {
        toast.error("Gagal menghapus akun", result.message);
        return;
      }
      toast.success("Akun berhasil dihapus", result.message);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  const openCreate = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEdit = (user: ManagedUser) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex shrink-0 flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between">
        <LiveSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Cari nama, username, email, atau telepon..."
          className="w-full sm:max-w-sm"
        />
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Tambah Akun
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-muted/90 text-xs text-muted-foreground backdrop-blur">
            <tr>
              <th className="px-4 py-3 font-medium">Nama / Username</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Telepon</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Terdaftar</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pageUsers.map((user) => (
              <tr key={user.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{user.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">@{user.username}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{user.email ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  {user.isVerified ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Terverifikasi
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <CircleAlert className="h-3.5 w-3.5" />
                      Belum verifikasi
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("id-ID", {
                    dateStyle: "medium",
                  }).format(new Date(user.createdAt))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(user)}
                      aria-label={`Ubah akun ${user.username}`}
                      className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(user)}
                      aria-label={`Hapus akun ${user.username}`}
                      className="rounded-md border border-border p-2 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pageUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {initialUsers.length === 0
                    ? "Belum ada akun user."
                    : "Tidak ada akun yang cocok dengan pencarian."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredUsers.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            aria-label="Tutup dialog"
            className="fixed inset-0 cursor-default bg-black/60"
            onClick={closeModal}
          />
          <form
            onSubmit={handleSave}
            className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg border border-border bg-card p-5 text-card-foreground shadow-lg"
          >
            <div className="mb-5 flex items-start justify-between border-b border-border pb-3">
              <div>
                <h2 id="user-modal-title" className="text-lg font-semibold">
                  {editingUser ? "Ubah Akun User" : "Tambah Akun User"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Akun yang dikelola memiliki akses sebagai user.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                aria-label="Tutup"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-medium">
                Nama lengkap
                <input name="name" required minLength={2} maxLength={100} defaultValue={editingUser?.name ?? ""} className={inputClass} disabled={isPending} />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Username
                <input name="username" required minLength={3} maxLength={50} pattern="[A-Za-z0-9._-]+" defaultValue={editingUser?.username ?? ""} className={inputClass} disabled={isPending} />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Email
                <input name="email" type="email" maxLength={254} required={!editingUser} defaultValue={editingUser?.email ?? ""} className={inputClass} disabled={isPending} />
              </label>
              <label className="space-y-1.5 text-sm font-medium">
                Nomor telepon
                <input name="phone" type="tel" minLength={editingUser ? undefined : 8} maxLength={20} required={!editingUser} defaultValue={editingUser?.phone ?? ""} className={inputClass} disabled={isPending} />
              </label>
              <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
                Kata sandi {editingUser && <span className="font-normal text-muted-foreground">(kosongkan jika tidak diubah)</span>}
                <input name="password" type="password" minLength={8} maxLength={100} required={!editingUser} autoComplete="new-password" className={inputClass} disabled={isPending} />
              </label>
            </div>

            {editingUser && (
              <label className="mt-4 flex cursor-pointer items-center gap-2.5 rounded-md border border-border p-3 text-sm">
                <input
                  type="checkbox"
                  name="isVerified"
                  defaultChecked={editingUser.isVerified}
                  disabled={isPending}
                  className="h-4 w-4 accent-primary"
                />
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Email sudah diverifikasi
                </span>
              </label>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="rounded-md border border-border px-3.5 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingUser ? "Simpan Perubahan" : "Buat Akun"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Hapus akun user?"
        description={`Akun ${deleteTarget?.name ?? ""} (@${deleteTarget?.username ?? ""}) akan dihapus. Riwayat peminjaman tetap tersimpan tanpa tautan ke akun ini.`}
        confirmText="Hapus Akun"
        isPending={isPending}
        onConfirm={handleDelete}
        onClose={() => {
          if (!isPending) setDeleteTarget(null);
        }}
      />

      {isPending && (
        <span className="sr-only" role="status">
          Memproses perubahan akun
        </span>
      )}
    </div>
  );
}
