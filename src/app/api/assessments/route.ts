import { NextResponse } from "next/server";
import { createAssessmentJob } from "@/lib/pipeline";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const goalSlug = String(form.get("goalSlug") ?? "").trim() || null;
    const goalId = String(form.get("goalId") ?? "").trim() || null;
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please choose a CV file to upload." }, { status: 400 });
    }

    const session = await getSession();
    if (goalId && !session) {
      return NextResponse.json({ error: "Sign in required to upload against a goal." }, { status: 401 });
    }
    const result = await createAssessmentJob({
      file,
      goalSlug,
      goalId,
      institutionId: goalId ? session?.institutionId ?? null : null,
      uploadedByEmail: session?.email ?? null,
      contact: {
        displayName: String(form.get("displayName") ?? "").trim() || null,
        email: String(form.get("email") ?? "").trim() || null,
        phone: String(form.get("phone") ?? "").trim() || null,
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start assessment";
    const status = /limit/i.test(message) ? 402 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
