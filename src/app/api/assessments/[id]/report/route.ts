import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { DIMENSION_LABELS } from "@/lib/assessment/profiles";
import { getAssessmentDetails, getAssessmentForAccess, getAssessmentForInstitution, getGoalById } from "@/lib/db/queries";
import { fileDownloadResponse } from "@/lib/files/http";
import { publicShareReport, studentReportFileName } from "@/lib/share/publicReport";
import { buildStudentReportPdf } from "@/lib/share/studentReportPdf";

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

  if (!assessment || assessment.status !== "completed") {
    return NextResponse.json({ error: "This report is not available." }, { status: 404 });
  }

  const details = await getAssessmentDetails(assessment.id, assessment.institution_id);
  const goal = assessment.goal_id
    ? await getGoalById(assessment.goal_id, assessment.institution_id)
    : null;
  const report = publicShareReport({
    ranking: assessment.ranking,
    candidateName: assessment.candidate_name,
    fileName: assessment.ranking?.file_name || "CV",
    goalTitle: goal?.title || "Career readiness",
    goalCode: goal?.goal_code || "",
    score: assessment.overall_score,
    canDownloadCv: false,
    dimensions: details.dimensions.map((d) => ({
      key: d.dimension,
      label: DIMENSION_LABELS[d.dimension as keyof typeof DIMENSION_LABELS] ?? d.dimension,
      score: d.score,
      status: d.status,
      evidence: d.evidence,
    })),
    recommendations: details.recommendations,
  });

  return fileDownloadResponse({
    bytes: buildStudentReportPdf(report),
    fileName: studentReportFileName(report.candidateName),
    mimeType: "application/pdf",
  });
}
