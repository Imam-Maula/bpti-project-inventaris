# Sistem Inventaris Aset BPTI UHAMKA

Aplikasi manajemen dan sirkulasi aset inventaris Biro Pengembang Teknologi Informasi (BPTI) UHAMKA berbasis Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, dan Prisma ORM dengan basis data MySQL.

---

## 🛠️ Prasyarat Lingkungan
- **Node.js**: Versi 20+ (Direkomendasikan v24 LTS)
- **Package Manager**: [pnpm](https://pnpm.io/) (`corepack enable` atau `npm i -g pnpm`)
- **Basis Data**: MySQL (XAMPP / Laragon / MySQL Service aktif pada port 3306)

---

## 🚀 Panduan Setup Proyek

### 1. Kloning dan Instalasi Dependensi
```bash
git clone https://github.com/Imam-Maula/bpti-project-inventaris.git
cd bpti-project-inventaris
pnpm install
```
*(Prisma Client otomatis ter-generate saat install berkat script `postinstall`).*

### 2. Konfigurasi Lingkungan (`.env`)
Salin file template `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Sesuaikan kredensial MySQL lokal Anda:
```env
DATABASE_URL="mysql://root:@localhost:3306/db_inventaris_bpti"
SESSION_SECRET="ganti_dengan_rahasia_sesi_acak_minimal_32_karakter"
```

### 3. Sinkronisasi Basis Data
Pastikan MySQL sudah berjalan dan database `db_inventaris_bpti` telah dibuat, lalu jalankan:
```bash
pnpm db:push
```

### 4. Menjalankan Server Pengembangan
```bash
pnpm dev
```
Buka peramban di [http://localhost:3000](http://localhost:3000).

---

## 📜 Perintah Script Tersedia

| Perintah | Deskripsi |
|---|---|
| `pnpm dev` | Menjalankan Next.js server dev (Turbopack aktif secara default) |
| `pnpm build` | Membangun bundle produksi |
| `pnpm start` | Menjalankan server aplikasi produksi |
| `pnpm lint` | Menjalankan pengecekan ESLint CLI |
| `pnpm typecheck` | Menjalankan validasi tipe TypeScript (`tsc --noEmit`) |
| `pnpm db:generate` | Melakukan regenerate Prisma Client |
| `pnpm db:push` | Mendorong perubahan skema Prisma ke basis data MySQL |
| `pnpm db:studio` | Membuka antarmuka grafis Prisma Studio di browser |

---

## 📂 Struktur Backend & Server Actions
- `actions/auth-actions.ts`: Autentikasi Admin & Manajemen Sesi.
- `actions/item-actions.ts`: Operasi CRUD Master Barang Inventaris.
- `actions/borrow-actions.ts`: Transaksi Sirkulasi Peminjaman & Pengembalian Aset (Atomik).
- `lib/prisma.ts`: Singleton Prisma Client.
- `lib/validations/`: Skema validasi request menggunakan Zod.
- `prisma/schema.prisma`: Definisi model dan relasi basis data MySQL.
