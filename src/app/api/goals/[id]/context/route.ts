import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getGoalById } from "@/lib/db/queries";
import { fileDownloadResponse, storedFileOrTextPdf } from "@/lib/files/http";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const goal = await getGoalById(id, session.institutionId);
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  try {
    const file = await storedFileOrTextPdf({
      storagePath: goal.context_storage_path,
      originalName: goal.context_file_name,
      mimeType: goal.context_mime_type,
      fallbackText: goal.context_text,
      fallbackBaseName: `${goal.goal_code}-${goal.title || "context"}`,
    });
    return fileDownloadResponse(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Context file is not available.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
