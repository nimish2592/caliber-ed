"use client";

import { useEffect, useMemo, useState } from "react";
import { X, CheckCircle2, AlertTriangle, Star, TrendingUp, BookOpen, Award, Tag, Briefcase, ThumbsUp, Minus, GraduationCap, ShieldAlert, ShieldCheck, Download, Share2, Loader2, FileText } from "lucide-react";
import type { DimensionScores, RankedCv, ScoringWeights } from "@/lib/ranking/types";
import { DEFAULT_WEIGHTS } from "@/lib/ranking/types";
import ShareCvModal from "@/components/ShareCvModal";
import QualityChecksGrid from "@/components/QualityChecksGrid";
import { downloadFromApi } from "@/utils/downloadFromApi";
import { studentReportFileName } from "@/lib/share/publicReport";

const DIMENSION_META: {
  key: keyof DimensionScores;
  label: string;
  icon: React.ReactNode;
  weightKey: keyof ScoringWeights;
  color: string;
  bg: string;
}[] = [
  { key: "skills_score",       label: "Skills Match",   icon: <Star className="w-3.5 h-3.5" />,       weightKey: "skills",       color: "text-blue-600",   bg: "bg-blue-500" },
  { key: "experience_score",   label: "Experience",     icon: <Briefcase className="w-3.5 h-3.5" />,   weightKey: "experience",   color: "text-emerald-600", bg: "bg-emerald-500" },
  { key: "years_score",        label: "Projects",       icon: <TrendingUp className="w-3.5 h-3.5" />,  weightKey: "years",        color: "text-amber-600",  bg: "bg-amber-500" },
  { key: "education_score",    label: "Education",      icon: <BookOpen className="w-3.5 h-3.5" />,    weightKey: "education",    color: "text-cyan-600",   bg: "bg-cyan-500" },
  { key: "achievements_score", label: "Achievements",   icon: <Award className="w-3.5 h-3.5" />,       weightKey: "achievements", color: "text-orange-600", bg: "bg-orange-500" },
  { key: "keyword_score",      label: "Focus Skills",   icon: <Tag className="w-3.5 h-3.5" />,         weightKey: "keywords",     color: "text-slate-600",  bg: "bg-slate-500" },
];

const RECOMMENDATION_CONFIG = {
  ready:       { label: "Ready",       icon: <ThumbsUp className="w-4 h-4" />,      bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  developing:  { label: "Developing",  icon: <Minus className="w-4 h-4" />,         bg: "bg-amber-50",   border: "border-amber-200",   text: "text-amber-700" },
  needs_work:  { label: "Needs work",  icon: <GraduationCap className="w-4 h-4" />, bg: "bg-red-50",     border: "border-red-200",     text: "text-red-700" },
};

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-8 text-right">{value}</span>
    </div>
  );
}

