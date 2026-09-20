"use client";

import { useEffect, useState } from "react";
import LoadingOverlay from "./LoadingOverlay";
import { ResultsView } from "./ResultsView";

type Payload = {
  status: string;
  error?: string | null;
  overallScore?: number;
  grade?: string;
  summary?: string;
  goalTitle?: string | null;
  goalFit?: { profile_quality: number; focus_skills: number; context_alignment: number } | null;
  matchedSkills?: string[];
  missingSkills?: string[];
  dimensions?: Array<{ key: string; label: string; score: number; status: string; evidence: string }>;
  recommendations?: Array<{ priority: string; title: string; detail: string }>;
};

export function AssessmentClient({ id, token }: { id: string; token: string }) {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/assessments/${id}?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (!cancelled) setData(json);
      if (!cancelled && (json.status === "queued" || json.status === "processing")) {
        setTimeout(load, 1000);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  if (!data || data.status === "queued" || data.status === "processing") {
    return <LoadingOverlay message="Reading your CV" subMessage="Extracting sections and preparing your career-readiness assessment." />;
  }

  if (data.status === "failed") {
    return (
      <div className="py-16 text-center">
        <p className="text-2xl font-bold text-slate-900">We could not complete this assessment</p>
        <p className="mt-3 text-slate-500">{data.error || "Please try a text-based PDF or DOCX."}</p>
      </div>
    );
  }

  return (
    <ResultsView
      overallScore={data.overallScore ?? 0}
      grade={data.grade}
      summary={data.summary ?? ""}
      goalTitle={data.goalTitle}
      goalFit={data.goalFit}
      matchedSkills={data.matchedSkills ?? []}
      missingSkills={data.missingSkills ?? []}
      dimensions={data.dimensions ?? []}
      recommendations={data.recommendations ?? []}
    />
  );
}
