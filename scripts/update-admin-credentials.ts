import { Prisma, PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { stdin, stdout } from "node:process";
import { createInterface, emitKeypressEvents } from "node:readline";

const prisma = new PrismaClient();

function ask(question: string): Promise<string> {
  const prompt = createInterface({ input: stdin, output: stdout });
  return new Promise((resolve) => {
    prompt.question(question, (answer) => {
      prompt.close();
      resolve(answer.trim());
    });
  });
}

function askHidden(question: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Jalankan skrip dari terminal interaktif agar password tidak terlihat.");
  }

  emitKeypressEvents(stdin);
  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";

    const finish = (error?: Error) => {
      stdin.off("keypress", onKeypress);
      stdin.setRawMode(false);
      stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };

    const onKeypress = (character: string, key: { name?: string; ctrl?: boolean; meta?: boolean }) => {
      if (key.ctrl && key.name === "c") {
        finish(new Error("Proses dibatalkan."));
      } else if (key.name === "return" || key.name === "enter") {
        finish();
      } else if (key.name === "backspace") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          stdout.write("\b \b");
        }
      } else if (!key.ctrl && !key.meta && character && character >= " ") {
        value += character;
        stdout.write("*");
      }
    };

    stdin.on("keypress", onKeypress);
  });
}

async function main() {
  try {
    console.log("=== Ubah kredensial akun admin ===");
    console.log("Password baru akan disimpan menggunakan bcrypt dan tidak ditampilkan.\n");

    const currentUsername = await ask("Username admin saat ini: ");
    const newUsername = await ask("Username admin baru: ");

    if (!/^[A-Za-z0-9._-]{3,50}$/.test(newUsername)) {
      throw new Error(
        "Username harus berisi 3-50 karakter: huruf, angka, titik, garis bawah, atau tanda hubung."
      );
    }

    const newPassword = await askHidden("Password baru (minimal 12 karakter): ");
    const passwordConfirmation = await askHidden("Ulangi password baru: ");

    if (newPassword.length < 12) {
      throw new Error("Password baru minimal 12 karakter.");
    }
    if (Buffer.byteLength(newPassword, "utf8") > 72) {
      throw new Error("Password baru tidak boleh lebih dari 72 byte UTF-8.");
    }
    if (newPassword !== passwordConfirmation) {
      throw new Error("Konfirmasi password tidak cocok.");
    }

    const admin = await prisma.user.findUnique({
      where: { username: currentUsername },
      select: { id: true, username: true, role: true },
    });

    if (!admin || admin.role !== Role.ADMIN) {
      throw new Error(`Akun admin "${currentUsername}" tidak ditemukan.`);
    }

    console.log(`\nAkun yang akan diubah: ${admin.username} → ${newUsername}`);
    const confirmation = await ask('Ketik "GANTI" untuk menerapkan perubahan: ');
    if (confirmation !== "GANTI") {
      throw new Error("Perubahan dibatalkan; data tidak diubah.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: admin.id },
      data: { username: newUsername, password: passwordHash },
    });

    console.log("\nKredensial admin berhasil diperbarui.");
    console.log("Silakan masuk kembali menggunakan username dan password baru.");
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Username baru sudah digunakan akun lain.");
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "[GAGAL]",
    error instanceof Error ? error.message : "Kesalahan tidak diketahui."
  );
  process.exitCode = 1;
});