export default function ExplainabilityPanel({
  resume,
  weights = DEFAULT_WEIGHTS,
  onClose,
}: {
  resume: RankedCv;
  weights?: ScoringWeights;
  onClose: () => void;
}) {
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState<"cv" | "report" | "">("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const effectiveWeights = { ...DEFAULT_WEIGHTS, ...weights };
  const dimensionMeta = useMemo(() => DIMENSION_META, []);
  const totalWeight = dimensionMeta.reduce((sum, d) => sum + (effectiveWeights[d.weightKey] || 0), 0);

  const rec = RECOMMENDATION_CONFIG[resume.recommendation] ?? RECOMMENDATION_CONFIG.needs_work;
  const finalScore = resume.score ?? 0;
  const scoreBgColor = finalScore >= 75 ? "from-emerald-600 to-emerald-700" : finalScore >= 50 ? "from-amber-500 to-amber-600" : "from-red-500 to-red-600";
  const scoreColor = finalScore >= 75 ? "text-emerald-600" : finalScore >= 50 ? "text-amber-600" : "text-red-500";
  const mandatoryPct = resume.mandatory_match_pct ?? 0;
  const mandatoryBarColor = mandatoryPct >= 80 ? "bg-emerald-500" : mandatoryPct >= 50 ? "bg-amber-500" : "bg-red-500";
  const mustHaveMissing = resume.missing_skills ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div
        className="relative bg-white h-full w-full max-w-lg shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideInRight 0.25s ease-out" }}
      >
        <div className={`bg-gradient-to-br ${scoreBgColor} px-6 py-5 text-white flex-shrink-0`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-white/70 text-xs font-medium uppercase tracking-wide mb-1">Graded against this goal</p>
              <h2 className="text-xl font-bold truncate">{resume.candidate_name || "Unknown"}</h2>
              <p className="text-white/60 text-xs mt-0.5 truncate">{resume.file_name}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex flex-col items-start gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${rec.bg} ${rec.border} ${rec.text}`}>
                {rec.icon}
                <span className="font-semibold text-sm">{rec.label}</span>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white/15 text-white text-sm font-black">
                {resume.grade || "—"}
              </span>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black">{finalScore}</div>
              <div className="text-white/60 text-xs">/100 goal grade</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Goal grade</h3>
              {resume.goal_fit ? (
                <div className="space-y-2">
                  {[
                    { label: "CV quality", value: resume.goal_fit.profile_quality, weight: "40%" },
                    { label: "Focus skills", value: resume.goal_fit.focus_skills, weight: "35%" },
                    { label: "Goal context", value: resume.goal_fit.context_alignment, weight: "25%" },
                  ].map((row) => (
                    <div key={row.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-600">{row.label} <span className="text-slate-400">({row.weight})</span></span>
                        <span className="text-xs font-bold text-slate-700">{row.value}</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${row.value >= 75 ? "bg-emerald-500" : row.value >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.max(0, Math.min(100, row.value))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">Focus skill match</span>
                    <span className="text-xs font-bold text-slate-700">{mandatoryPct}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${mandatoryBarColor}`} style={{ width: `${Math.max(0, Math.min(100, mandatoryPct))}%` }} />
                  </div>
                </div>
              )}
              {mustHaveMissing.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-semibold text-red-600">Focus skills not detected</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {mustHaveMissing.map((s) => (
                      <span key={s} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full border border-red-200 font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Focus skills detected</span>
                </div>
              )}
            </div>

            {resume.reason && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Assessment</h3>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">{resume.reason}</p>
              </div>
            )}

            <QualityChecksGrid checks={resume.quality_checks} average={resume.quality_average} />

            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Score breakdown</h3>
              <div className="space-y-3">
                {dimensionMeta.map(({ key, label, icon, weightKey, color, bg }) => {
                  const score = resume.scores?.[key] ?? 0;
                  const weight = effectiveWeights[weightKey];
                  const pct = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0;
                  return (
                    <div key={key} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className={color}>{icon}</span>
                          <span className="text-xs font-semibold text-slate-700">{label}</span>
                          <span className="text-xs text-slate-400">({pct}% weight)</span>
                        </div>
                        <span className={`text-sm font-bold ${scoreColor}`}>{score}</span>
                      </div>
                      <ScoreBar value={score} color={bg} />
                    </div>
                  );
                })}
              </div>
            </div>

            {resume.highlights.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Strengths</h3>
                <div className="space-y-1.5">
                  {resume.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resume.red_flags.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Gaps</h3>
                <div className="space-y-1.5">
                  {resume.red_flags.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Matched skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {resume.matched_skills.length > 0
                    ? resume.matched_skills.map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 font-medium">{s}</span>
                      ))
                    : <span className="text-xs text-slate-400 italic">None detected</span>}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Missing focus skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {mustHaveMissing.length > 0
                    ? mustHaveMissing.map((s) => (
                        <span key={s} className="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full border border-red-100 font-medium">{s}</span>
                      ))
                    : <span className="text-xs text-slate-400 italic">None missing</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex-shrink-0 flex items-center justify-between gap-2">
          <p className="text-xs text-slate-400">Press Esc to close</p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSharing(true)}
              disabled={resume.status !== "completed"}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-medium rounded-lg"
            >
              <Share2 className="w-3.5 h-3.5" /> Share
            </button>
            <button
              type="button"
              disabled={downloading === "report"}
              onClick={async () => {
                setDownloading("report");
                try {
                  await downloadFromApi(
                    `/api/assessments/${resume.id}/report`,
                    studentReportFileName(resume.candidate_name || "student"),
                  );
                } finally {
                  setDownloading("");
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-medium rounded-lg"
            >
              {downloading === "report" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              Report
            </button>
            <button
              type="button"
              disabled={downloading === "cv"}
              onClick={async () => {
                setDownloading("cv");
                try {
                  await downloadFromApi(`/api/assessments/${resume.id}/cv`, resume.file_name || "CV.pdf");
                } finally {
                  setDownloading("");
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg"
            >
              {downloading === "cv" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              CV
            </button>
          </div>
        </div>
      </div>
      {sharing && <ShareCvModal resume={resume} onClose={() => setSharing(false)} />}
    </div>
  );
}
