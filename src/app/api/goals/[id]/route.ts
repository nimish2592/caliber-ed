import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth/session";
import { appConfig } from "@/lib/config";
import { getGoalById, listRankedCvs, updateGoalStatus } from "@/lib/db/queries";
import type { GoalStatus } from "@/lib/ranking/types";

export const runtime = "nodejs";

const STATUSES: GoalStatus[] = ["active", "on_hold", "closed"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const goal = await getGoalById(id, session.institutionId);
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const [cvs, qrDataUrl] = await Promise.all([
    listRankedCvs(goal.id, session.institutionId),
    QRCode.toDataURL(`${appConfig.appUrl}/g/${goal.public_slug}`, {
      margin: 1,
      width: 280,
      color: { dark: "#0f172a", light: "#ffffff" },
    }),
  ]);

  return NextResponse.json({
    goal,
    cvs,
    qrDataUrl,
    publicUrl: `${appConfig.appUrl}/g/${goal.public_slug}`,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = body.status as GoalStatus;
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const goal = await getGoalById(id, session.institutionId);
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  await updateGoalStatus(id, session.institutionId, status);
  return NextResponse.json({ ok: true });
}
