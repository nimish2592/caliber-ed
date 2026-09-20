"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileText, Loader2, Upload, Users, X } from "lucide-react";
import Header from "@/components/Header";
import LoadingOverlay from "@/components/LoadingOverlay";
import { filterResumeUploadFiles, RESUME_UPLOAD_ACCEPT, RESUME_UPLOAD_LABEL } from "@/utils/resumeFileTypes";
import type { GoalRow } from "@/lib/db/queries";

const MAX_RESUMES = 30;

export default function UploadCVsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [goal, setGoal] = useState<GoalRow | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ ranked: number; failed: number } | null>(null);

  useEffect(() => {
    fetch(`/api/goals/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Goal not found.");
        setGoal(data.goal);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load goal."));
  }, [id]);

  const addFiles = (incoming: FileList | File[]) => {
    const { accepted, skipped } = filterResumeUploadFiles(incoming);
    setFiles((prev) => {
      const next = [...prev];
      for (const file of accepted) {
        if (next.length >= MAX_RESUMES) break;
        if (!next.some((f) => f.name === file.name && f.size === file.size)) next.push(file);
      }
      return next;
    });
    if (skipped) setError(`${skipped} file${skipped === 1 ? " was" : "s were"} skipped. ${RESUME_UPLOAD_LABEL} only.`);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const handleUpload = async () => {
    if (!files.length) { setError("Please add at least one CV."); return; }
    setError("");
    setLoading(true);
    let ranked = 0;
    let failed = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setLoadingMsg(`Scoring ${file.name} (${i + 1}/${files.length})...`);
        const form = new FormData();
        form.set("file", file);
        form.set("goalId", String(id));
        const res = await fetch("/api/assessments", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) {
          failed += 1;
          setError(data.error || `Failed on ${file.name}`);
        } else {
          ranked += 1;
        }
      }
      setDone({ ranked, failed });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && <LoadingOverlay message={loadingMsg} subMessage="Using the Caliber CV formatter, then scoring against this goal." />}
      {done && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Scoring complete</h2>
                <p className="text-sm text-slate-600 mt-2">
                  Ranked {done.ranked} CV{done.ranked === 1 ? "" : "s"}
                  {done.failed ? ` · ${done.failed} failed` : ""}.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/goals/${id}`)}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl"
            >
              View ranked students
            </button>
          </div>
        </div>
      )}

      <Header onBack={() => router.push(`/goals/${id}`)} backLabel="Back to Goal" />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 pb-12 py-8">
          {goal && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">{goal.goal_code}</p>
                <p className="font-semibold text-slate-800 text-sm mt-0.5">{goal.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {goal.focus_skills.length} focus skills · higher-education context
                </p>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Upload CVs</h2>
            <p className="text-slate-500 mt-1">Staff can upload student CVs here. Students can also scan the goal QR.</p>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                  dragging ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={RESUME_UPLOAD_ACCEPT}
                  className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                />
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium text-sm">Drop CVs here or click to browse</p>
                <p className="text-slate-400 text-xs mt-1">{RESUME_UPLOAD_LABEL} · up to {MAX_RESUMES} files</p>
              </div>

              {files.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {files.map((file) => (
                    <li key={`${file.name}-${file.size}`} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                        <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFiles((prev) => prev.filter((f) => f !== file)); }}
                        className="p-1 text-slate-400 hover:text-slate-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={() => void handleUpload()}
              disabled={loading || files.length === 0}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Score {files.length ? `${files.length} ` : ""}CV{files.length === 1 ? "" : "s"} against this goal
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
