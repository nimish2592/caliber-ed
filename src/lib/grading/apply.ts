import { gradeAgainstGoal, recommendationsForMissingSkills } from "../grading/goalGrade";
import type { EngineResult, GoalContext, StructuredCv } from "../assessment/types";

export function applyGoalGrade(
  result: EngineResult,
  params: { structured: StructuredCv; text: string; goal?: GoalContext | null },
): EngineResult {
  const profileScore = result.profileScore ?? result.overallScore;
  const graded = gradeAgainstGoal({
    result: { ...result, profileScore, overallScore: profileScore },
    structured: params.structured,
    text: params.text,
    goal: params.goal,
  });

  const extraRecs = params.goal
    ? recommendationsForMissingSkills(graded.missingSkills, params.goal.title)
    : [];
  const recommendations = [...extraRecs, ...result.recommendations]
    .filter((rec, index, all) => all.findIndex((r) => r.title === rec.title) === index)
    .slice(0, 8);

  return {
    ...result,
    profileScore,
    overallScore: graded.score,
    summary: graded.summary,
    recommendations,
    goalGrade: graded,
  };
}

export type { GoalGrade, GoalFitBreakdown } from "../grading/goalGrade";
