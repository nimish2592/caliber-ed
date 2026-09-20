import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createEvent } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const instructions = String(body.instructions ?? "").trim();
  if (name.length < 3) {
    return NextResponse.json({ error: "Please enter an event name." }, { status: 400 });
  }

  const event = await createEvent({
    institutionId: session.institutionId,
    name,
    instructions,
  });
  return NextResponse.json(event);
}
