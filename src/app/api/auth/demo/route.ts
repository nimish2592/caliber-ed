import { NextResponse } from "next/server";
import { findDemoUser, sessionFromUser, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const user = await findDemoUser();
  if (!user) {
    return NextResponse.json(
      { error: "The demo workspace is not available yet. Try again in a moment." },
      { status: 503 },
    );
  }

  const session = sessionFromUser(user);
  await setSessionCookie(session);
  return NextResponse.json({ ok: true, demo: true });
}
