"use client";

import {
  QUALITY_CHECK_KEYS,
  QUALITY_CHECK_LABELS,
  type QualityChecks,
} from "@/lib/assessment/qualityChecks";

function scoreTone(score: number): { text: string; bar: string } {
  if (score >= 80) return { text: "text-emerald-700", bar: "bg-emerald-500" };
  if (score >= 65) return { text: "text-blue-700", bar: "bg-blue-500" };
  if (score >= 50) return { text: "text-amber-700", bar: "bg-amber-500" };
  return { text: "text-red-600", bar: "bg-red-500" };
}

export default function QualityChecksGrid({
  checks,
  average,
}: {
  checks: QualityChecks | null | undefined;
  average?: number | null;
}) {
  if (!checks) return null;

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Presentation & ATS checks
          </h2>
          <p className="mt-1 text-xs text-slate-400">Each check is scored 0–100.</p>
        </div>
        {average != null && (
          <p className="text-sm font-semibold text-slate-700">
            Avg <span className="text-lg font-black text-slate-900">{average}</span>
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {QUALITY_CHECK_KEYS.map((key) => {
          const item = checks[key];
          const tone = scoreTone(item.score);
          return (
            <div key={key} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {QUALITY_CHECK_LABELS[key]}
              </p>
              <p className={`mt-1 text-3xl font-black ${tone.text}`}>{item.score}</p>
              <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }} />
              </div>
              {item.evidence ? <p className="mt-2 text-[11px] leading-snug text-slate-500">{item.evidence}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
