import { NextResponse } from "next/server";
import { DIMENSION_LABELS } from "@/lib/assessment/profiles";
import { getAssessmentDetails, getPublicCvShare } from "@/lib/db/queries";
import { publicShareReport } from "@/lib/share/publicReport";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await getPublicCvShare(token);
  if (!shared || shared.assessment.status !== "completed") {
    return NextResponse.json({ error: "This share link is invalid or no longer active." }, { status: 404 });
  }

  const details = await getAssessmentDetails(shared.assessment.id, shared.assessment.institution_id);

  return NextResponse.json({
    report: publicShareReport({
      ranking: shared.assessment.ranking,
      candidateName: shared.assessment.candidate_name,
      fileName: shared.document?.original_name || shared.assessment.ranking?.file_name || "CV",
      goalTitle: shared.goalTitle,
      goalCode: shared.goalCode,
      score: shared.assessment.overall_score,
      canDownloadCv: Boolean(shared.document?.storage_path || shared.assessment.ranking?.resume_text),
      institutionName: shared.institutionName,
      dimensions: details.dimensions.map((d) => ({
        key: d.dimension,
        label: DIMENSION_LABELS[d.dimension as keyof typeof DIMENSION_LABELS] ?? d.dimension,
        score: d.score,
        status: d.status,
        evidence: d.evidence,
      })),
      recommendations: details.recommendations,
    }),
  });
}
