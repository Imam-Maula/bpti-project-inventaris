import "server-only";
import nodemailer from "nodemailer";

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  const user = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  if (!user || !appPassword) {
    throw new Error(
      "Email OTP belum dikonfigurasi. Isi GMAIL_USER dan GMAIL_APP_PASSWORD pada .env."
    );
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });

  await transporter.sendMail({
    from: `"Inventaris BPTI" <${user}>`,
    to: email,
    subject: "Kode verifikasi akun Inventaris BPTI",
    text: `Kode OTP Anda adalah ${code}. Kode ini berlaku selama 5 menit.`,
    html: `<p>Kode OTP Anda:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${code}</p><p>Kode ini berlaku selama 5 menit. Jangan bagikan kode ini kepada siapa pun.</p>`,
  });
}
