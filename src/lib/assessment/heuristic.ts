import { DIMENSION_LABELS, overallHeadline, statusFromScore } from "./profiles";
import type {
  AssessmentEngine,
  AssessmentProfile,
  DimensionKey,
  DimensionScore,
  EngineResult,
  Recommendation,
  StructuredCv,
} from "./types";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function hasQuantified(lines: string[]): boolean {
  return lines.some((l) => /\d/.test(l) && /(%|percent|increased|reduced|users|students|clients|revenue|saved)/i.test(l));
}

function scoreEducation(cv: StructuredCv): { score: number; evidence: string } {
  if (cv.education.length === 0) return { score: 28, evidence: "No education section was detected." };
  const joined = cv.education.join(" ");
  let score = 62;
  if (/\b(b\.?tech|b\.?e|bsc|b\.sc|ba|bcom|bachelor|mtech|mba|master|phd|diploma)\b/i.test(joined)) score += 18;
  if (/\b(university|college|institute|iit|nit|bits)\b/i.test(joined)) score += 12;
  if (/\b(20\d{2})\b/.test(joined)) score += 6;
  return { score: clamp(score), evidence: cv.education[0] };
}

function scoreSkills(cv: StructuredCv): { score: number; evidence: string } {
  const n = cv.skills.length;
  if (n === 0) return { score: 30, evidence: "No skills list was found." };
  const score = n >= 10 ? 90 : n >= 6 ? 78 : n >= 3 ? 64 : 48;
  return { score, evidence: `Detected ${n} skill${n === 1 ? "" : "s"}: ${cv.skills.slice(0, 6).join(", ")}.` };
}

function scoreExperience(cv: StructuredCv): { score: number; evidence: string } {
  if (cv.experience.length === 0) {
    return { score: cv.internships.length ? 48 : 32, evidence: "Little or no work experience described." };
  }
  let score = 58 + Math.min(24, cv.experience.length * 6);
  if (hasQuantified(cv.experience)) score += 12;
  return { score: clamp(score), evidence: cv.experience[0] };
}

function scoreInternships(cv: StructuredCv): { score: number; evidence: string } {
  if (cv.internships.length === 0) return { score: 35, evidence: "No internships were detected." };
  let score = 70 + Math.min(20, cv.internships.length * 8);
  if (hasQuantified(cv.internships)) score += 8;
  return { score: clamp(score), evidence: cv.internships[0] };
}

function scoreProjects(cv: StructuredCv): { score: number; evidence: string } {
  if (cv.projects.length === 0) return { score: 34, evidence: "No projects section was detected." };
  let score = 60 + Math.min(20, cv.projects.length * 5);
  if (hasQuantified(cv.projects)) score += 14;
  else score -= 8;
  return { score: clamp(score), evidence: cv.projects[0] };
}

function scoreAchievements(cv: StructuredCv): { score: number; evidence: string } {
  if (cv.achievements.length === 0) return { score: 32, evidence: "Achievements are missing or not clearly listed." };
  let score = 64 + Math.min(16, cv.achievements.length * 5);
  if (hasQuantified(cv.achievements)) score += 14;
  return { score: clamp(score), evidence: cv.achievements[0] };
}

function scoreCertifications(cv: StructuredCv): { score: number; evidence: string } {
  if (cv.certifications.length === 0) return { score: 40, evidence: "No certifications were listed." };
  return {
    score: clamp(72 + Math.min(20, cv.certifications.length * 8)),
    evidence: cv.certifications[0],
  };
}

function scoreFormatting(cv: StructuredCv, text: string): { score: number; evidence: string } {
  let score = 50;
  const notes: string[] = [];
  if (cv.name) { score += 10; notes.push("name"); }
  if (cv.email) { score += 10; notes.push("email"); }
  if (cv.phone) { score += 6; notes.push("phone"); }
  if (cv.linkedinUrl || cv.githubUrl) { score += 8; notes.push("professional link"); }
  if (text.length > 400 && text.length < 9000) score += 10;
  if (cv.presentSections.length >= 5) score += 6;
  if (text.length < 250) score -= 20;
  return { score: clamp(score), evidence: notes.length ? `Clear ${notes.join(", ")}.` : "Contact block is incomplete." };
}

function scoreCompleteness(cv: StructuredCv): { score: number; evidence: string } {
  const expected: DimensionKey[] = [
    "education",
    "skills",
    "experience",
    "internships",
    "projects",
    "achievements",
    "certifications",
  ];
  const present = expected.filter((k) => {
    if (k === "education") return cv.education.length > 0;
    if (k === "skills") return cv.skills.length > 0;
    if (k === "experience") return cv.experience.length > 0;
    if (k === "internships") return cv.internships.length > 0;
    if (k === "projects") return cv.projects.length > 0;
    if (k === "achievements") return cv.achievements.length > 0;
    if (k === "certifications") return cv.certifications.length > 0;
    return false;
  });
  const score = clamp(20 + (present.length / expected.length) * 80);
  return { score, evidence: `${present.length} of ${expected.length} core student sections are present.` };
}

