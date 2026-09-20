"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileSearch, FileText, Upload, X } from "lucide-react";
import { RESUME_UPLOAD_ACCEPT, RESUME_UPLOAD_LABEL } from "@/utils/resumeFileTypes";
import LoadingOverlay from "@/components/LoadingOverlay";

export default function StudentGoalUpload({
  goalSlug,
  goalTitle,
  goalCode,
  institutionName,
  instructions,
}: {
  goalSlug: string;
  goalTitle: string;
  goalCode: string;
  institutionName: string;
  instructions: string;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!file) { setError("Please choose a CV file to upload."); return; }
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("file", file);
    form.set("goalSlug", goalSlug);
    try {
      const res = await fetch("/api/assessments", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      router.push(`/a/${data.id}?t=${data.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setBusy(false);
    }
  }

  return (
    <>
      {busy && <LoadingOverlay message="Reading your CV..." subMessage="Extracting sections and scoring against this campus goal." />}
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-2.5 px-6 py-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
              <FileSearch className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">Caliber</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{institutionName}</p>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl px-6 py-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{goalCode}</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{goalTitle}</h1>
          <p className="text-slate-500 mt-2 text-sm">{instructions}</p>

          <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const next = e.dataTransfer.files[0];
                if (next) { setFile(next); setError(""); }
              }}
              onClick={() => document.getElementById("student-cv")?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                dragging ? "border-blue-400 bg-blue-50" : file ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
              }`}
            >
              <input
                id="student-cv"
                type="file"
                accept={RESUME_UPLOAD_ACCEPT}
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setError(""); } }}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-slate-800 text-sm">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="ml-2 p-1 rounded-full hover:bg-slate-200 text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium text-sm">Drop your CV here or click to browse</p>
                  <p className="text-slate-400 text-xs mt-1">{RESUME_UPLOAD_LABEL} · up to 8 MB</p>
                </>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => void onSubmit()}
              disabled={busy}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl"
            >
              {busy ? "Analyzing your CV…" : "Get my career-readiness score"}
            </button>
          </div>
        </main>
      </div>
    </>
  );
}
