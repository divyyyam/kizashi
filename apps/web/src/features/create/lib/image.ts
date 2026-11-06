/** Downscales an image in the browser (longest side 1200 px) and re-encodes it as WebP. */
export const MAX_SIDE = 1200;

export type PreparedImage = {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  url: string;
};

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Image is too large (15 MB max before resizing)");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot process images");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.85),
  );
  if (!blob) throw new Error("Could not encode the image");
  if (blob.size > 2 * 1024 * 1024) throw new Error("Image is still over 2 MB after resizing");
  return { blob, mime: blob.type || "image/webp", width, height, url: URL.createObjectURL(blob) };
}
