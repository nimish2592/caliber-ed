function sanitize(text: string): string {
  return text.replace(/\u0000/g, "").replace(/[\uD800-\uDFFF]/g, "").trim();
}

function isZip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function isLegacyDoc(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(bytes.byteLength);
  data.set(bytes);
  const pdf = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    const pageParts: string[] = [];
    for (const item of content.items) {
      if (!("str" in item) || !("transform" in item)) continue;
      const y = Number((item.transform as number[])[5] ?? 0);
      if (lastY != null && Math.abs(y - lastY) > 2) pageParts.push("\n");
      else if (pageParts.length && !pageParts[pageParts.length - 1].endsWith(" ") && item.str) {
        pageParts.push(" ");
      }
      pageParts.push(item.str);
      lastY = y;
    }
    parts.push(pageParts.join(""));
  }
  return sanitize(parts.join("\n"));
}

async function extractDocx(bytes: Uint8Array, fileName: string): Promise<string> {
  if (isLegacyDoc(bytes)) {
    throw new Error(
      `${fileName} is a legacy Word .doc file. Please re-export it as PDF or DOCX and try again.`,
    );
  }
  const mammoth = await import("mammoth");
  const buffer = Buffer.from(bytes);
  try {
    const result = await mammoth.extractRawText({ buffer });
    return sanitize(result.value ?? "");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/central directory|zip file/i.test(msg)) {
      throw new Error(`Could not read ${fileName} as Word. Re-export as PDF or .docx.`);
    }
    throw err instanceof Error ? err : new Error(msg);
  }
}

export async function extractCvText(bytes: Uint8Array, fileName: string, mimeType: string): Promise<string> {
  const name = fileName.toLowerCase();
  const mime = mimeType.toLowerCase();

  if (name.endsWith(".pdf") || mime.includes("pdf")) {
    return extractPdf(bytes);
  }

  if (name.endsWith(".docx") || name.endsWith(".doc") || mime.includes("word") || mime.includes("officedocument")) {
    if (name.endsWith(".doc") && !isZip(bytes) && isLegacyDoc(bytes)) {
      throw new Error(
        `${fileName} is a legacy Word .doc file. Please re-export it as PDF or DOCX and try again.`,
      );
    }
    return extractDocx(bytes, fileName);
  }

  throw new Error("Please upload a PDF or DOCX file.");
}
