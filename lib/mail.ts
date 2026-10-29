import "server-only";
import nodemailer from "nodemailer";

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!user || !appPassword) {
    console.warn(`\n[OTP SIMULATOR - VERIFIKASI AKUN]\nEmail: ${email}\nKode OTP: ${code}\nBerlaku: 5 menit\n`);
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Email OTP belum dikonfigurasi. Isi GMAIL_USER dan GMAIL_APP_PASSWORD pada .env."
      );
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });

  await transporter.sendMail({
    from: `"Inventaris BPTI" <${user}>`,
    to: email,
    subject: "Kode verifikasi akun Inventaris BPTI",
    text: `Kode OTP verifikasi akun Anda adalah ${code}. Kode ini berlaku selama 5 menit.`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;border:1px solid #e2e8f0;rounded:8px;">
        <h2 style="color:#0f172a;margin-bottom:8px;">Verifikasi Akun Inventaris BPTI</h2>
        <p style="color:#475569;font-size:14px;">Gunakan kode One-Time Password (OTP) berikut untuk menyelesaikan verifikasi akun Anda:</p>
        <div style="background:#f1f5f9;padding:16px;text-align:center;border-radius:6px;margin:20px 0;">
          <span style="font-family:monospace;font-size:32px;font-weight:bold;letter-spacing:8px;color:#2563eb;">${code}</span>
        </div>
        <p style="color:#64748b;font-size:12px;">Kode ini hanya berlaku selama 5 menit. Jangan pernah membagikan kode OTP ini kepada siapapun demi keamanan akun Anda.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetOtpEmail(email: string, code: string): Promise<void> {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!user || !appPassword) {
    console.warn(`\n[OTP SIMULATOR - RESET PASSWORD]\nEmail: ${email}\nKode OTP: ${code}\nBerlaku: 10 menit\n`);
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Email OTP reset password belum dikonfigurasi. Isi GMAIL_USER dan GMAIL_APP_PASSWORD pada .env."
      );
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });

  await transporter.sendMail({
    from: `"Inventaris BPTI" <${user}>`,
    to: email,
    subject: "Kode OTP Reset Kata Sandi Akun BPTI",
    text: `Kode OTP pemulihan kata sandi akun Anda adalah ${code}. Kode ini berlaku selama 10 menit.`,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;border:1px solid #e2e8f0;border-radius:8px;">
        <h2 style="color:#0f172a;margin-bottom:8px;">Permintaan Reset Kata Sandi</h2>
        <p style="color:#475569;font-size:14px;">Kami menerima permintaan untuk mereset kata sandi akun Inventaris BPTI Anda. Masukkan kode OTP berikut:</p>
        <div style="background:#fef2f2;border:1px solid #fee2e2;padding:16px;text-align:center;border-radius:6px;margin:20px 0;">
          <span style="font-family:monospace;font-size:32px;font-weight:bold;letter-spacing:8px;color:#dc2626;">${code}</span>
        </div>
        <p style="color:#64748b;font-size:12px;">Kode berlaku selama 10 menit. Jika Anda tidak merasa meminta reset kata sandi ini, abaikan email ini.</p>
      </div>
    `,
  });
}
