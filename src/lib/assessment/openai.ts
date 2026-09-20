import { appConfig } from "../config";
import { DIMENSION_LABELS, overallHeadline, statusFromScore } from "./profiles";
import type {
  AssessmentEngine,
  DimensionKey,
  DimensionScore,
  EngineResult,
  Recommendation,
} from "./types";
import { DIMENSION_KEYS } from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export const openaiEngine: AssessmentEngine = {
  name: "openai",
  async score({ text, structured, profile, goal }) {
    if (!appConfig.openaiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const prompt = `You are a career counsellor for higher-education students (not a recruiter ATS).
Score this CV against the institution's higher-education goal below. This is NOT a job description and you must not reject a student for lacking full-time work.

GOAL TITLE: ${goal?.title ?? "Internship & placement readiness"}

GOAL CONTEXT:
${(goal?.contextText ?? "").slice(0, 4000)}

FOCUS SKILLS: ${(goal?.focusSkills ?? []).join(", ") || "communication, projects, internships, technical skills"}

Be specific to the actual CV. Do not invent jobs.

Return ONLY JSON:
{
  "education": {"score": 0, "evidence": ""},
  "skills": {"score": 0, "evidence": ""},
  "experience": {"score": 0, "evidence": ""},
  "internships": {"score": 0, "evidence": ""},
  "projects": {"score": 0, "evidence": ""},
  "achievements": {"score": 0, "evidence": ""},
  "certifications": {"score": 0, "evidence": ""},
  "formatting": {"score": 0, "evidence": ""},
  "completeness": {"score": 0, "evidence": ""},
  "recommendations": [{"priority": "high"|"medium"|"optional", "title": "", "detail": "", "dimension": "projects"}]
}

Weights (for your judgment, not a JD match): ${JSON.stringify(profile.dimensions)}

STRUCTURED EXTRACT:
${JSON.stringify(structured, null, 2).slice(0, 6000)}

CV TEXT:
${text.slice(0, 12000)}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${appConfig.openaiKey}`,
      },
      body: JSON.stringify({
        model: appConfig.openaiModel,
        temperature: 0,
        max_tokens: 1600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message || "OpenAI scoring failed");
    }

    const data = await response.json();
    const content = String(data.choices?.[0]?.message?.content ?? "")
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
    const parsed = JSON.parse(content) as Record<string, unknown>;

    const dimensions: DimensionScore[] = DIMENSION_KEYS.map((key) => {
      const raw = parsed[key] as { score?: number; evidence?: string } | undefined;
      const score = clamp(Number(raw?.score ?? 0));
      return {
        key,
        label: DIMENSION_LABELS[key],
        weight: profile.dimensions[key],
        score,
        status: statusFromScore(score),
        evidence: String(raw?.evidence ?? ""),
      };
    });

    const recs: Recommendation[] = Array.isArray(parsed.recommendations)
      ? (parsed.recommendations as Recommendation[]).slice(0, 8).map((r) => ({
          priority: r.priority === "high" || r.priority === "optional" ? r.priority : "medium",
          title: String(r.title ?? "Improve this section"),
          detail: String(r.detail ?? ""),
          dimension: (DIMENSION_KEYS.includes(r.dimension as DimensionKey)
            ? r.dimension
            : "completeness") as DimensionKey,
        }))
      : [];

    const weightSum = dimensions.reduce((s, d) => s + d.weight, 0) || 1;
    const overallScore = clamp(dimensions.reduce((s, d) => s + d.score * d.weight, 0) / weightSum);

    return {
      overallScore,
      summary: overallHeadline(overallScore),
      dimensions,
      recommendations: recs,
      engine: "openai",
    } satisfies EngineResult;
  },
};
