import type { EngineResult, StructuredCv } from "../assessment/types";
import type { DimensionScores, HeRecommendation, RankingPayload } from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function dim(result: EngineResult, key: string, fallback = 0): number {
  return result.dimensions.find((d) => d.key === key)?.score ?? fallback;
}

export function heRecommendation(score: number): HeRecommendation {
  if (score >= 75) return "ready";
  if (score >= 50) return "developing";
  return "needs_work";
}

export function matchFocusSkills(text: string, focusSkills: string[]): { matched: string[]; missing: string[] } {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];
  for (const skill of focusSkills.map((s) => s.trim()).filter(Boolean)) {
    if (lower.includes(skill.toLowerCase())) matched.push(skill);
    else missing.push(skill);
  }
  return { matched, missing };
}

export function buildRanking(params: {
  structured: StructuredCv;
  result: EngineResult;
  text: string;
  fileName: string;
  focusSkills: string[];
}): RankingPayload {
  const { structured, result, text, fileName, focusSkills } = params;
  const { matched, missing } = matchFocusSkills(text, focusSkills);
  const keywordScore = focusSkills.length
    ? clamp((matched.length / focusSkills.length) * 100)
    : dim(result, "completeness", 50);

  const internships = dim(result, "internships");
  const experience = dim(result, "experience");
  const experienceScore = Math.max(internships, experience);

  const scores: DimensionScores = {
    skills_score: dim(result, "skills"),
    experience_score: experienceScore,
    years_score: dim(result, "projects", experienceScore),
    education_score: dim(result, "education"),
    achievements_score: dim(result, "achievements"),
    keyword_score: keywordScore,
    location_score: 0,
  };

  const highlights = result.dimensions
    .filter((d) => d.score >= 70 && d.evidence)
    .map((d) => d.evidence)
    .slice(0, 5);

  const redFlags = result.recommendations.filter((r) => r.priority === "high").map((r) => r.title);

  const overall = result.overallScore;
  const years = structured.internships.length + structured.experience.length;

  return {
    candidate_name: structured.name || "Unknown",
    file_name: fileName,
    score: overall,
    scores,
    matched_skills: matched,
    missing_skills: missing,
    highlights,
    red_flags: redFlags,
    experience_match: experienceScore >= 70 ? "high" : experienceScore >= 50 ? "medium" : "low",
    recommendation: heRecommendation(overall),
    reason: result.summary,
    mandatory_match_pct: focusSkills.length ? keywordScore : 100,
    critical_skills_missing: missing,
    experience_fit_status: experienceScore >= 70 ? "perfect" : "unknown",
    overqualification_penalty: 0,
    years_experience: years,
    candidate_location: null,
    location_match_status: null,
    resume_text: text.slice(0, 50_000),
    candidate_email: structured.email,
  };
}
