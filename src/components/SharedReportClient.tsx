"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle, AlertTriangle, Award, BookOpen, Briefcase, CheckCircle2, Download, FileSearch,
  Loader2, ShieldAlert, ShieldCheck, Star, Tag, ThumbsUp, Minus, GraduationCap, TrendingUp,
} from "lucide-react";
import type { PublicShareReport } from "@/lib/share/publicReport";
import { downloadFromApi } from "@/utils/downloadFromApi";

const REC = {
  ready: { label: "Ready", icon: <ThumbsUp className="w-4 h-4" />, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  developing: { label: "Developing", icon: <Minus className="w-4 h-4" />, className: "bg-amber-50 text-amber-700 border-amber-200" },
  needs_work: { label: "Needs work", icon: <GraduationCap className="w-4 h-4" />, className: "bg-red-50 text-red-700 border-red-200" },
};

export default function SharedReportClient({ token }: { token: string }) {
  const [report, setReport] = useState<PublicShareReport | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "This share link is invalid.");
        setReport(data.report);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Unable to open report."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadFromApi(`/api/share/${token}/cv`, report?.fileName || "CV.pdf");
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm">Loading candidate report…</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-6 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 mb-2" />
          {error || "This share link is invalid or no longer active."}
        </div>
      </div>
    );
  }

  const rec = report.recommendation ? REC[report.recommendation] : REC.needs_work;
  const score = report.score ?? 0;
  const scoreBg = score >= 75 ? "from-emerald-600 to-emerald-700" : score >= 50 ? "from-amber-500 to-amber-600" : "from-red-500 to-red-600";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600">
              <FileSearch className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 leading-none">Caliber</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Shared career-readiness report</p>
            </div>
          </div>
          {report.canDownloadCv && (
            <button
              type="button"
              onClick={() => void handleDownload()}
              disabled={downloading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-xl"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download CV
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-8 space-y-5">
        {downloadError && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{downloadError}</p>
        )}
        <div className={`bg-gradient-to-br ${scoreBg} rounded-2xl px-6 py-5 text-white`}>
          <p className="text-white/70 text-xs font-medium uppercase tracking-wide">
            {report.goalCode} · Graded against {report.goalTitle}
          </p>
          <h1 className="text-2xl font-bold mt-1">{report.candidateName}</h1>
          <p className="text-white/70 text-xs mt-1 truncate">{report.fileName}</p>
          <div className="flex items-end justify-between mt-4">
            <div className="flex flex-col gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${rec.className}`}>
                {rec.icon}
                <span className="font-semibold text-sm">{rec.label}</span>
              </span>
              {report.grade ? <span className="text-sm font-black">Grade {report.grade}</span> : null}
            </div>
            <div className="text-right">
              <div className="text-5xl font-black">{score}</div>
              <div className="text-white/70 text-xs">/100 goal grade</div>
            </div>
          </div>
        </div>

        {report.reason && (
          <section className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Assessment</h2>
            <p className="text-sm text-slate-700 leading-relaxed">{report.reason}</p>
          </section>
        )}

        {report.scores && (
          <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Score breakdown</h2>
            {[
              { key: "skills_score", label: "Skills", icon: <Star className="w-3.5 h-3.5" /> },
              { key: "experience_score", label: "Experience", icon: <Briefcase className="w-3.5 h-3.5" /> },
              { key: "years_score", label: "Projects", icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { key: "education_score", label: "Education", icon: <BookOpen className="w-3.5 h-3.5" /> },
              { key: "achievements_score", label: "Achievements", icon: <Award className="w-3.5 h-3.5" /> },
              { key: "keyword_score", label: "Focus skills", icon: <Tag className="w-3.5 h-3.5" /> },
            ].map((row) => {
              const value = report.scores?.[row.key as keyof typeof report.scores] ?? 0;
              return (
                <div key={row.key} className="flex items-center gap-3">
                  <span className="text-slate-400">{row.icon}</span>
                  <span className="text-xs font-medium text-slate-600 w-28">{row.label}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-8 text-right">{value}</span>
                </div>
              );
            })}
          </section>
        )}

        {(report.highlights.length > 0 || report.redFlags.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {report.highlights.length > 0 && (
              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Strengths</h2>
                {report.highlights.map((item) => (
                  <p key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </p>
                ))}
              </section>
            )}
            {report.redFlags.length > 0 && (
              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gaps</h2>
                {report.redFlags.map((item) => (
                  <p key={item} className="flex items-start gap-2 text-sm text-slate-700">
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </p>
                ))}
              </section>
            )}
          </div>
        )}

        <section className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-1.5 mb-3">
            {report.missingSkills.length ? (
              <ShieldAlert className="w-4 h-4 text-red-500" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            )}
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Skills</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {report.matchedSkills.map((s) => (
              <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 font-medium">{s}</span>
            ))}
            {report.missingSkills.map((s) => (
              <span key={`m-${s}`} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full border border-red-200 font-medium">{s}</span>
            ))}
            {report.matchedSkills.length === 0 && report.missingSkills.length === 0 && (
              <span className="text-xs text-slate-400 italic">No skills listed</span>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
