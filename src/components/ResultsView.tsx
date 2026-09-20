"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { DIMENSION_LABELS, statusLabel } from "@/lib/assessment/profiles";
import { isQualityCheckKey, type QualityChecks } from "@/lib/assessment/qualityChecks";
import type { DimensionStatus } from "@/lib/assessment/types";
import GradeBadge from "@/components/GradeBadge";
import QualityChecksGrid from "@/components/QualityChecksGrid";
import { downloadFromApi } from "@/utils/downloadFromApi";

type Dimension = {
  key: string;
  label: string;
  score: number;
  status: DimensionStatus | string;
  evidence: string;
};

type Rec = {
  priority: string;
  title: string;
  detail: string;
};

type GoalFit = {
  profile_quality: number;
  focus_skills: number;
  context_alignment: number;
};

const statusColor: Record<string, string> = {
  strong: "text-emerald-700",
  good: "text-emerald-600",
  developing: "text-amber-700",
  needs_improvement: "text-red-600",
};

function readiness(score: number) {
  if (score >= 75) return { label: "Ready", className: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (score >= 50) return { label: "Developing", className: "bg-amber-50 text-amber-700 border-amber-200" };
  return { label: "Needs work", className: "bg-red-50 text-red-700 border-red-200" };
}

export function ResultsView({
  overallScore,
  grade,
  summary,
  goalTitle,
  goalFit,
  matchedSkills,
  missingSkills,
  dimensions,
  recommendations,
  qualityChecks,
  qualityAverage,
  reportUrl,
  reportFileName,
}: {
  overallScore: number;
  grade?: string;
  summary: string;
  goalTitle?: string | null;
  goalFit?: GoalFit | null;
  matchedSkills?: string[];
  missingSkills?: string[];
  dimensions: Dimension[];
  recommendations: Rec[];
  qualityChecks?: QualityChecks | null;
  qualityAverage?: number | null;
  reportUrl?: string;
  reportFileName?: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const content = dimensions.filter((d) => !isQualityCheckKey(d.key));
  const strengths = [...content].sort((a, b) => b.score - a.score).filter((d) => d.score >= 65).slice(0, 3);
  const attention = [...content].sort((a, b) => a.score - b.score).filter((d) => d.score < 65).slice(0, 3);
  const rec = readiness(overallScore);

  return (
    <div className="space-y-8">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {goalTitle ? `Graded against ${goalTitle}` : "Your CV grade"}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Career readiness report</h1>
          <p className="mt-3 max-w-xl text-slate-500 text-sm">{summary}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <GradeBadge grade={grade} score={overallScore} />
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${rec.className}`}>
              {rec.label}
            </span>
            {reportUrl && (
              <button
                type="button"
                onClick={async () => {
                  setDownloading(true);
                  setDownloadError("");
                  try {
                    await downloadFromApi(reportUrl, reportFileName || "cv-report.pdf");
                  } catch (err) {
                    setDownloadError(err instanceof Error ? err.message : "Could not download the report.");
                  } finally {
                    setDownloading(false);
                  }
                }}
                disabled={downloading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Download report
              </button>
            )}
          </div>
          {downloadError ? <p className="mt-2 text-xs text-red-600">{downloadError}</p> : null}
        </div>
        <div className="text-right">
          <div className="text-6xl font-black text-slate-900">{grade || overallScore}</div>
          <div className="text-xs text-slate-400">{grade ? `${overallScore}/100` : "/100"}</div>
        </div>
      </section>

      <QualityChecksGrid checks={qualityChecks} average={qualityAverage} />

      {goalFit && (
        <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">How this grade was calculated</h2>
          {[
            { label: "CV quality", value: goalFit.profile_quality, hint: "40%" },
            { label: "Focus skills", value: goalFit.focus_skills, hint: "35%" },
            { label: "Goal context", value: goalFit.context_alignment, hint: "25%" },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-xs font-medium text-slate-600 w-28">{row.label}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.max(0, Math.min(100, row.value))}%` }} />
              </div>
              <span className="text-xs font-bold text-slate-700 w-8 text-right">{row.value}</span>
              <span className="text-[10px] text-slate-400 w-8">{row.hint}</span>
            </div>
          ))}
          {(matchedSkills?.length || missingSkills?.length) ? (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {matchedSkills?.map((s) => (
                <span key={s} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full border border-emerald-100">{s}</span>
              ))}
              {missingSkills?.map((s) => (
                <span key={`m-${s}`} className="px-2 py-0.5 bg-red-50 text-red-700 text-xs rounded-full border border-red-100">{s}</span>
              ))}
            </div>
          ) : null}
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your strengths</h2>
          <ul className="mt-4 space-y-3">
            {strengths.length ? strengths.map((d) => (
              <li key={d.key} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-slate-700">{d.label}</span>
                <span className="font-semibold text-slate-900">{d.score}</span>
              </li>
            )) : <li className="text-sm text-slate-400">We’ll highlight strengths as this profile develops.</li>}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs attention</h2>
          <ul className="mt-4 space-y-3">
            {attention.length ? attention.map((d) => (
              <li key={d.key} className="flex items-baseline justify-between gap-4 text-sm">
                <span className="text-slate-700">{d.label}</span>
                <span className="font-semibold text-slate-900">{d.score}</span>
              </li>
            )) : <li className="text-sm text-slate-400">No major gaps in the scored sections.</li>}
          </ul>
        </section>
      </div>

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top recommendations</h2>
        <ol className="mt-4 space-y-3">
          {recommendations.slice(0, 5).map((item, i) => (
            <li key={`${item.title}-${i}`} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">{item.priority}</p>
              <p className="mt-1 font-semibold text-slate-800">{i + 1}. {item.title}</p>
              <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Area</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {content.map((d) => (
              <tr key={d.key} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800">{d.label || DIMENSION_LABELS[d.key as keyof typeof DIMENSION_LABELS]}</div>
                  {d.evidence ? <div className="mt-1 text-xs text-slate-400">{d.evidence}</div> : null}
                </td>
                <td className="px-4 py-3 font-semibold">{d.score}</td>
                <td className={`px-4 py-3 ${statusColor[d.status] ?? "text-slate-600"}`}>
                  {statusLabel(d.status as DimensionStatus)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
