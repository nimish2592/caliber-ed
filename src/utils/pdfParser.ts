import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";
import { sanitizeTextForDb } from "./sanitizeDbText";
import {
  isLegacyMsWordDoc,
  isZipBasedOfficeDoc,
  legacyDocUnsupportedMessage,
} from "./resumeFileMagic";

// Legacy worker includes Uint8Array.prototype.toHex polyfill. Modern pdfjs-dist
// (5.4+) calls .toHex() for PDF fingerprints and crashes on Chrome < 140 / older Edge.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

/** Required when a PDF uses standard (non-embedded) fonts. Trailing slash required. */
const STANDARD_FONT_DATA_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`;

function arrayBufferFromUint8(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function loadPdfFromData(data: ArrayBuffer | Uint8Array) {
  return pdfjsLib.getDocument({
    data,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  }).promise;
}

async function extractTextFromPdfData(data: ArrayBuffer | Uint8Array): Promise<string> {
  const pdf = await loadPdfFromData(data);
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    textParts.push(pageText);
  }

  return sanitizeTextForDb(textParts.join("\n"));
}

function wrapDocxParseError(err: unknown, fileName: string): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (/central directory|zip file/i.test(msg)) {
    throw new Error(
      `Could not read ${fileName} as Word. If this is an old .doc file, re-export as PDF or .docx.`,
    );
  }
  throw err instanceof Error ? err : new Error(msg);
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return extractTextFromPdfData(arrayBuffer);
}

export async function extractTextFromDOCX(file: File, existingBuffer?: ArrayBuffer): Promise<string> {
  const arrayBuffer = existingBuffer ?? (await file.arrayBuffer());
  const bytes = new Uint8Array(arrayBuffer);
  if (isLegacyMsWordDoc(bytes)) {
    throw new Error(legacyDocUnsupportedMessage(file.name));
  }
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return sanitizeTextForDb(result.value);
  } catch (err) {
    wrapDocxParseError(err, file.name);
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  if (name.endsWith(".pdf")) {
    return extractTextFromPDF(new File([arrayBuffer], file.name, { type: file.type }));
  }
  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    // Some exports use a .doc extension but are actually docx (zip).
    if (name.endsWith(".doc") && !isZipBasedOfficeDoc(bytes) && isLegacyMsWordDoc(bytes)) {
      throw new Error(legacyDocUnsupportedMessage(file.name));
    }
    return extractTextFromDOCX(file, arrayBuffer);
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}

export async function extractTextFromBase64(base64: string, contentType: string, fileName = ""): Promise<string> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const arrayBuffer = arrayBufferFromUint8(bytes);

  const lowerName = fileName.toLowerCase();

  if (
    contentType.includes("text/plain") ||
    contentType.startsWith("text/") ||
    lowerName.endsWith(".txt")
  ) {
    return sanitizeTextForDb(new TextDecoder().decode(bytes));
  }

  if (contentType.includes("pdf") || lowerName.endsWith(".pdf")) {
    return extractTextFromPdfData(bytes);
  } else if (
    contentType.includes("word") ||
    contentType.includes("docx") ||
    lowerName.endsWith(".docx") ||
    lowerName.endsWith(".doc")
  ) {
    if (isLegacyMsWordDoc(bytes)) {
      throw new Error(legacyDocUnsupportedMessage(fileName || "resume.doc"));
    }
    try {
      const result = await mammoth.extractRawText({ arrayBuffer });
      return sanitizeTextForDb(result.value);
    } catch (err) {
      wrapDocxParseError(err, fileName || "resume");
    }
  }

  throw new Error("Unsupported file type from Google Drive");
}
