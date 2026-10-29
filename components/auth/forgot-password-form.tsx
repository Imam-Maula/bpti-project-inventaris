"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  type AuthActionResult,
} from "@/actions/auth-actions";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<"EMAIL" | "OTP_AND_PASSWORD" | "SUCCESS">("EMAIL");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<AuthActionResult | null>(null);

  const handleRequestOtp = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await requestPasswordResetOtp(email);
      setMessage(result);
      if (result.success) {
        setStep("OTP_AND_PASSWORD");
      }
    });
  };

  const handleResetPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({
        success: false,
        message: "Konfirmasi kata sandi tidak cocok dengan kata sandi baru.",
      });
      return;
    }

    startTransition(async () => {
      const result = await resetPasswordWithOtp({
        email,
        code,
        newPassword,
        confirmPassword,
      });
      setMessage(result);
      if (result.success) {
        setStep("SUCCESS");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Alert Banner */}
      {message && (
        <div
          role={message.success ? "status" : "alert"}
          className={`flex items-start gap-2.5 rounded-md border p-3 text-sm ${
            message.success
              ? "border-emerald-500/25 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
              : "border-destructive/25 bg-destructive/5 text-destructive"
          }`}
        >
          {message.success ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{message.message}</span>
        </div>
      )}

      {/* Step 1: Input Email */}
      {step === "EMAIL" && (
        <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Alamat Email Terdaftar
            </label>
            <p className="text-xs text-muted-foreground">
              Masukkan email akun Anda. Kami akan mengirimkan 6 digit kode OTP pemulihan kata sandi.
            </p>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                disabled={isPending}
                placeholder="nama@uhamka.ac.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2 pr-3 pl-9 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !email.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mengirim Kode OTP...</span>
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                <span>Kirim Kode OTP</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Step 2: Input OTP & Kata Sandi Baru */}
      {step === "OTP_AND_PASSWORD" && (
        <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
          {/* OTP Code */}
          <div className="space-y-1.5">
            <label htmlFor="otp" className="block text-sm font-medium text-foreground">
              Kode OTP (6 Digit)
            </label>
            <p className="text-xs text-muted-foreground">
              Masukkan kode verifikasi yang dikirim ke <span className="font-semibold text-foreground">{email}</span>. Berlaku 10 menit.
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
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              disabled={isPending}
              placeholder="000000"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-xl tracking-[0.5em] text-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="block text-sm font-medium text-foreground">
              Kata Sandi Baru
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="newPassword"
                name="newPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                maxLength={100}
                autoComplete="new-password"
                disabled={isPending}
                placeholder="Minimal 8 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2 pr-10 pl-9 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isPending}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
              Konfirmasi Kata Sandi Baru
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                maxLength={100}
                autoComplete="new-password"
                disabled={isPending}
                placeholder="Ulangi kata sandi baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2 pr-10 pl-9 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || code.length !== 6 || newPassword.length < 8 || !confirmPassword}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 focus:outline-hidden focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memperbarui Kata Sandi...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4" />
                <span>Simpan Kata Sandi Baru</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setStep("EMAIL");
              setCode("");
              setNewPassword("");
              setConfirmPassword("");
              setMessage(null);
            }}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Gunakan email yang berbeda
          </button>
        </form>
      )}

      {/* Step 3: Success */}
      {step === "SUCCESS" && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground">Kata Sandi Berhasil Direset</h3>
            <p className="text-xs text-muted-foreground">
              Silakan masuk kembali menggunakan alamat username atau email Anda bersama kata sandi baru.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/login?reset=1")}
            className="w-full rounded-md bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            Menuju Halaman Masuk
          </button>
        </div>
      )}

      {/* Back to Login link */}
      {step !== "SUCCESS" && (
        <p className="text-center text-xs text-muted-foreground">
          Sudah ingat kata sandi Anda?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Kembali Masuk
          </Link>
        </p>
      )}
    </div>
  );
}

