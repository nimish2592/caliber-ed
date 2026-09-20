import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getClient, listClientUsers } from "@/lib/db/admin";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.platform) {
    return NextResponse.json({ error: "Platform admin access required." }, { status: 403 });
  }

  const { id } = await params;
  const institution = await getClient(id);
  if (!institution || institution.kind !== "campus") {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }
  const users = await listClientUsers(id);
  return NextResponse.json({ institution, users });
}
