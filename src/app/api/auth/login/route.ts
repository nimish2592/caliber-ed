import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { findUserByEmail, hasPassword, sessionFromUser, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const user = await findUserByEmail(email);
  if (!user || !hasPassword(user.password_hash) || !bcrypt.compareSync(password, user.password_hash)) {
    return NextResponse.json({ error: "Those credentials are not recognised." }, { status: 401 });
  }

  const session = sessionFromUser(user);
  await setSessionCookie(session);
  return NextResponse.json({ ok: true, platform: session.platform });
}
