import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { extractCvText } from "@/lib/assessment/extractText";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Please choose a file." }, { status: 400 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const text = await extractCvText(bytes, file.name, file.type || "application/octet-stream");
    if (!text.trim()) {
      return NextResponse.json({ error: "Could not extract text. Try a different file." }, { status: 400 });
    }
    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not extract text.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
