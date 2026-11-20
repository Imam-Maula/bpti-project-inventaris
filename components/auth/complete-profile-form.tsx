"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  completeGoogleProfileAction,
  logoutAction,
  type AuthActionResult,
} from "@/actions/auth-actions";
import {
  USER_CATEGORIES,
  USER_CATEGORY_DETAILS,
  type UserCategoryValue,
} from "@/lib/user-categories";
import { AlertCircle, CheckCircle2, Loader2, LogOut, Mail, Phone } from "lucide-react";

interface CompleteProfileFormProps {
  initialName: string;
  email: string;
}

export function CompleteProfileForm({
  initialName,
  email,
}: CompleteProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [userCategory, setUserCategory] = useState<UserCategoryValue>("MAHASISWA");
  const [result, setResult] = useState<AuthActionResult | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setResult(null);

    startTransition(async () => {
      const response = await completeGoogleProfileAction({
        name: String(formData.get("name") ?? ""),
        userCategory,
        identityNumber: String(formData.get("identityNumber") ?? ""),
        phone: String(formData.get("phone") ?? ""),
      });

      setResult(response);
      if (response.success) {
        router.push("/barang");
        router.refresh();
      }
    });
  };

  const handleSwitchAccount = () => {
    startTransition(async () => {
      await logoutAction();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted px-3 py-2 text-xs text-foreground">
        <Mail className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground">Masuk melalui Akun Google</p>
          <p className="truncate font-medium text-foreground">{email}</p>
        </div>
      </div>

      {result && !result.success && result.message && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{result.message}</span>
        </div>
      )}

      {result?.success && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-md border border-border bg-muted p-3 text-sm text-foreground"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>{result.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            Nama Lengkap
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            defaultValue={initialName}
            disabled={isPending}
            placeholder="Nama sesuai kartu identitas kampus"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          {result?.errors?.name && (
            <p className="text-xs text-destructive">{result.errors.name[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="userCategory" className="block text-sm font-medium text-foreground">
            Kategori Pengguna
          </label>
          <select
            id="userCategory"
            name="userCategory"
            value={userCategory}
            onChange={(event) => setUserCategory(event.target.value as UserCategoryValue)}
            required
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            {USER_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {USER_CATEGORY_DETAILS[category].label}
              </option>
            ))}
          </select>
          {result?.errors?.userCategory && (
            <p className="text-xs text-destructive">{result.errors.userCategory[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="identityNumber" className="block text-sm font-medium text-foreground">
            {USER_CATEGORY_DETAILS[userCategory].identifierLabel}
          </label>
          <input
            key={userCategory}
            id="identityNumber"
            name="identityNumber"
            type="text"
            inputMode="numeric"
            required
            minLength={1}
            maxLength={30}
            pattern="[0-9]+"
            autoComplete="off"
            disabled={isPending}
            placeholder={`Masukkan ${USER_CATEGORY_DETAILS[userCategory].identifierLabel}`}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          {result?.errors?.identityNumber && (
            <p className="text-xs text-destructive">{result.errors.identityNumber[0]}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="phone"
            className="flex items-center gap-1.5 text-sm font-medium text-foreground"
          >
            <Phone className="h-4 w-4 text-primary" />
            Nomor Telepon / WhatsApp
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            minLength={8}
            maxLength={20}
            placeholder="Contoh: 081234567890"
            autoComplete="tel"
            disabled={isPending}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          {result?.errors?.phone && (
            <p className="text-xs text-destructive">{result.errors.phone[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          <span>Simpan & Lanjutkan ke Katalog</span>
        </button>
      </form>

      <div className="border-t border-border pt-3 text-center">
        <button
          type="button"
          onClick={handleSwitchAccount}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Bukan akun Anda? Keluar dan ganti akun</span>
        </button>
      </div>
    </div>
  );
}
