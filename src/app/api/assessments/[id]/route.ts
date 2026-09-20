import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { DIMENSION_LABELS } from "@/lib/assessment/profiles";
import { getAssessmentDetails, getAssessmentForAccess, getAssessmentForInstitution } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const session = await getSession();

  const assessment = token
    ? await getAssessmentForAccess(id, token)
    : session
      ? await getAssessmentForInstitution(id, session.institutionId)
      : null;

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  if (assessment.status !== "completed") {
    return NextResponse.json({
      id: assessment.id,
      status: assessment.status,
      error: assessment.error,
    });
  }

  const details = await getAssessmentDetails(assessment.id, assessment.institution_id);
  const dimensions = details.dimensions.map((d) => ({
    key: d.dimension,
    label: DIMENSION_LABELS[d.dimension as keyof typeof DIMENSION_LABELS] ?? d.dimension,
    score: d.score,
    status: d.status,
    evidence: d.evidence,
  }));

  return NextResponse.json({
    id: assessment.id,
    status: assessment.status,
    overallScore: assessment.overall_score,
    summary: assessment.summary,
    engine: assessment.engine,
    dimensions,
    recommendations: details.recommendations,
  });
}
