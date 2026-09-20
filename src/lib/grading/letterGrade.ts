export const LETTER_GRADES = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"] as const;
export type LetterGrade = (typeof LETTER_GRADES)[number];

/**
 * Letter bands aligned to career-readiness, not a 90=A school curve.
 * Ready starts at B (75). Developing covers C and high D. Needs work is D/F.
 */
export function letterGradeFromScore(score: number): LetterGrade {
  const n = Math.max(0, Math.min(100, Math.round(score)));
  if (n >= 90) return "A";
  if (n >= 85) return "A-";
  if (n >= 80) return "B+";
  if (n >= 75) return "B";
  if (n >= 70) return "B-";
  if (n >= 65) return "C+";
  if (n >= 58) return "C";
  if (n >= 50) return "C-";
  if (n >= 40) return "D";
  return "F";
}

export function gradeTone(grade: LetterGrade): "strong" | "good" | "developing" | "needs_work" {
  if (grade === "A" || grade === "A-" || grade === "B+") return "strong";
  if (grade === "B" || grade === "B-") return "good";
  if (grade === "C+" || grade === "C" || grade === "C-") return "developing";
  return "needs_work";
}

export function gradeBadgeClass(grade: LetterGrade): string {
  const tone = gradeTone(grade);
  if (tone === "strong") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (tone === "good") return "bg-blue-100 text-blue-800 border-blue-200";
  if (tone === "developing") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export function gradeHeadline(grade: LetterGrade, goalTitle: string): string {
  const against = goalTitle.trim() || "this goal";
  if (grade === "A" || grade === "A-") return `Excellent fit for ${against}.`;
  if (grade === "B+" || grade === "B") return `Ready for ${against}, with a few refinements.`;
  if (grade === "B-") return `Close to ready for ${against} — strengthen the gaps below.`;
  if (grade === "C+" || grade === "C" || grade === "C-") return `Developing toward ${against}. Focus on the missing evidence.`;
  return `Not yet aligned to ${against}. Start with the high-priority recommendations.`;
}
