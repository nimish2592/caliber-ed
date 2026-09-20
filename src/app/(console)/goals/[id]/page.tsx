"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle, Award, BookOpen, Briefcase, ChevronDown, ChevronUp, Download, ExternalLink, Eye, Hash, QrCode, Share2, Star, Tag, Target,
  TrendingUp, Trophy, Upload, Users, GraduationCap, Minus, ThumbsUp, Loader2,
} from "lucide-react";
import Header from "@/components/Header";
import ExplainabilityPanel from "@/components/ExplainabilityPanel";
import ShareCvModal from "@/components/ShareCvModal";
import TextViewerModal from "@/components/TextViewerModal";
import { GOAL_STATUS_CONFIG } from "@/lib/goals/status";
import type { GoalRow } from "@/lib/db/queries";
import type { DimensionScores, RankedCv } from "@/lib/ranking/types";
import { downloadFromApi } from "@/utils/downloadFromApi";
import GradeBadge from "@/components/GradeBadge";

const DIM_ICONS: Record<keyof DimensionScores, React.ReactNode> = {
  skills_score: <Star className="w-3 h-3" />,
  experience_score: <Briefcase className="w-3 h-3" />,
  years_score: <TrendingUp className="w-3 h-3" />,
  education_score: <BookOpen className="w-3 h-3" />,
  achievements_score: <Award className="w-3 h-3" />,
  keyword_score: <Tag className="w-3 h-3" />,
  location_score: <Tag className="w-3 h-3" />,
};

const REC_BADGE = {
  ready: { label: "Ready", className: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <ThumbsUp className="w-3 h-3" /> },
  developing: { label: "Developing", className: "bg-amber-50 text-amber-700 border-amber-200", icon: <Minus className="w-3 h-3" /> },
  needs_work: { label: "Needs work", className: "bg-red-50 text-red-700 border-red-200", icon: <GraduationCap className="w-3 h-3" /> },
};

