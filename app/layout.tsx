import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sistem Inventaris BPTI",
    template: "%s | BPTI Inventaris",
  },
  description:
    "Sistem Manajemen Inventaris & Sirkulasi Aset Badan Pengembangan Teknologi Informasi (BPTI)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary`}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
