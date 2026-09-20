import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listCandidates } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const url = new URL(request.url);
  const archived = url.searchParams.get("archived") === "1";
  const search = url.searchParams.get("q") ?? "";
  const result = await listCandidates({
    institutionId: session.institutionId,
    archived,
    search,
  });
  return NextResponse.json(result);
}
