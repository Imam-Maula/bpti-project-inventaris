import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { recordAuditLogService } from "@/lib/services/audit-service";
import { requireAdmin } from "@/lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function detectImageType(bytes: Uint8Array) {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

type RouteContext = { params: Promise<{ itemId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await verifySession();
  if (!session) {
    return Response.json({ message: "Sesi tidak valid." }, { status: 401 });
  }

  const { itemId } = await params;
  const image = await prisma.itemImage.findUnique({
    where: { itemId },
    select: { imageData: true, mimeType: true },
  });

  if (!image) {
    return Response.json({ message: "Gambar barang belum tersedia." }, { status: 404 });
  }

  return new Response(new Uint8Array(image.imageData), {
    headers: {
      "Content-Type": image.mimeType,
      "Content-Length": String(image.imageData.byteLength),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const session = await requireAdmin();

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMAGE_SIZE + 64 * 1024) {
    return Response.json(
      { message: "Ukuran gambar maksimal 5 MB." },
      { status: 413 }
    );
  }

  const { itemId } = await params;
  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return Response.json({ message: "Pilih file gambar terlebih dahulu." }, { status: 400 });
  }
  if (!allowedMimeTypes.has(file.type)) {
    return Response.json(
      { message: "Format gambar harus JPG, PNG, atau WebP." },
      { status: 400 }
    );
  }
  if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    return Response.json(
      { message: "Ukuran gambar harus lebih dari 0 dan maksimal 5 MB." },
      { status: 400 }
    );
  }

  const imageData = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectImageType(imageData);
  if (!mimeType || mimeType !== file.type) {
    return Response.json(
      { message: "Isi file tidak sesuai dengan format gambar yang dipilih." },
      { status: 400 }
    );
  }

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, name: true, code: true },
  });
  if (!item) {
    return Response.json({ message: "Data barang tidak ditemukan." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.itemImage.upsert({
      where: { itemId },
      create: { itemId, imageData: Buffer.from(imageData), mimeType },
      update: { imageData: Buffer.from(imageData), mimeType },
    });
    await recordAuditLogService(tx, {
      action: "UBAH_GAMBAR_BARANG",
      entityType: "ITEM",
      entityId: itemId,
      adminId: session.userId,
      details: `Mengunggah gambar untuk barang "${item.name}" (${item.code}).`,
      newValue: { mimeType, size: imageData.byteLength },
    });
  });

  return Response.json({ message: "Gambar barang berhasil disimpan." });
}
