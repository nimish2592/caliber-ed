import type { AssessmentProfile, DimensionKey, DimensionStatus } from "./types";

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  education: "Education",
  skills: "Skills",
  experience: "Experience",
  internships: "Internships",
  projects: "Projects",
  achievements: "Achievements",
  certifications: "Certifications",
  formatting: "Formatting",
  english: "English",
  spacing: "Spacing",
  readability: "Readability",
  ats: "ATS checks",
  completeness: "Completeness",
};

/** Higher Education Default — student career-readiness, not JD fit. */
export const DEFAULT_HIGHER_ED_PROFILE: AssessmentProfile = {
  name: "Higher Education Default",
  slug: "higher-education-default",
  dimensions: {
    education: 12,
    skills: 12,
    experience: 8,
    internships: 8,
    projects: 15,
    achievements: 10,
    certifications: 4,
    formatting: 6,
    english: 6,
    spacing: 4,
    readability: 6,
    ats: 6,
    completeness: 3,
  },
};

/**
 * Status bands (documented, not arbitrary):
 * 80–100 Strong
 * 65–79  Good
 * 50–64  Developing
 * 0–49   Needs improvement
 */
export function statusFromScore(score: number): DimensionStatus {
  if (score >= 80) return "strong";
  if (score >= 65) return "good";
  if (score >= 50) return "developing";
  return "needs_improvement";
}

export function statusLabel(status: DimensionStatus): string {
  switch (status) {
    case "strong":
      return "Strong";
    case "good":
      return "Good";
    case "developing":
      return "Developing";
    default:
      return "Needs improvement";
  }
}

export function overallHeadline(score: number): string {
  if (score >= 85) return "A strong, career-ready profile — keep refining the details.";
  if (score >= 70) return "Good foundation — there are several opportunities to strengthen your profile.";
  if (score >= 55) return "A solid start — a few focused improvements will make this CV much stronger.";
  return "There is a clear path to a more competitive CV. Start with the high-priority recommendations.";
}
