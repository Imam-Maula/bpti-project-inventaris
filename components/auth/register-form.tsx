// deslop-ignore-file 34
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  registerUser,
  verifyOtp,
  type AuthActionResult,
} from "@/actions/auth-actions";
import {
  USER_CATEGORIES,
  USER_CATEGORY_DETAILS,
  type UserCategoryValue,
} from "@/lib/user-categories";
import { AlertCircle, Loader2, Mail, Phone, UserPlus } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [userCategory, setUserCategory] = useState<UserCategoryValue>("DOSEN");
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<AuthActionResult | null>(null);

  const handleRegister = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage(null);

    startTransition(async () => {
      const result = await registerUser({
        name: String(formData.get("name") ?? ""),
        userCategory,
        identityNumber: String(formData.get("identityNumber") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        password: String(formData.get("password") ?? ""),
      });
      setMessage(result);
      if (result.success && result.email) {
        setEmail(result.email);
        setOtpSent(true);
      }
    });
  };

  const handleVerify = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await verifyOtp(email, code);
      setMessage(result);
      if (result.success) {
        router.push("/login?verified=1");
      }
    });
  };

  return (
    <div className="space-y-4">
      {message && (
        <div
          role={message.success ? "status" : "alert"}
          className={`flex items-start gap-2.5 rounded-md border p-3 text-sm ${
            message.success
              ? "border-border bg-muted text-foreground"
              : "border-destructive/25 bg-destructive/5 text-destructive"
          }`}
        >
          {message.success ? (
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{message.message}</span>
        </div>
      )}

      {!otpSent ? (
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium text-foreground">
              Nama Lengkap
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={100}
              autoComplete="name"
              disabled={isPending}
              placeholder="Contoh: Budi Santoso"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
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
            {message?.errors?.userCategory && (
              <p className="text-xs text-destructive">{message.errors.userCategory[0]}</p>
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
            {message?.errors?.identityNumber && (
              <p className="text-xs text-destructive">{message.errors.identityNumber[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Alamat Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              disabled={isPending}
              placeholder="nama@uhamka.ac.id"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="phone" className="block text-sm font-medium text-foreground flex items-center gap-1.5">
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
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Kata Sandi
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={100}
              autoComplete="new-password"
              disabled={isPending}
              placeholder="Minimal 8 karakter"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Daftar dan Kirim OTP
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="otp" className="block text-sm font-medium text-foreground">
              Kode OTP
            </label>
            <p className="text-xs text-muted-foreground">
              Masukkan kode 6 digit yang dikirim ke {email}. Kode berlaku 5 menit.
            </p>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={isPending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-lg tracking-[0.5em] text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={isPending || code.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Verifikasi Email
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setOtpSent(false);
              setCode("");
              setMessage(null);
            }}
            className="w-full text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Kembali ke formulir pendaftaran
          </button>
        </form>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Sudah memiliki akun?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
