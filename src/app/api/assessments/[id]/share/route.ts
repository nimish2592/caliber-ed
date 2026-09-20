import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { appConfig } from "@/lib/config";
import { getAssessmentForInstitution, getOrCreateCvShare } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const assessment = await getAssessmentForInstitution(id, session.institutionId);
  if (!assessment) return NextResponse.json({ error: "CV not found" }, { status: 404 });
  if (assessment.status !== "completed") {
    return NextResponse.json({ error: "Rank this CV before sharing." }, { status: 400 });
  }

  const share = await getOrCreateCvShare({
    institutionId: session.institutionId,
    assessmentId: assessment.id,
    createdBy: session.email,
  });

  return NextResponse.json({
    share,
    shareUrl: `${appConfig.appUrl}/share/${share.share_token}`,
  });
}
