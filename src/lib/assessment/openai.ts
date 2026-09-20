import { appConfig } from "../config";
import { computeAiCostUsd } from "./aiCost";
import { DIMENSION_LABELS, overallHeadline, statusFromScore } from "./profiles";
import { QUALITY_CHECK_KEYS, recommendationsForQuality, scoreQualityChecks } from "./qualityChecks";
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

export function createOpenaiEngine(model = appConfig.openaiModel): AssessmentEngine {
  return {
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
  "english": {"score": 0, "evidence": ""},
  "spacing": {"score": 0, "evidence": ""},
  "readability": {"score": 0, "evidence": ""},
  "ats": {"score": 0, "evidence": ""},
  "completeness": {"score": 0, "evidence": ""},
  "goal_fit": {"score": 0, "evidence": ""},
  "recommendations": [{"priority": "high"|"medium"|"optional", "title": "", "detail": "", "dimension": "projects"}]
}

Score each quality check 0-100:
- formatting: contact block, consistent headings, one-column layout
- english: grammar, spelling, professional tone
- spacing: even margins and gaps, not cramped or sparse
- readability: scannable bullets, sentence length, one-page density
- ats: parseable text, standard headings, email/phone, no tables or image-only CVs

goal_fit.score is 0-100 for how well THIS CV meets THIS goal (focus skills + context), not generic CV quality.

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
        model,
        temperature: 0,
        max_tokens: 2200,
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
    const heuristicQuality = scoreQualityChecks(structured, text);

    const dimensions: DimensionScore[] = DIMENSION_KEYS.map((key) => {
      const raw = parsed[key] as { score?: number; evidence?: string } | undefined;
      const qualityFallback = (QUALITY_CHECK_KEYS as readonly string[]).includes(key)
        ? heuristicQuality[key as keyof typeof heuristicQuality]
        : undefined;
      const score = clamp(Number(raw?.score ?? qualityFallback?.score ?? 0));
      return {
        key,
        label: DIMENSION_LABELS[key],
        weight: profile.dimensions[key],
        score,
        status: statusFromScore(score),
        evidence: String(raw?.evidence ?? qualityFallback?.evidence ?? ""),
      };
    });

    const recs: Recommendation[] = [
      ...(Array.isArray(parsed.recommendations)
        ? (parsed.recommendations as Recommendation[]).map((r) => ({
            priority: r.priority === "high" || r.priority === "optional" ? r.priority : "medium" as const,
            title: String(r.title ?? "Improve this section"),
            detail: String(r.detail ?? ""),
            dimension: (DIMENSION_KEYS.includes(r.dimension as DimensionKey)
              ? r.dimension
              : "completeness") as DimensionKey,
          }))
        : []),
      ...recommendationsForQuality(heuristicQuality),
    ]
      .filter((rec, index, all) => all.findIndex((r) => r.title === rec.title) === index)
      .slice(0, 8);

    const goalFitRaw = parsed.goal_fit as { score?: number; evidence?: string } | undefined;
    const llmGoalFit = Number.isFinite(Number(goalFitRaw?.score)) ? clamp(Number(goalFitRaw?.score)) : undefined;

    const weightSum = dimensions.reduce((s, d) => s + d.weight, 0) || 1;
    const overallScore = clamp(dimensions.reduce((s, d) => s + d.score * d.weight, 0) / weightSum);
    const usage = data.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
    const promptTokens = Math.max(0, Number(usage?.prompt_tokens ?? 0));
    const completionTokens = Math.max(0, Number(usage?.completion_tokens ?? 0));

    return {
      overallScore,
      summary: overallHeadline(overallScore),
      dimensions,
      recommendations: recs,
      engine: "openai",
      llmGoalFit,
      llmGoalEvidence: goalFitRaw?.evidence ? String(goalFitRaw.evidence) : undefined,
      promptTokens,
      completionTokens,
      aiCostUsd: computeAiCostUsd(promptTokens, completionTokens),
    } satisfies EngineResult;
    },
  };
}

export const openaiEngine = createOpenaiEngine();
