import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCandidate, listCandidateRankings, updateCandidateMeta } from "@/lib/db/queries";
import { CANDIDATE_DIRECTORY_STATUSES } from "@/lib/candidates/types";
import type { CandidateDirectoryStatus } from "@/lib/candidates/types";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const candidate = await getCandidate(id, session.institutionId);
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  const rankings = await listCandidateRankings(id, session.institutionId);
  return NextResponse.json({ candidate, rankings });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const candidate = await getCandidate(id, session.institutionId);
  if (!candidate) return NextResponse.json({ error: "Candidate not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const archived = typeof body.archived === "boolean" ? body.archived : undefined;
  const directoryStatus = (CANDIDATE_DIRECTORY_STATUSES as readonly string[]).includes(body.directoryStatus)
    ? (body.directoryStatus as CandidateDirectoryStatus)
    : undefined;

  await updateCandidateMeta({
    id,
    institutionId: session.institutionId,
    archived,
    directoryStatus,
  });
  return NextResponse.json({ ok: true });
}
