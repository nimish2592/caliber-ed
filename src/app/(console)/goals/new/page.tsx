"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FileText, Loader2, Upload, X } from "lucide-react";
import Header from "@/components/Header";
import LoadingOverlay from "@/components/LoadingOverlay";
import { DEFAULT_FOCUS_SKILLS, DEFAULT_HE_CONTEXT } from "@/lib/goals/defaults";
import { RESUME_UPLOAD_ACCEPT } from "@/utils/resumeFileTypes";

export default function CreateGoalPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("Internship & Placement Readiness");
  const [contextText, setContextText] = useState(DEFAULT_HE_CONTEXT);
  const [skillInput, setSkillInput] = useState("");
  const [focusSkills, setFocusSkills] = useState<string[]>(DEFAULT_FOCUS_SKILLS);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const addSkill = (raw: string) => {
    const skill = raw.trim();
    if (!skill) return;
    setFocusSkills((prev) => (prev.some((s) => s.toLowerCase() === skill.toLowerCase()) ? prev : [...prev, skill]));
    setSkillInput("");
  };

  const handleFile = async (f: File) => {
    if (!f.name.match(/\.(pdf|doc|docx)$/i)) {
      setError("Please upload a PDF or DOCX file.");
      return;
    }
    setFile(f);
    setError("");
    setExtracting(true);
    try {
      const form = new FormData();
      form.set("file", f);
      const res = await fetch("/api/extract", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string; text?: string };
      if (!res.ok) throw new Error(data.error || "Could not extract text from that file.");
      if (data.text?.trim()) setContextText(String(data.text).trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not extract text from that file.");
    } finally {
      setExtracting(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) void handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleSave = async () => {
    setError("");
    if (!title.trim()) { setError("Goal title is required."); return; }
    if (!contextText.trim() && !file) {
      setError("Paste higher-education context or upload a document.");
      return;
    }
    if (file && file.size > 8 * 1024 * 1024) {
      setError("Please upload a file smaller than 8 MB.");
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      form.set("title", title);
      form.set("contextText", contextText);
      form.set("focusSkills", JSON.stringify(focusSkills));
      if (file) form.set("file", file);
      const res = await fetch("/api/goals", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { error?: string; goal?: { id: string } };
      if (!res.ok || !data.goal?.id) throw new Error(data.error || "Failed to save goal.");
      router.push(`/goals/${data.goal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save goal.");
      setSaving(false);
    }
  };

  return (
    <>
      {(saving || extracting) && (
        <LoadingOverlay
          message={saving ? "Saving goal..." : "Extracting text from document..."}
          subMessage="This may take a few seconds..."
        />
      )}
      <Header onBack={() => router.push("/")} backLabel="Goals" />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 pb-12 py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Create Goal</h2>
            <p className="text-slate-500 mt-1">
              Paste higher-education context, upload a programme brief, or both. Uploaded files are saved and can be downloaded later.
            </p>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Goal title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Upload a document</p>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    dragging
                      ? "border-blue-400 bg-blue-50 cursor-copy"
                      : file
                        ? "border-blue-300 bg-blue-50 cursor-default"
                        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50 cursor-pointer"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={RESUME_UPLOAD_ACCEPT}
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])}
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
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="ml-2 p-1 rounded-full hover:bg-slate-200 text-slate-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium text-sm">Drop a programme brief here or click to browse</p>
                      <p className="text-slate-400 text-xs mt-1">PDF, DOC, or DOCX — saved with this goal and used to fill the context below</p>
                    </>
                  )}
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700">
                Higher-education context
                <textarea
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  rows={12}
                  className="mt-1.5 w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Focus skills</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {focusSkills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 font-medium">
                      {s}
                      <button type="button" onClick={() => setFocusSkills((prev) => prev.filter((x) => x !== s))} className="text-blue-400 hover:text-blue-700">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addSkill(skillInput.replace(/,$/, ""));
                    }
                  }}
                  placeholder="Type a skill and press Enter"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save & Continue
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
