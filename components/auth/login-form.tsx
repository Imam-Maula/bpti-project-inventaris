"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAction, type AuthActionResult } from "@/actions/auth-actions";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import {
  USER_CATEGORIES,
  USER_CATEGORY_DETAILS,
  type UserCategoryValue,
} from "@/lib/user-categories";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const initialState: AuthActionResult = {
  success: false,
};

interface LoginFormProps {
  initialError?: string;
  isVerifiedNotice?: boolean;
  showGoogleSimulator?: boolean;
}

export function LoginForm({
  initialError,
  isVerifiedNotice = false,
  showGoogleSimulator = false,
}: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [userCategory, setUserCategory] = useState<UserCategoryValue>("DOSEN");
  const [simEmail, setSimEmail] = useState("mahasiswa.demo@gmail.com");
  const [simName, setSimName] = useState("Mahasiswa Demo Google");

  const activeErrorMessage = !state.success ? (state.message ?? initialError) : undefined;

  return (
    <div className="space-y-4">
      {isVerifiedNotice && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-md border border-border bg-muted p-3 text-sm text-foreground"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="leading-snug">
            Email berhasil diverifikasi. Silakan masuk dengan akun Anda.
          </div>
        </div>
      )}

      {/* Banner Pesan Error */}
      {activeErrorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="leading-snug">
            <span className="font-semibold">Gagal masuk:</span> {activeErrorMessage}
          </div>
        </div>
      )}

      <form action={formAction} className="space-y-4" noValidate>

      <div className="space-y-1.5">
        <label
          htmlFor="userCategory"
          className="block text-sm font-medium text-foreground"
        >
          Kategori Pengguna
        </label>
        <select
          id="userCategory"
          name="userCategory"
          value={userCategory}
          onChange={(event) => setUserCategory(event.target.value as UserCategoryValue)}
          required
          disabled={isPending}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {USER_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {USER_CATEGORY_DETAILS[category].label}
            </option>
          ))}
        </select>
        {state.errors?.userCategory && (
          <p className="text-xs text-destructive">{state.errors.userCategory[0]}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="identifier"
          className="block text-sm font-medium text-foreground"
        >
          {USER_CATEGORY_DETAILS[userCategory].identifierLabel}
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <User className="h-4 w-4" />
          </div>
          <input
            key={userCategory}
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            required
            disabled={isPending}
            placeholder={`Masukkan ${USER_CATEGORY_DETAILS[userCategory].identifierLabel}`}
            className="w-full rounded-md border border-input bg-background py-2 pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-150 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {state.errors?.identifier && (
          <p className="text-xs text-destructive">
            {state.errors.identifier[0]}
          </p>
        )}
      </div>

      {/* Input Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-foreground"
          >
            Kata Sandi
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary hover:underline"
          >
            Lupa kata sandi?
          </Link>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <Lock className="h-4 w-4" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={isPending}
            placeholder="Masukkan kata sandi"
            className="w-full rounded-md border border-input bg-background py-2 pr-10 pl-9 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-150 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isPending}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary rounded-sm"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {state.errors?.password && (
          <p className="text-xs text-destructive">
            {state.errors.password[0]}
          </p>
        )}
      </div>

      {/* Tombol Submit Solid */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors duration-150 hover:bg-primary/90 focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Memverifikasi...</span>
          </span>
        ) : (
          "Masuk"
        )}
      </button>
    </form>

    <div className="relative flex items-center py-0.5">
      <div className="grow border-t border-border" />
      <span className="mx-3 shrink text-xs text-muted-foreground">atau</span>
      <div className="grow border-t border-border" />
    </div>

    <GoogleSignInButton label="Masuk dengan Akun Google" />

    {showGoogleSimulator && (
      <form
        action="/api/auth/google/callback"
        method="GET"
        className="space-y-3 rounded-md border border-border bg-muted/60 p-3.5 text-xs"
      >
        <input type="hidden" name="sim" value="1" />
        <div className="space-y-0.5">
          <p className="font-semibold text-foreground">
            Simulator Akun Google (Mode Dev)
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Kredensial GOOGLE_CLIENT_ID belum diisi di .env. Gunakan simulasi akun Google berikut untuk menguji alur OAuth secara lokal.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="simEmail" className="block font-medium text-foreground">
            Email Google Simulasi
          </label>
          <input
            id="simEmail"
            name="email"
            type="email"
            required
            value={simEmail}
            onChange={(event) => setSimEmail(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="simName" className="block font-medium text-foreground">
            Nama Tampilan Google
          </label>
          <input
            id="simName"
            name="name"
            type="text"
            required
            minLength={2}
            value={simName}
            onChange={(event) => setSimName(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/15"
        >
          Lanjutkan Simulasi Login Google
        </button>
      </form>
    )}

    <p className="text-center text-xs text-muted-foreground">
      Belum punya akun?{" "}
      <Link href="/register" className="font-medium text-primary hover:underline">
        Daftar sebagai User
      </Link>
    </p>
    </div>
  );
}
