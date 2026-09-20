import { NextResponse } from "next/server";
import { canAccessAdmin, getSession } from "@/lib/auth/session";
import {
  getClient,
  isPlanId,
  listClientUsers,
  setClientActive,
  updateClientAllocation,
} from "@/lib/db/admin";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!canAccessAdmin(session)) {
    return NextResponse.json({ error: "Platform admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const institution = await getClient(id);
  if (!institution || institution.kind !== "campus") {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }
  const users = await listClientUsers(id);
  return NextResponse.json({ institution, users });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!canAccessAdmin(session)) {
    return NextResponse.json({ error: "Platform admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const existing = await getClient(id);
  if (!existing || existing.kind !== "campus") {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  if (typeof body.active === "boolean") {
    try {
      const institution = await setClientActive(id, body.active);
      return NextResponse.json({ institution });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Could not update organization." },
        { status: 400 },
      );
    }
  }

  const annualLimit = Number(body.annualLimit);
  const plan = typeof body.plan === "string" && isPlanId(body.plan) ? body.plan : undefined;
  try {
    const institution = await updateClientAllocation({
      institutionId: id,
      annualLimit,
      plan,
    });
    return NextResponse.json({ institution });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not update allocation." },
      { status: 400 },
    );
  }
}
