"use client";

import { useEffect, useRef } from "react";
import { Printer, X, FileText } from "lucide-react";

export interface BeritaAcaraData {
  id: string;
  borrowCode: string;
  borrowerName: string;
  borrowerContact: string;
  borrowQuantity: number;
  borrowDate: Date | string;
  dueDate: Date | string;
  returnDate?: Date | string | null;
  status: string;
  notes?: string | null;
  item: {
    code: string;
    name: string;
    category?: string;
    location?: string;
    condition?: string;
  };
  admin?: {
    name: string;
    username: string;
  };
}

interface BeritaAcaraDialogProps {
  open: boolean;
  data: BeritaAcaraData | null;
  onClose: () => void;
}

export function BeritaAcaraDialog({
  open,
  data,
  onClose,
}: BeritaAcaraDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !data) return null;

  const formatDate = (val: Date | string) => {
    const d = new Date(val);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const borrowDateStr = formatDate(data.borrowDate);
  const dueDateStr = formatDate(data.dueDate);
  const returnDateStr = data.returnDate ? formatDate(data.returnDate) : "-";
  const yearStr = new Date(data.borrowDate).getFullYear();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Berita Acara Peminjaman Barang"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 print:p-0 print:bg-white print:static"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 print:hidden"
        onClick={onClose}
      />

      {/* Kontainer Surat A4 */}
      <div
        ref={dialogRef}
        className="relative z-10 flex flex-col w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-lg border border-border bg-card shadow-md print:max-w-none print:max-h-none print:overflow-visible print:border-none print:shadow-none print:p-0"
      >
        {/* Tombol Aksi Layar (Hidden Saat Print) */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card px-5 py-3 print:hidden">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <FileText className="h-4 w-4 text-primary" />
            <span>Pratinjau Berita Acara & Bukti Peminjaman (PDF)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-xs hover:bg-primary/90 focus:outline-hidden"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak / Unduh PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-hidden"
              aria-label="Tutup pratinjau"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Lembar Dokumen Resmi KOP BPTI UHAMKA */}
        <div className="p-8 sm:p-10 text-foreground bg-card print:text-black print:bg-white text-sm font-sans space-y-6">
          {/* KOP SURAT RESMI */}
          <div className="text-center pb-4 border-b-4 border-double border-foreground/80 print:border-black space-y-1">
            <h2 className="text-xl font-bold">
              Badan Pengembangan Teknologi Informasi (BPTI)
            </h2>
            <h3 className="text-sm font-semibold text-muted-foreground print:text-gray-800">
              Universitas Muhammadiyah Prof. DR. HAMKA
            </h3>
            <p className="text-xs text-muted-foreground print:text-gray-600">
              Jl. Tanah Merdeka No.6, Rambutan, Ciracas, Jakarta Timur 13830 &bull; Telp: (021) 8400341
            </p>
            <p className="text-[11px] text-muted-foreground print:text-gray-600">
              Layanan Administrasi Inventaris Logistik &bull; Email: bpti@uhamka.ac.id
            </p>
          </div>

          {/* JUDUL DOKUMEN & NOMOR */}
          <div className="text-center space-y-1 pt-1">
            <h4 className="text-base font-bold underline">
              Berita Acara Serah Terima Peminjaman Barang Inventaris
            </h4>
            {/* deslop-ignore-next-line 34 */}
            <p className="font-mono text-xs text-muted-foreground print:text-gray-700">
              Nomor: BA/{data.borrowCode}/BPTI/{yearStr}
            </p>
          </div>

          {/* PERNYATAAN PEMBUKA */}
          <p className="text-xs sm:text-sm leading-relaxed text-justify">
            Pada hari ini telah dicatat dan diserahkan aset logistik kantor Badan Pengembangan Teknologi Informasi (BPTI) Universitas Muhammadiyah Prof. DR. HAMKA kepada staf/pemohon bersangkutan dengan keterangan transaksi sebagai berikut:
          </p>

          {/* IDENTITAS KEDUA PIHAK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-md border border-border print:border-gray-400 p-4 bg-muted/20 print:bg-transparent text-xs">
            <div className="space-y-1">
              <span className="font-semibold block text-primary print:text-black">Pihak Pertama (Pengelola Aset):</span>
              <p><span className="text-muted-foreground print:text-gray-600">Petugas Admin:</span> {data.admin?.name || "Administrator BPTI"}</p>
              <p><span className="text-muted-foreground print:text-gray-600">Unit Kerja:</span> BPTI UHAMKA</p>
            </div>
            <div className="space-y-1">
              <span className="font-semibold block text-primary print:text-black">Pihak Kedua (Peminjam):</span>
              <p><span className="text-muted-foreground print:text-gray-600">Nama Lengkap:</span> <strong>{data.borrowerName}</strong></p>
              <p><span className="text-muted-foreground print:text-gray-600">No. Kontak / WA:</span> {data.borrowerContact}</p>
            </div>
          </div>

          {/* TABEL RINCIAN BARANG */}
          <div className="overflow-hidden rounded border border-border print:border-gray-400 text-xs">
            <table className="w-full text-left">
              <thead className="border-b border-border print:border-gray-400 bg-muted/50 print:bg-gray-100 font-semibold">
                <tr>
                  <th className="p-2.5">Kode Barang</th>
                  <th className="p-2.5">Nama & Spesifikasi Barang</th>
                  <th className="p-2.5">Lokasi Rak</th>
                  <th className="p-2.5 text-center">Jumlah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border print:divide-gray-300">
                <tr>
                  {/* deslop-ignore-next-line 34 */}
                  <td className="p-2.5 font-mono">{data.item.code}</td>
                  <td className="p-2.5 font-medium">{data.item.name}</td>
                  <td className="p-2.5">{data.item.location || "-"}</td>
                  <td className="p-2.5 text-center font-bold">{data.borrowQuantity} Unit</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* JADWAL & STATUS */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs bg-muted/10 print:bg-transparent border border-border print:border-gray-400 p-3 rounded">
            <div>
              <span className="text-muted-foreground print:text-gray-600 block">Waktu Mulai Pinjam:</span>
              <span className="font-medium">{borrowDateStr}</span>
            </div>
            <div>
              <span className="text-muted-foreground print:text-gray-600 block">Batas Waktu Pengembalian:</span>
              <span className="font-bold text-destructive print:text-black">{dueDateStr}</span>
              {data.returnDate && (
                <span className="text-[11px] text-muted-foreground print:text-gray-600 block mt-0.5">
                  Realisasi Kembali: {returnDateStr}
                </span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground print:text-gray-600 block">Status Sirkulasi:</span>
              <span className="font-semibold">{data.status}</span>
            </div>
          </div>

          {data.notes && (
            <div className="text-xs p-3 rounded bg-muted/20 print:bg-gray-50 border border-border print:border-gray-300">
              <span className="font-semibold block mb-0.5">Catatan Keperluan / Fisik Aset:</span>
              <p className="italic text-muted-foreground print:text-gray-700">{data.notes}</p>
            </div>
          )}

          {/* KLAUSUL TANGGUNG JAWAB */}
          <div className="text-[11px] leading-relaxed text-muted-foreground print:text-gray-700 space-y-1">
            <p className="font-semibold text-foreground print:text-black">Ketentuan Penggunaan:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Peminjam wajib memelihara dan menjaga fisik barang inventaris dengan sebaik-baiknya.</li>
              <li>Barang wajib dikembalikan selambat-lambatnya pada tanggal batas waktu pengembalian yang disepakati.</li>
              <li>Kerusakan fisik parah atau kehilangan selama masa pinjam menjadi tanggung jawab pihak peminjam untuk diperbaiki atau diganti.</li>
            </ol>
          </div>

          {/* KOLOM TANDA TANGAN RESMI TIGA PIHAK */}
          <div className="pt-6 flex flex-row justify-between text-center text-xs print:pt-10">
            <div className="flex-1 space-y-16">
              <p>Pihak Peminjam,</p>
              <div className="space-y-0.5">
                <p className="font-bold underline">{data.borrowerName}</p>
                <p className="text-[10px] text-muted-foreground print:text-gray-600">Staf Peminjam</p>
              </div>
            </div>

            <div className="flex-1 space-y-16">
              <p>Petugas Penyerah,</p>
              <div className="space-y-0.5">
                <p className="font-bold underline">{data.admin?.name || "Admin Logistik"}</p>
                <p className="text-[10px] text-muted-foreground print:text-gray-600">Staf BPTI UHAMKA</p>
              </div>
            </div>

            <div className="flex-1 space-y-16">
              <p>Mengetahui,</p>
              <div className="space-y-0.5">
                <p className="font-bold underline">Kepala BPTI UHAMKA</p>
                <p className="text-[10px] text-muted-foreground print:text-gray-600">NIDN / NIP Institusi</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
