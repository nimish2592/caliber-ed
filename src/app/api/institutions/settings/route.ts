import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { updateInstitutionSettings } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }
  if (session.institutionId !== session.homeInstitutionId) {
    return NextResponse.json({ error: "Demo data is read-only for settings." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json({ error: "Institution name is required." }, { status: 400 });
  }

  await updateInstitutionSettings({
    institutionId: session.institutionId,
    name,
    studentInstructions: String(body.studentInstructions ?? ""),
    retentionDays: Math.max(30, Math.min(2555, Number(body.retentionDays) || 365)),
    showStudentIdentities: Boolean(body.showStudentIdentities),
  });

  return NextResponse.json({ ok: true });
}
