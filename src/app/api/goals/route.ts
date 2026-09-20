import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createGoal, getInstitution, listGoals } from "@/lib/db/queries";
import { goalContextObjectPath, newId, saveStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = /\.(pdf|docx?)$/i;

async function parseGoalInput(request: Request): Promise<{
  title: string;
  contextText: string;
  focusSkills: string[];
  file: File | null;
}> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    let focusSkills: string[] = [];
    try {
      const parsed = JSON.parse(String(form.get("focusSkills") ?? "[]")) as unknown;
      focusSkills = Array.isArray(parsed) ? parsed.map((s) => String(s).trim()).filter(Boolean) : [];
    } catch {
      focusSkills = [];
    }
    const uploaded = form.get("file");
    return {
      title: String(form.get("title") ?? "").trim(),
      contextText: String(form.get("contextText") ?? ""),
      focusSkills,
      file: uploaded instanceof File && uploaded.size > 0 ? uploaded : null,
    };
  }

  const body = await request.json().catch(() => ({}));
  const focusSkills = Array.isArray(body.focusSkills)
    ? body.focusSkills.map((s: unknown) => String(s).trim()).filter(Boolean)
    : [];
  return {
    title: String(body.title ?? "").trim(),
    contextText: String(body.contextText ?? ""),
    focusSkills,
    file: null,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const goals = await listGoals(session.institutionId);
  return NextResponse.json({ goals });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  try {
    const { title, contextText, focusSkills, file } = await parseGoalInput(request);

    if (title.length < 2) {
      return NextResponse.json({ error: "Goal title is required." }, { status: 400 });
    }
    if (!contextText.trim() && !file) {
      return NextResponse.json({ error: "Add higher-education context or upload a document." }, { status: 400 });
    }
    if (file) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "Please upload a file smaller than 8 MB." }, { status: 400 });
      }
      if (!ALLOWED.test(file.name)) {
        return NextResponse.json({ error: "Please upload a PDF or DOCX file." }, { status: 400 });
      }
    }

    const goalId = newId("goal");
    let contextFile: { fileName: string; mimeType: string; storagePath: string } | null = null;
    if (file) {
      const institution = await getInstitution(session.institutionId);
      if (!institution) return NextResponse.json({ error: "Institution not found." }, { status: 404 });
      const bytes = new Uint8Array(await file.arrayBuffer());
      const storagePath = await saveStoredFile({
        objectPath: goalContextObjectPath(institution.slug, goalId, file.name),
        mimeType: file.type || "application/octet-stream",
        bytes,
      });
      contextFile = {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        storagePath,
      };
    }

    const goal = await createGoal({
      id: goalId,
      institutionId: session.institutionId,
      title,
      contextText: contextText.trim() || `Context extracted from ${file?.name ?? "uploaded document"}.`,
      focusSkills,
      createdBy: session.email,
      contextFile,
    });
    return NextResponse.json({ goal });
  } catch (err) {
    console.error("[goals] create failed", err);
    const message = err instanceof Error ? err.message : "Failed to save goal.";
    const duplicate = /duplicate key|unique constraint/i.test(message);
    return NextResponse.json(
      { error: duplicate ? "Could not save this goal. Try again." : message },
      { status: 500 },
    );
  }
}
