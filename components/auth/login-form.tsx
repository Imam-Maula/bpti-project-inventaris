"use client";

import { useActionState, useState } from "react";
import { loginAction, type AuthActionResult } from "@/actions/auth-actions";
import { User, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

const initialState: AuthActionResult = {
  success: false,
};

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {/* Banner Pesan Error */}
      {!state.success && state.message && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="leading-snug">
            <span className="font-semibold">Gagal masuk:</span> {state.message}
          </div>
        </div>
      )}

      {/* Input Username */}
      <div className="space-y-1.5">
        <label
          htmlFor="username"
          className="block text-sm font-medium text-foreground"
        >
          Username
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <User className="h-4 w-4" />
          </div>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            required
            disabled={isPending}
            placeholder="Masukkan username"
            className="w-full rounded-md border border-input bg-background py-2 pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-150 focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        {state.errors?.username && (
          <p className="text-xs text-destructive">
            {state.errors.username[0]}
          </p>
        )}
      </div>

      {/* Input Password */}
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-foreground"
        >
          Kata Sandi
        </label>
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
  );
}
