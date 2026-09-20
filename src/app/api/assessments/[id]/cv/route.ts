import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAssessmentForInstitution, getDocumentForAssessment } from "@/lib/db/queries";
import { fileDownloadResponse, storedFileOrTextPdf } from "@/lib/files/http";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const assessment = await getAssessmentForInstitution(id, session.institutionId);
  if (!assessment) return NextResponse.json({ error: "CV not found" }, { status: 404 });

  const document = await getDocumentForAssessment(id, session.institutionId);
  try {
    const file = await storedFileOrTextPdf({
      storagePath: document?.storage_path,
      originalName: document?.original_name || assessment.ranking?.file_name,
      mimeType: document?.mime_type,
      fallbackText: assessment.ranking?.resume_text || assessment.summary || "",
      fallbackBaseName: assessment.ranking?.candidate_name || assessment.candidate_name || "CV",
    });
    return fileDownloadResponse(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : "CV is not available for download.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
