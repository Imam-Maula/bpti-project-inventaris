import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";
import { recordAuditLogService } from "@/lib/services/audit-service";
import { requireAdmin } from "@/lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES_PER_ITEM = 3;
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

export async function GET(request: Request, { params }: RouteContext) {
  const session = await verifySession();
  if (!session) {
    return Response.json({ message: "Sesi tidak valid." }, { status: 401 });
  }

  const { itemId } = await params;
  const url = new URL(request.url);
  const infoOnly = url.searchParams.get("info") === "true";
  const indexParam = url.searchParams.get("index") ?? url.searchParams.get("order");
  const imageId = url.searchParams.get("id");

  // Jika klien meminta daftar metadata gambar (info)
  if (infoOnly) {
    const images = await prisma.itemImage.findMany({
      where: { itemId },
      orderBy: { order: "asc" },
      select: { id: true, order: true, mimeType: true, updatedAt: true },
    });

    return Response.json({
      images: images.map((img) => ({
        id: img.id,
        order: img.order,
        mimeType: img.mimeType,
        url: `/api/items/${itemId}/image?index=${img.order}`,
        updatedAt: img.updatedAt,
      })),
      total: images.length,
    });
  }

  // Jika klien meminta file gambar biner spesifik
  let image = null;
  if (imageId) {
    image = await prisma.itemImage.findFirst({
      where: { id: imageId, itemId },
      select: { imageData: true, mimeType: true },
    });
  } else if (indexParam !== null) {
    const targetOrder = parseInt(indexParam, 10);
    image = await prisma.itemImage.findFirst({
      where: { itemId, order: isNaN(targetOrder) ? 0 : targetOrder },
      select: { imageData: true, mimeType: true },
    });
  } else {
    // Default gambar pertama (order terendah)
    image = await prisma.itemImage.findFirst({
      where: { itemId },
      orderBy: { order: "asc" },
      select: { imageData: true, mimeType: true },
    });
  }

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
  const { itemId } = await params;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, name: true, code: true },
  });
  if (!item) {
    return Response.json({ message: "Data barang tidak ditemukan." }, { status: 404 });
  }

  const formData = await request.formData();

  // Ambil semua file gambar yang dikirim (bisa multiple "images" atau single "image")
  const rawFiles = [
    ...formData.getAll("images"),
    ...formData.getAll("image"),
  ].filter((f): f is File => f instanceof File && f.size > 0);

  if (rawFiles.length === 0) {
    return Response.json({ message: "Pilih minimal 1 file gambar." }, { status: 400 });
  }

  if (rawFiles.length > MAX_IMAGES_PER_ITEM) {
    return Response.json(
      { message: `Jumlah gambar melebihi batas maksimal ${MAX_IMAGES_PER_ITEM} gambar per barang.` },
      { status: 400 }
    );
  }

  const processedImages: { data: Buffer; mimeType: string }[] = [];

  for (let i = 0; i < rawFiles.length; i++) {
    const file = rawFiles[i];
    if (!allowedMimeTypes.has(file.type)) {
      return Response.json(
        { message: `Format gambar ke-${i + 1} (${file.name}) harus JPG, PNG, atau WebP.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return Response.json(
        { message: `Ukuran gambar ke-${i + 1} (${file.name}) melebihi batas maksimal 5 MB.` },
        { status: 400 }
      );
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const detectedType = detectImageType(fileBytes);
    if (!detectedType || detectedType !== file.type) {
      return Response.json(
        { message: `Isi file ke-${i + 1} (${file.name}) tidak sesuai dengan format gambar yang valid.` },
        { status: 400 }
      );
    }

    processedImages.push({
      data: Buffer.from(fileBytes),
      mimeType: detectedType,
    });
  }

  await prisma.$transaction(async (tx) => {
    // Hapus gambar lama barang ini
    await tx.itemImage.deleteMany({
      where: { itemId },
    });

    // Simpan gambar baru sesuai urutan (0, 1, 2)
    for (let i = 0; i < processedImages.length; i++) {
      await tx.itemImage.create({
        data: {
          itemId,
          imageData: processedImages[i].data,
          mimeType: processedImages[i].mimeType,
          order: i,
        },
      });
    }

    await recordAuditLogService(tx, {
      action: "UBAH_GAMBAR_BARANG",
      entityType: "ITEM",
      entityId: itemId,
      adminId: session.userId,
      details: `Mengunggah ${processedImages.length} gambar untuk barang "${item.name}" (${item.code}).`,
      newValue: {
        totalImages: processedImages.length,
        formats: processedImages.map((img) => img.mimeType),
      },
    });
  });

  return Response.json({
    message: `${processedImages.length} gambar barang berhasil disimpan.`,
    total: processedImages.length,
  });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await requireAdmin();
  const { itemId } = await params;

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { id: true, name: true, code: true },
  });
  if (!item) {
    return Response.json({ message: "Data barang tidak ditemukan." }, { status: 404 });
  }

  const url = new URL(request.url);
  const imageId = url.searchParams.get("id");
  const indexParam = url.searchParams.get("index");

  await prisma.$transaction(async (tx) => {
    if (imageId) {
      await tx.itemImage.deleteMany({ where: { id: imageId, itemId } });
    } else if (indexParam !== null) {
      const order = parseInt(indexParam, 10);
      await tx.itemImage.deleteMany({ where: { itemId, order } });
    } else {
      await tx.itemImage.deleteMany({ where: { itemId } });
    }

    // Rapikan kembali urutan order (0, 1, 2...)
    const remaining = await tx.itemImage.findMany({
      where: { itemId },
      orderBy: { order: "asc" },
    });
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].order !== i) {
        await tx.itemImage.update({
          where: { id: remaining[i].id },
          data: { order: i },
        });
      }
    }

    await recordAuditLogService(tx, {
      action: "HAPUS_GAMBAR_BARANG",
      entityType: "ITEM",
      entityId: itemId,
      adminId: session.userId,
      details: `Menghapus gambar dari barang "${item.name}" (${item.code}).`,
    });
  });

  return Response.json({ message: "Gambar berhasil dihapus." });
}