function recommendationsFor(cv: StructuredCv, dims: DimensionScore[]): Recommendation[] {
  const recs: Recommendation[] = [];
  const scoreOf = (key: DimensionKey) => dims.find((d) => d.key === key)?.score ?? 0;

  if (scoreOf("projects") < 70) {
    recs.push({
      priority: cv.projects.length === 0 ? "high" : "high",
      dimension: "projects",
      title: "Add measurable outcomes to your projects",
      detail: cv.projects.length
        ? "Your project bullets describe work but not impact. Add metrics (users, accuracy, time saved, scale)."
        : "Add 2–3 academic or personal projects with tools used and a measurable result.",
    });
  }
  if (scoreOf("achievements") < 65) {
    recs.push({
      priority: "high",
      dimension: "achievements",
      title: "Strengthen your achievements section",
      detail: "List awards, rankings, publications, or competitions. Quantify what you won or improved.",
    });
  }
  if (scoreOf("internships") < 60) {
    recs.push({
      priority: cv.internships.length ? "medium" : "high",
      dimension: "internships",
      title: "Add internship experience",
      detail: cv.internships.length
        ? "Expand internship bullets with responsibilities and outcomes."
        : "Include internships, training, or campus roles. If you have none yet, add relevant academic projects instead.",
    });
  }
  if (scoreOf("skills") < 70) {
    recs.push({
      priority: "medium",
      dimension: "skills",
      title: "Include relevant technical and transferable skills",
      detail: "Group skills (languages, tools, domain). Prefer skills you can demonstrate in projects.",
    });
  }
  if (scoreOf("certifications") < 55) {
    recs.push({
      priority: "optional",
      dimension: "certifications",
      title: "Add relevant certifications",
      detail: "One or two current certifications (cloud, analytics, language) can support your target roles.",
    });
  }
  if (!cv.summary) {
    recs.push({
      priority: "medium",
      dimension: "formatting",
      title: "Improve your professional summary",
      detail: "Add a 3–4 line profile stating degree, target role, and 1–2 proof points.",
    });
  }
  if (scoreOf("formatting") < 70) {
    recs.push({
      priority: "medium",
      dimension: "formatting",
      title: "Make contact details and structure easier to scan",
      detail: "Put name, email, phone, and LinkedIn at the top. Use clear section headings.",
    });
  }
  if (scoreOf("experience") < 55) {
    recs.push({
      priority: cv.internships.length ? "optional" : "medium",
      dimension: "experience",
      title: "Add work experience as it becomes available",
      detail: cv.internships.length
        ? "Internships are present. As you gain jobs or campus roles, add them with outcomes."
        : "Include part-time work, campus jobs, or freelance projects with measurable results.",
    });
  }
  if (!recs.length) {
    recs.push({
      priority: "optional",
      dimension: "completeness",
      title: "Keep refining with evidence",
      detail: "This CV already has a strong base. Add newer projects, numbers, and recent internships as they happen.",
    });
  }

  const order = { high: 0, medium: 1, optional: 2 };
  return recs.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 6);
}

export const heuristicEngine: AssessmentEngine = {
  name: "heuristic",
  async score({ structured, text, profile }) {
    const builders: Record<DimensionKey, () => { score: number; evidence: string }> = {
      education: () => scoreEducation(structured),
      skills: () => scoreSkills(structured),
      experience: () => scoreExperience(structured),
      internships: () => scoreInternships(structured),
      projects: () => scoreProjects(structured),
      achievements: () => scoreAchievements(structured),
      certifications: () => scoreCertifications(structured),
      formatting: () => scoreFormatting(structured, text),
      completeness: () => scoreCompleteness(structured),
    };

    const dimensions: DimensionScore[] = (Object.keys(profile.dimensions) as DimensionKey[]).map((key) => {
      const built = builders[key]();
      return {
        key,
        label: DIMENSION_LABELS[key],
        weight: profile.dimensions[key],
        score: built.score,
        status: statusFromScore(built.score),
        evidence: built.evidence,
      };
    });

    const weightSum = dimensions.reduce((s, d) => s + d.weight, 0) || 1;
    const overallScore = clamp(dimensions.reduce((s, d) => s + d.score * d.weight, 0) / weightSum);
    const recs = recommendationsFor(structured, dimensions);

    return {
      overallScore,
      summary: overallHeadline(overallScore),
      dimensions,
      recommendations: recs,
      engine: "heuristic",
    } satisfies EngineResult;
  },
};
