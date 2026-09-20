import type { EngineResult, GoalContext, Recommendation, StructuredCv } from "../assessment/types";
import { focusSkillCoverage, matchGoalFocusSkills } from "./focusSkills";
import { gradeHeadline, letterGradeFromScore, type LetterGrade } from "./letterGrade";

export const GOAL_GRADE_WEIGHTS = {
  profile: 0.4,
  focusSkills: 0.35,
  context: 0.25,
} as const;

export type GoalFitBreakdown = {
  profile_quality: number;
  focus_skills: number;
  context_alignment: number;
  weights: { profile: number; skills: number; context: number };
};

export type GoalGrade = {
  score: number;
  grade: LetterGrade;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  contextTermsMatched: string[];
  fit: GoalFitBreakdown;
};

const STOPWORDS = new Set([
  "this", "that", "with", "from", "your", "their", "have", "will", "should", "would",
  "about", "after", "before", "student", "students", "career", "readiness", "higher",
  "education", "internships", "internship", "placement", "placements", "campus",
  "score", "scoring", "look", "looks", "into", "them", "they", "them", "than",
  "then", "also", "more", "most", "such", "using", "used", "make", "made",
  "clear", "missing", "section", "sections", "full-time", "reject", "does", "don't",
  "must", "not", "for", "and", "the", "are", "was", "were", "been", "being",
]);

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function contextTerms(contextText: string): string[] {
  const words = (contextText.toLowerCase().match(/[a-z][a-z+#.]{3,}/g) ?? [])
    .filter((w) => !STOPWORDS.has(w));
  const counts = new Map<string, number>();
  for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))
    .map(([word]) => word)
    .slice(0, 20);
}

function contextAlignment(contextText: string, cvText: string): { score: number; matched: string[] } {
  const terms = contextTerms(contextText);
  if (!terms.length) return { score: 70, matched: [] };
  const haystack = cvText.toLowerCase();
  const matched = terms.filter((term) => haystack.includes(term));
  const coverage = matched.length / terms.length;
  return { score: clamp(20 + coverage * 80), matched: matched.slice(0, 8) };
}

function activeWeights(goal?: GoalContext | null): { profile: number; skills: number; context: number } {
  const hasSkills = Boolean(goal?.focusSkills?.length);
  const hasContext = Boolean(goal?.contextText?.trim());
  if (hasSkills && hasContext) {
    return { profile: GOAL_GRADE_WEIGHTS.profile, skills: GOAL_GRADE_WEIGHTS.focusSkills, context: GOAL_GRADE_WEIGHTS.context };
  }
  if (hasSkills) return { profile: 0.55, skills: 0.45, context: 0 };
  if (hasContext) return { profile: 0.55, skills: 0, context: 0.45 };
  return { profile: 1, skills: 0, context: 0 };
}

export function gradeAgainstGoal(params: {
  result: EngineResult;
  structured: StructuredCv;
  text: string;
  goal?: GoalContext | null;
}): GoalGrade {
  const profileQuality = clamp(params.result.profileScore ?? params.result.overallScore);
  const { matched, missing } = matchGoalFocusSkills({
    focusSkills: params.goal?.focusSkills ?? [],
    structured: params.structured,
    text: params.text,
  });
  const focusScore = focusSkillCoverage(matched.length, params.goal?.focusSkills?.length ?? 0);
  const context = contextAlignment(params.goal?.contextText ?? "", params.text);
  const weights = activeWeights(params.goal);

  let composite =
    profileQuality * weights.profile +
    focusScore * weights.skills +
    context.score * weights.context;

  if (typeof params.result.llmGoalFit === "number" && Number.isFinite(params.result.llmGoalFit)) {
    composite = composite * 0.4 + clamp(params.result.llmGoalFit) * 0.6;
  }

  const score = clamp(composite);
  const grade = letterGradeFromScore(score);
  const title = params.goal?.title || "this goal";
  const llmNote = params.result.llmGoalEvidence?.trim();
  const summary = llmNote || gradeHeadline(grade, title);

  return {
    score,
    grade,
    summary,
    matchedSkills: matched,
    missingSkills: missing,
    contextTermsMatched: context.matched,
    fit: {
      profile_quality: profileQuality,
      focus_skills: focusScore,
      context_alignment: context.score,
      weights,
    },
  };
}

export function recommendationsForMissingSkills(missing: string[], goalTitle: string): Recommendation[] {
  if (!missing.length) return [];
  const listed = missing.slice(0, 6).join(", ");
  return [
    {
      priority: "high",
      dimension: "skills",
      title: `Show evidence for ${goalTitle || "this goal"}`,
      detail: `This goal looks for: ${listed}. Add projects, internships, or skills that demonstrate them.`,
    },
  ];
}
