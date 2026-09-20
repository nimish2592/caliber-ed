import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCandidate, getDocumentForCandidate, listCandidateRankings } from "@/lib/db/queries";
import { fileDownloadResponse, storedFileOrTextPdf } from "@/lib/files/http";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const candidate = await getCandidate(id, session.institutionId);
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const document = await getDocumentForCandidate(id, session.institutionId);
  const rankings = await listCandidateRankings(id, session.institutionId);
  const latest = rankings.find((cv) => cv.resume_text) ?? rankings[0];

  try {
    const file = await storedFileOrTextPdf({
      storagePath: document?.storage_path,
      originalName: document?.original_name || candidate.cv_file_name || latest?.file_name,
      mimeType: document?.mime_type,
      fallbackText: latest?.resume_text || candidate.profile_summary || "",
      fallbackBaseName: candidate.display_name || candidate.candidate_code || "CV",
    });
    return fileDownloadResponse(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : "CV is not available for download.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
