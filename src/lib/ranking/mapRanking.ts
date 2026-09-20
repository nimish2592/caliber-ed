import { qualityAverage, qualityChecksFromDimensions } from "../assessment/qualityChecks";
import type { EngineResult, StructuredCv } from "../assessment/types";
import { gradeAgainstGoal } from "../grading/goalGrade";
import { letterGradeFromScore } from "../grading/letterGrade";
import type { DimensionScores, HeRecommendation, RankingPayload } from "./types";

function dim(result: EngineResult, key: string, fallback = 0): number {
  return result.dimensions.find((d) => d.key === key)?.score ?? fallback;
}

export function heRecommendation(score: number): HeRecommendation {
  if (score >= 75) return "ready";
  if (score >= 50) return "developing";
  return "needs_work";
}

export function buildRanking(params: {
  structured: StructuredCv;
  result: EngineResult;
  text: string;
  fileName: string;
  focusSkills: string[];
  goalTitle?: string;
  goalContext?: string;
}): RankingPayload {
  const { structured, result, text, fileName, focusSkills } = params;
  const graded = result.goalGrade ?? gradeAgainstGoal({
    result,
    structured,
    text,
    goal: {
      title: params.goalTitle || "",
      contextText: params.goalContext || "",
      focusSkills,
    },
  });

  const internships = dim(result, "internships");
  const experience = dim(result, "experience");
  const experienceScore = Math.max(internships, experience);

  const scores: DimensionScores = {
    skills_score: dim(result, "skills"),
    experience_score: experienceScore,
    years_score: dim(result, "projects", experienceScore),
    education_score: dim(result, "education"),
    achievements_score: dim(result, "achievements"),
    keyword_score: graded.fit.focus_skills,
    location_score: 0,
  };

  const highlights = result.dimensions
    .filter((d) => d.score >= 70 && d.evidence)
    .map((d) => d.evidence)
    .slice(0, 5);

  const redFlags = result.recommendations.filter((r) => r.priority === "high").map((r) => r.title);
  const overall = result.overallScore;
  const years = structured.internships.length + structured.experience.length;
  const qualityChecks = qualityChecksFromDimensions(result.dimensions);

  return {
    candidate_name: structured.name || "Unknown",
    file_name: fileName,
    score: overall,
    grade: graded.grade || letterGradeFromScore(overall),
    scores,
    matched_skills: graded.matchedSkills,
    missing_skills: graded.missingSkills,
    highlights,
    red_flags: redFlags,
    experience_match: experienceScore >= 70 ? "high" : experienceScore >= 50 ? "medium" : "low",
    recommendation: heRecommendation(overall),
    reason: result.summary,
    mandatory_match_pct: graded.fit.focus_skills,
    critical_skills_missing: graded.missingSkills,
    experience_fit_status: experienceScore >= 70 ? "perfect" : "unknown",
    overqualification_penalty: 0,
    years_experience: years,
    candidate_location: null,
    location_match_status: null,
    resume_text: text.slice(0, 50_000),
    candidate_email: structured.email,
    goal_fit: graded.fit,
    quality_checks: qualityChecks,
    quality_average: qualityAverage(qualityChecks),
    recommendations: result.recommendations,
    dimension_scores: result.dimensions.map((d) => ({
      key: d.key,
      label: d.label,
      score: d.score,
      status: d.status,
      evidence: d.evidence,
    })),
  };
}
