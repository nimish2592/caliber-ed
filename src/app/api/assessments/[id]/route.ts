import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { DIMENSION_LABELS } from "@/lib/assessment/profiles";
import { qualityAverage } from "@/lib/assessment/qualityChecks";
import { getAssessmentDetails, getAssessmentForAccess, getAssessmentForInstitution, getGoalById } from "@/lib/db/queries";
import { letterGradeFromScore } from "@/lib/grading/letterGrade";
import { resolveQualityChecks } from "@/lib/share/publicReport";

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

  const ranking = assessment.ranking;
  const overallScore = ranking?.score ?? assessment.overall_score ?? 0;
  const goal = assessment.goal_id
    ? await getGoalById(assessment.goal_id, assessment.institution_id)
    : null;
  const qualityChecks = resolveQualityChecks({ ranking, dimensions });

  return NextResponse.json({
    id: assessment.id,
    status: assessment.status,
    overallScore,
    grade: ranking?.grade || letterGradeFromScore(overallScore),
    summary: ranking?.reason || assessment.summary,
    engine: assessment.engine,
    goalTitle: goal?.title ?? null,
    goalCode: goal?.goal_code ?? null,
    goalFit: ranking?.goal_fit ?? null,
    matchedSkills: ranking?.matched_skills ?? [],
    missingSkills: ranking?.missing_skills ?? [],
    dimensions,
    recommendations: details.recommendations,
    qualityChecks,
    qualityAverage: ranking?.quality_average ?? (qualityChecks ? qualityAverage(qualityChecks) : null),
    candidateName: ranking?.candidate_name || assessment.candidate_name,
  });
}
