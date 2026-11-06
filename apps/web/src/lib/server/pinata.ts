import { type IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "@kizashi/schemas/market";

/**
 * Pinata (public IPFS) over its HTTP API. Server-only: the JWT never reaches the browser.
 * Docs: POST https://uploads.pinata.cloud/v3/files, multipart `file` + `network=public`,
 * response `{ data: { cid } }`.
 */

const UPLOAD_URL = "https://uploads.pinata.cloud/v3/files";
const TIMEOUT_MS = 20_000;

export type PinataReady = { status: "ready"; jwt: string; gateway: string };
export type PinataConfig = PinataReady | { status: "unavailable"; reason: string };

export function pinataConfig(): PinataConfig {
  const jwt = process.env.PINATA_JWT?.trim();
  const gateway = process.env.PINATA_GATEWAY?.trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  if (!jwt) return { status: "unavailable", reason: "IPFS uploads are off: PINATA_JWT is not set" };
  if (!gateway)
    return { status: "unavailable", reason: "IPFS reads are off: PINATA_GATEWAY is not set" };
  return { status: "ready", jwt, gateway };
}

export function gatewayUrl(gateway: string, cid: string): string {
  return `https://${gateway}/ipfs/${cid}`;
}

export class PinataError extends Error {
  override readonly name = "PinataError";
}

export async function pinFile(
  config: PinataReady,
  bytes: Uint8Array,
  name: string,
  mime: string,
): Promise<string> {
  const form = new FormData();
  form.append("network", "public");
  form.append("name", name);
  form.append("file", new Blob([bytes as BlobPart], { type: mime }), name);
  let response: Response;
  try {
    response = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${config.jwt}` },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new PinataError(
      error instanceof Error && error.name === "TimeoutError"
        ? "IPFS upload timed out"
        : "IPFS upload failed to connect",
    );
  }
  if (!response.ok) throw new PinataError(`IPFS upload was refused (${response.status})`);
  const body = (await response.json().catch(() => undefined)) as
    | { data?: { cid?: unknown } }
    | undefined;
  const cid = body?.data?.cid;
  if (typeof cid !== "string" || cid.length < 20)
    throw new PinataError("IPFS upload returned no CID");
  return cid;
}

/** Fetches a pinned object, refusing anything larger than `maxBytes`. */
export async function fetchPinned(
  config: PinataReady,
  cid: string,
  maxBytes: number,
): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await fetch(gatewayUrl(config.gateway, cid), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new PinataError("IPFS gateway unreachable");
  }
  if (!response.ok) throw new PinataError(`IPFS gateway returned ${response.status}`);
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength > maxBytes) throw new PinataError("IPFS object is larger than allowed");
  return buffer;
}

/** Image type from magic bytes; the declared type is never trusted. */
export function sniffImage(bytes: Uint8Array): (typeof IMAGE_MIME_TYPES)[number] | undefined {
  const at = (i: number) => bytes[i] ?? -1;
  if (at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47) return "image/png";
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return "image/jpeg";
  if (at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x38) return "image/gif";
  if (
    at(0) === 0x52 &&
    at(1) === 0x49 &&
    at(2) === 0x46 &&
    at(3) === 0x46 &&
    at(8) === 0x57 &&
    at(9) === 0x45 &&
    at(10) === 0x42 &&
    at(11) === 0x50
  )
    return "image/webp";
  return undefined;
}

export { MAX_IMAGE_BYTES };
