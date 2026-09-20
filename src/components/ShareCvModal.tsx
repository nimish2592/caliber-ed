"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Loader2, Share2, X } from "lucide-react";
import type { RankedCv } from "@/lib/ranking/types";

export default function ShareCvModal({
  resume,
  onClose,
}: {
  resume: RankedCv;
  onClose: () => void;
}) {
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/assessments/${resume.id}/share`, { method: "POST" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not create a share link.");
        if (!cancelled) setShareUrl(String(data.shareUrl ?? ""));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not create a share link.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resume.id]);

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <Share2 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">Share student report</h2>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {resume.candidate_name || "Student"} · {resume.file_name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Creating link…
            </div>
          ) : error ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Anyone with this link can view the student report — grade, quality checks, and recommendations — and download the PDF or CV. No sign-in required.
              </p>
              <div className="p-3 rounded-xl border border-blue-200 bg-blue-50">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 mb-2">
                  <Link2 className="w-3.5 h-3.5" /> Public link
                </div>
                <p className="text-xs break-all font-mono text-slate-700 bg-white/70 p-2 rounded-lg">{shareUrl}</p>
              </div>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy link"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
