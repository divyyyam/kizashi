import { expect, test } from "bun:test";
import { parseRulesUpload } from "../src/services/rules-upload";

const validRules = {
  budgetUsdc: "10000000",
  perTradeCapUsdc: "1000000",
  dailyCapUsdc: "2000000",
  maxLossPerMarketUsdc: "3000000",
  maxDrawdownUsdc: "4000000",
  stopAtSec: 2000000000,
  allowedMarketIds: ["market-a"],
  allowedShapes: ["binary" as const],
  notes: "",
};

test("JSON rules are validated without calling the PDF extractor", async () => {
  const extractPdf = async () => {
    throw new Error("Unexpected PDF extraction.");
  };
  const parsed = await parseRulesUpload({
    bytes: new TextEncoder().encode(JSON.stringify(validRules)),
    mediaType: "application/json",
    extractPdf,
  });
  expect(parsed.rules).toEqual(validRules);
  expect(parsed.source).toBe("json");
});

test("upload rejects oversized JSON, malformed JSON and unsupported media", async () => {
  const extractPdf = async () => {
    throw new Error("Unexpected PDF extraction.");
  };
  await expect(
    parseRulesUpload({
      bytes: new Uint8Array(64 * 1024 + 1),
      mediaType: "application/json",
      extractPdf,
    }),
  ).rejects.toMatchObject({ code: "upload_too_large" });
  await expect(
    parseRulesUpload({
      bytes: new TextEncoder().encode("{"),
      mediaType: "application/json",
      extractPdf,
    }),
  ).rejects.toMatchObject({ code: "rules_invalid" });
  await expect(
    parseRulesUpload({ bytes: new Uint8Array(), mediaType: "text/plain", extractPdf }),
  ).rejects.toMatchObject({ code: "unsupported_file" });
});

function pdfWithPages(pageCount: number) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 3);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pageCount} /Kids [${pages.map((page) => `${page} 0 R`).join(" ")}] >>`,
    ...pages.map(() => "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] >>"),
  ];
  let file = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(file.length);
    file += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xref = file.length;
  file += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) file += `${String(offset).padStart(10, "0")} 00000 n \n`;
  file += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(file);
}

test("PDF intake accepts a short document and rejects oversized or excessive pages", async () => {
  const extractPdf = async () => validRules;
  const parsed = await parseRulesUpload({
    bytes: pdfWithPages(1),
    mediaType: "application/pdf",
    extractPdf,
  });
  expect(parsed.source).toBe("pdf");
  await expect(
    parseRulesUpload({ bytes: pdfWithPages(21), mediaType: "application/pdf", extractPdf }),
  ).rejects.toMatchObject({ code: "upload_too_large" });
  await expect(
    parseRulesUpload({
      bytes: new Uint8Array(2 * 1024 * 1024 + 1),
      mediaType: "application/pdf",
      extractPdf,
    }),
  ).rejects.toMatchObject({ code: "upload_too_large" });
  await expect(
    parseRulesUpload({
      bytes: new TextEncoder().encode("not a PDF"),
      mediaType: "application/pdf",
      extractPdf,
    }),
  ).rejects.toMatchObject({ code: "rules_invalid" });
});
