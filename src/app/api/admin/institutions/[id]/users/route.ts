import { NextResponse } from "next/server";
import { canAccessAdmin, getSession } from "@/lib/auth/session";
import {
  addClientUser,
  emailTaken,
  getClient,
  setClientUserActive,
} from "@/lib/db/admin";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!canAccessAdmin(session)) {
    return NextResponse.json({ error: "Platform admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const institution = await getClient(id);
  if (!institution || institution.kind !== "campus") {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const role = body.role === "staff" ? "staff" : "admin";

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (await emailTaken(email)) {
    return NextResponse.json({ error: "That email is already provisioned." }, { status: 409 });
  }

  const created = await addClientUser({
    institutionId: id,
    name,
    email,
    role,
  });

  return NextResponse.json(created);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!canAccessAdmin(session)) {
    return NextResponse.json({ error: "Platform admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const institution = await getClient(id);
  if (!institution || institution.kind !== "campus") {
    return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const userId = String(body.userId ?? "").trim();
  if (!userId || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "userId and active are required." }, { status: 400 });
  }

  const user = await setClientUserActive(id, userId, body.active);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({ user });
}
