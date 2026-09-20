import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { addClientUser, emailTaken, getClient } from "@/lib/db/admin";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.platform) {
    return NextResponse.json({ error: "Platform admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const institution = await getClient(id);
  if (!institution || institution.kind !== "campus") {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
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
