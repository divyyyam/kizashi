import { MAX_IMAGE_BYTES, marketMetadataSchema } from "@kizashi/schemas/market";
import { canonicalBytes, rulesRefOf } from "@/lib/canonical-json";
import { PinataError, pinataConfig, pinFile, sniffImage } from "@/lib/server/pinata";
import { allow, clientKey } from "@/lib/server/rate-limit";

// Pins a market image or a market metadata document to public IPFS through Pinata.
// multipart/form-data: kind=image + file, or kind=metadata + metadata (JSON string).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status, headers: { "cache-control": "no-store" } });

export async function POST(request: Request): Promise<Response> {
  const pinata = pinataConfig();
  if (pinata.status !== "ready") return fail(503, "ipfs_unavailable", pinata.reason);
  if (!allow(`ipfs:${clientKey(request)}`, 30, 10 * 60_000))
    return fail(429, "rate_limited", "Too many uploads. Try again in a few minutes.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "bad_request", "Expected multipart form data");
  }
  const kind = form.get("kind");
  try {
    if (kind === "image") {
      const file = form.get("file");
      if (!(file instanceof Blob)) return fail(400, "bad_request", "Missing image file");
      if (file.size > MAX_IMAGE_BYTES)
        return fail(413, "upload_too_large", "Image must be under 2 MB");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const mime = sniffImage(bytes);
      if (!mime) return fail(415, "unsupported_file", "Use a PNG, JPEG, WebP or GIF image");
      const cid = await pinFile(pinata, bytes, `kizashi-image.${mime.split("/")[1]}`, mime);
      return Response.json({ cid, mime });
    }
    if (kind === "metadata") {
      const raw = form.get("metadata");
      if (typeof raw !== "string" || raw.length > 64 * 1024)
        return fail(400, "bad_request", "Missing or oversized metadata");
      let json: unknown;
      try {
        json = JSON.parse(raw);
      } catch {
        return fail(400, "bad_request", "Metadata is not JSON");
      }
      const parsed = marketMetadataSchema.safeParse(json);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        return fail(
          400,
          "rules_invalid",
          `${issue?.path.join(".") ?? "metadata"}: ${issue?.message ?? "invalid"}`,
        );
      }
      const bytes = canonicalBytes(parsed.data);
      const cid = await pinFile(pinata, bytes, "kizashi-market.json", "application/json");
      return Response.json({ cid, rulesRef: rulesRefOf(bytes) });
    }
    return fail(400, "bad_request", "kind must be image or metadata");
  } catch (error) {
    if (error instanceof PinataError) return fail(502, "ipfs_unavailable", error.message);
    return fail(500, "internal", "Upload failed");
  }
}
