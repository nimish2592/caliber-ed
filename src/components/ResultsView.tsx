"use client";

import { DIMENSION_LABELS, statusLabel } from "@/lib/assessment/profiles";
import type { DimensionStatus } from "@/lib/assessment/types";

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
  summary,
  dimensions,
  recommendations,
}: {
  overallScore: number;
  summary: string;
  dimensions: Dimension[];
  recommendations: Rec[];
}) {
  const strengths = [...dimensions].sort((a, b) => b.score - a.score).filter((d) => d.score >= 65).slice(0, 3);
  const attention = [...dimensions].sort((a, b) => a.score - b.score).filter((d) => d.score < 65).slice(0, 3);
  const rec = readiness(overallScore);

  return (
    <div className="space-y-8">
      <section className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Your CV score</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Career readiness</h1>
          <p className="mt-3 max-w-xl text-slate-500 text-sm">{summary}</p>
          <span className={`inline-flex mt-4 items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${rec.className}`}>
            {rec.label}
          </span>
        </div>
        <div className="text-right">
          <div className="text-6xl font-black text-slate-900">{overallScore}</div>
          <div className="text-xs text-slate-400">/100</div>
        </div>
      </section>

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
            {dimensions.map((d) => (
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
