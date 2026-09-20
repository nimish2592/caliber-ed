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
  completeness: "Completeness",
};

/** Higher Education Default — student career-readiness, not JD fit. */
export const DEFAULT_HIGHER_ED_PROFILE: AssessmentProfile = {
  name: "Higher Education Default",
  slug: "higher-education-default",
  dimensions: {
    education: 15,
    skills: 15,
    experience: 10,
    internships: 10,
    projects: 20,
    achievements: 15,
    certifications: 5,
    formatting: 5,
    completeness: 5,
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
