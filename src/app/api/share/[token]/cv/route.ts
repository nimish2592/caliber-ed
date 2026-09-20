import { NextResponse } from "next/server";
import { getPublicCvShare } from "@/lib/db/queries";
import { fileDownloadResponse, storedFileOrTextPdf } from "@/lib/files/http";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getPublicCvShare(token);
  if (!shared || shared.assessment.status !== "completed") {
    return NextResponse.json({ error: "This share link is invalid or no longer active." }, { status: 404 });
  }

  try {
    const file = await storedFileOrTextPdf({
      storagePath: shared.document?.storage_path,
      originalName: shared.document?.original_name || shared.assessment.ranking?.file_name,
      mimeType: shared.document?.mime_type,
      fallbackText: shared.assessment.ranking?.resume_text || shared.assessment.summary || "",
      fallbackBaseName: shared.assessment.ranking?.candidate_name || shared.assessment.candidate_name || "CV",
    });
    return fileDownloadResponse(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : "CV is not available for download.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
