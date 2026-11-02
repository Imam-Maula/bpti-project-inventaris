import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sistem Inventaris BPTI",
    template: "%s | BPTI Inventaris",
  },
  description:
    "Sistem Manajemen Inventaris & Sirkulasi Aset Badan Pengembangan Teknologi Informasi (BPTI) UHAMKA",
  icons: {
    icon: "/logo-bpti.png",
    shortcut: "/logo-bpti.png",
    apple: "/logo-bpti.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} min-h-screen bg-background text-foreground antialiased selection:bg-primary/20 selection:text-primary font-sans`}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