function ScoreBadge({ score, grade, status }: { score: number | null; grade?: string | null; status: string }) {
  if (status !== "completed" || score === null) {
    return <span className="text-xs text-slate-400 italic">{status === "failed" ? "Failed" : "Pending"}</span>;
  }
  return <GradeBadge grade={grade} score={score} size="sm" />;
}

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [goal, setGoal] = useState<GoalRow | null>(null);
  const [cvs, setCvs] = useState<RankedCv[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [explain, setExplain] = useState<RankedCv | null>(null);
  const [viewing, setViewing] = useState<RankedCv | null>(null);
  const [viewingContext, setViewingContext] = useState(false);
  const [sharing, setSharing] = useState<RankedCv | null>(null);
  const [downloading, setDownloading] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(true);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/goals/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Goal not found.");
      setGoal(data.goal);
      setCvs(data.cvs ?? []);
      setQrDataUrl(data.qrDataUrl ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goal.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);

  const ranked = useMemo(
    () => [...cvs].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
    [cvs],
  );
  const top = ranked.find((r) => r.status === "completed");
  const statusCfg = goal ? GOAL_STATUS_CONFIG[goal.status] : null;

  const downloadNamed = async (key: string, url: string, fallbackName: string) => {
    setDownloading(key);
    setError("");
    try {
      await downloadFromApi(url, fallbackName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    } finally {
      setDownloading("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error || "Goal not found."}</div>
      </div>
    );
  }

  return (
    <>
      <Header
        onBack={() => router.push("/")}
        backLabel="Goals"
        rightContent={
          <div className="flex rounded-xl border border-slate-200 bg-white p-0.5">
            <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white">
              Rankings
            </span>
            <a
              href={`/goals/${goal.id}/qr`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-600 hover:text-slate-900"
            >
              <QrCode className="w-3.5 h-3.5" />
              QR
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        }
      />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-5 lg:px-6 py-6 space-y-6">
          {error && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setSummaryOpen((open) => !open)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
            >
              <div className="min-w-0 flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="font-mono font-bold text-blue-600">{goal.goal_code}</span>
                <span className="font-semibold text-slate-900 truncate">{goal.title}</span>
                {statusCfg && (
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 flex-shrink-0">
                {summaryOpen ? "Hide details" : "Show details"}
                {summaryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            {summaryOpen && (
              <div className="border-t border-slate-100 px-4 pb-4 pt-4 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-slate-900">{goal.title}</h2>
                    <p className="text-sm text-slate-500 mt-1">Scored against higher-education context, not a job description.</p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {goal.focus_skills.map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 font-medium">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingContext(true)}
                      className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50"
                    >
                      View context
                    </button>
                    <button
                      onClick={() => void downloadNamed("context", `/api/goals/${goal.id}/context`, `${goal.goal_code}-context.pdf`)}
                      disabled={downloading === "context"}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-50"
                    >
                      {downloading === "context" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Download context
                    </button>
                    <button
                      onClick={() => router.push(`/goals/${goal.id}/upload`)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl"
                    >
                      <Upload className="w-4 h-4" /> Upload CVs
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrDataUrl} alt={`QR for ${goal.title}`} className="mx-auto" />
                    ) : (
                      <Target className="w-10 h-10 text-slate-300 mx-auto" />
                    )}
                    <p className="mt-2 text-xs font-semibold text-slate-700">Student QR</p>
                    {qrDataUrl && (
                      <div className="mt-3 flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => void downloadNamed("qr", `/api/goals/${goal.id}/qr`, `${goal.goal_code}-student-qr.png`)}
                          disabled={downloading === "qr"}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
                        >
                          {downloading === "qr" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          Download PNG
                        </button>
                        <a
                          href={`/api/goals/${goal.id}/qr?format=svg`}
                          className="text-[11px] text-slate-500 hover:text-slate-800"
                        >
                          Download SVG
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">CVs assessed</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <p className="text-2xl font-bold text-slate-900">{cvs.length}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Top grade</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        <p className="text-2xl font-bold text-slate-900">{top ? `${top.grade ?? ""} ${top.score}` : "—"}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ready</p>
                      <p className="text-2xl font-bold text-slate-900 mt-2">
                        {cvs.filter((c) => c.recommendation === "ready").length}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            {ranked.length === 0 ? (
              <div className="py-16 text-center">
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">No CVs yet</p>
                <p className="text-sm text-slate-400 mt-1">Share the QR or upload student CVs.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Grade</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Dimensions</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Readiness</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((cv, i) => (
                      <tr key={cv.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-800 text-sm">{cv.candidate_name || "Unknown"}</p>
                          {cv.candidate_email ? <p className="text-xs text-slate-400 mt-0.5">{cv.candidate_email}</p> : null}
                        </td>
                        <td className="px-4 py-4">
                          <ScoreBadge score={cv.score} grade={cv.grade} status={cv.status} />
                          {cv.status === "completed" && cv.score != null && (
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 max-w-[80px]">
                              <div
                                className={`h-1.5 rounded-full ${cv.score >= 75 ? "bg-emerald-500" : cv.score >= 50 ? "bg-amber-500" : "bg-red-400"}`}
                                style={{ width: `${cv.score}%` }}
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 hidden lg:table-cell">
                          {cv.scores ? (
                            <div className="flex gap-1.5 flex-wrap max-w-xs">
                              {(Object.keys(DIM_ICONS) as (keyof DimensionScores)[])
                                .filter((k) => k !== "location_score")
                                .map((k) => {
                                  const v = cv.scores[k];
                                  const clr = v >= 75 ? "text-emerald-600 bg-emerald-50" : v >= 50 ? "text-amber-600 bg-amber-50" : "text-red-500 bg-red-50";
                                  return (
                                    <span key={k} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold ${clr}`} title={k.replace("_score", "")}>
                                      {DIM_ICONS[k]} {v}
                                    </span>
                                  );
                                })}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {cv.status === "completed" ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${REC_BADGE[cv.recommendation].className}`}>
                              {REC_BADGE[cv.recommendation].icon}
                              {REC_BADGE[cv.recommendation].label}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic capitalize">{cv.status}</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSharing(cv)}
                              disabled={cv.status !== "completed"}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 disabled:opacity-40 text-violet-700 text-xs font-medium rounded-lg"
                              title={cv.status !== "completed" ? "Rank this CV first" : "Share candidate report"}
                            >
                              <Share2 className="w-3.5 h-3.5" /> Share
                            </button>
                            <button
                              onClick={() => setExplain(cv)}
                              disabled={cv.status !== "completed"}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 text-blue-700 text-xs font-medium rounded-lg"
                            >
                              Explain
                            </button>
                            <button
                              onClick={() => void downloadNamed(`cv-${cv.id}`, `/api/assessments/${cv.id}/cv`, cv.file_name || "CV.pdf")}
                              disabled={downloading === `cv-${cv.id}`}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-medium rounded-lg"
                            >
                              {downloading === `cv-${cv.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                              CV
                            </button>
                            <button
                              onClick={() => setViewing(cv)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
                            >
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {explain && <ExplainabilityPanel resume={explain} onClose={() => setExplain(null)} />}
      {sharing && <ShareCvModal resume={sharing} onClose={() => setSharing(null)} />}
      {viewing && (
        <TextViewerModal
          title={viewing.candidate_name || "Student CV"}
          subtitle={viewing.file_name}
          text={viewing.resume_text}
          downloadUrl={`/api/assessments/${viewing.id}/cv`}
          downloadFileName={viewing.file_name}
          onClose={() => setViewing(null)}
        />
      )}
      {viewingContext && (
        <TextViewerModal
          title={`${goal.goal_code} — ${goal.title}`}
          subtitle={goal.context_file_name || "Higher-education context"}
          text={goal.context_text}
          downloadUrl={`/api/goals/${goal.id}/context`}
          downloadFileName={goal.context_file_name || `${goal.goal_code}-context.pdf`}
          onClose={() => setViewingContext(false)}
        />
      )}
    </>
  );
}
