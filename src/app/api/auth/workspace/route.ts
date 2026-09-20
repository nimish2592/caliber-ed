import { NextResponse } from "next/server";
import { getSession, setWorkspaceMode } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const mode = body.mode === "demo" ? "demo" : body.mode === "live" ? "live" : null;
  if (!mode) {
    return NextResponse.json({ error: "Choose demo or live data." }, { status: 400 });
  }

  try {
    const next = await setWorkspaceMode(mode);
    return NextResponse.json({
      ok: true,
      mode: next.workspaceMode,
      demo: next.demo,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not switch workspace." },
      { status: 400 },
    );
  }
}
