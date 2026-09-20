import { NextResponse } from "next/server";
import { canAccessAdmin, getSession } from "@/lib/auth/session";
import {
  addClientUser,
  createClient,
  emailTaken,
  isPlanId,
  listClients,
  platformUsageTotals,
} from "@/lib/db/admin";
import { PLAN_LIMITS } from "@/lib/config";

export const runtime = "nodejs";

async function requirePlatform() {
  const session = await getSession();
  if (!canAccessAdmin(session)) {
    return NextResponse.json({ error: "Platform admin access required." }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await requirePlatform();
  if (denied) return denied;
  const institutions = await listClients();
  return NextResponse.json({ institutions, totals: platformUsageTotals(institutions), plans: PLAN_LIMITS });
}

export async function POST(request: Request) {
  const denied = await requirePlatform();
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const plan = String(body.plan ?? "institution");
  const annualLimit = Number(body.annualLimit);
  const userName = String(body.user?.name ?? "").trim();
  const userEmail = String(body.user?.email ?? "").trim().toLowerCase();
  const userRole = body.user?.role === "staff" ? "staff" : "admin";

  if (!name) {
    return NextResponse.json({ error: "Client name is required." }, { status: 400 });
  }
  if (!isPlanId(plan)) {
    return NextResponse.json({ error: "Choose a valid plan." }, { status: 400 });
  }
  if (!userName || !userEmail) {
    return NextResponse.json({ error: "Add the first user by name and email." }, { status: 400 });
  }
  if (!userEmail.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email for the first user." }, { status: 400 });
  }
  if (await emailTaken(userEmail)) {
    return NextResponse.json({ error: "That email is already provisioned on another client." }, { status: 409 });
  }

  let institution;
  try {
    institution = await createClient({
      name,
      plan,
      annualLimit: Number.isFinite(annualLimit) && annualLimit !== 0 ? annualLimit : undefined,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create this client." },
      { status: 400 },
    );
  }
  const { user } = await addClientUser({
    institutionId: institution.id,
    name: userName,
    email: userEmail,
    role: userRole,
  });

  return NextResponse.json({
    institution,
    user,
  });
}
