import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { appConfig } from "@/lib/config";
import { getAssessmentForInstitution, getInstitution, getOrCreateCvShare, getGoalById } from "@/lib/db/queries";
import { isResendConfigured, sendStudentReportEmail } from "@/lib/email/resend";
import { normalizeCandidateEmail } from "@/lib/candidates/profile";

export const runtime = "nodejs";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!isResendConfigured()) {
    return NextResponse.json(
      { error: "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL." },
      { status: 503 },
    );
  }

  const { id } = await params;
  const assessment = await getAssessmentForInstitution(id, session.institutionId);
  if (!assessment) return NextResponse.json({ error: "CV not found" }, { status: 404 });
  if (assessment.status !== "completed") {
    return NextResponse.json({ error: "Rank this CV before emailing the report." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const overrideTo = typeof body.to === "string" ? body.to.trim() : "";
  const fromRanking = assessment.ranking?.candidate_email?.trim() || "";
  const to = normalizeCandidateEmail(overrideTo || fromRanking) || "";
  if (!to || !isValidEmail(to)) {
    return NextResponse.json(
      { error: "This student has no email on file. Add one on the QR form or enter an address here." },
      { status: 400 },
    );
  }

  const [institution, goal, share] = await Promise.all([
    getInstitution(session.institutionId),
    assessment.goal_id ? getGoalById(assessment.goal_id, session.institutionId) : Promise.resolve(null),
    getOrCreateCvShare({
      institutionId: session.institutionId,
      assessmentId: assessment.id,
      createdBy: session.email,
    }),
  ]);

  const shareUrl = `${appConfig.appUrl}/share/${share.share_token}`;
  const studentName =
    assessment.ranking?.candidate_name || assessment.candidate_name || to.split("@")[0] || "Student";

  try {
    await sendStudentReportEmail({
      to,
      studentName,
      goalTitle: goal?.title || "Career readiness",
      goalCode: goal?.goal_code || "",
      institutionName: institution?.name || "Campus",
      grade: assessment.ranking?.grade ?? null,
      score: assessment.ranking?.score ?? assessment.overall_score,
      shareUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not send email.";
    console.error("[email] student report failed", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true, to, shareUrl });
}
