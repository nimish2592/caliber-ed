import { NextResponse } from "next/server";
import { readCvFile } from "../storage";
import { buildTextPdfBytes } from "./textPdf";

export function downloadFileName(fileName: string, fallback = "download"): string {
  const trimmed = fileName.trim() || fallback;
  return trimmed.replace(/[/\\?%*:|"<>]/g, "-").slice(0, 120);
}

export function ensurePdfFileName(fileName: string): string {
  const trimmed = downloadFileName(fileName, "document.pdf");
  return trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed.replace(/\.[^.]+$/, "")}.pdf`;
}

function contentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_") || "download";
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export function fileDownloadResponse(params: {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
}): NextResponse {
  const fileName = downloadFileName(params.fileName);
  const body = Buffer.from(params.bytes);
  return new NextResponse(body, {
    headers: {
      "Content-Type": params.mimeType || "application/octet-stream",
      "Content-Disposition": contentDisposition(fileName),
      "Cache-Control": "private, no-store",
    },
  });
}

export async function storedFileOrTextPdf(params: {
  storagePath?: string | null;
  originalName?: string | null;
  mimeType?: string | null;
  fallbackText: string;
  fallbackBaseName: string;
}): Promise<{ bytes: Uint8Array; fileName: string; mimeType: string }> {
  if (params.storagePath) {
    try {
      const bytes = new Uint8Array(await readCvFile(params.storagePath));
      return {
        bytes,
        fileName: downloadFileName(params.originalName || params.fallbackBaseName),
        mimeType: params.mimeType || "application/octet-stream",
      };
    } catch {
      // Fall through to a generated PDF when the original blob is missing.
    }
  }

  const text = params.fallbackText.trim();
  if (!text) throw new Error("This file is not available for download.");
  return {
    bytes: buildTextPdfBytes(text),
    fileName: ensurePdfFileName(params.fallbackBaseName),
    mimeType: "application/pdf",
  };
}
