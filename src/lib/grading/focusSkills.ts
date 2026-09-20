import type { StructuredCv } from "../assessment/types";

const SKILL_ALIASES: Record<string, string[]> = {
  javascript: ["js", "java script", "ecmascript"],
  typescript: ["ts"],
  python: ["py", "python3"],
  "node.js": ["node", "nodejs", "node js"],
  "react.js": ["react", "reactjs", "react js"],
  react: ["react.js", "reactjs", "react js"],
  "next.js": ["nextjs", "next js"],
  "vue.js": ["vue", "vuejs"],
  "c++": ["cpp", "c plus plus"],
  "c#": ["csharp", "c sharp"],
  postgresql: ["postgres", "psql"],
  kubernetes: ["k8s"],
  aws: ["amazon web services"],
  gcp: ["google cloud", "google cloud platform"],
  "machine learning": ["ml", "machine-learning"],
  "data analysis": ["data analytics", "analytics"],
  excel: ["microsoft excel", "ms excel"],
};

type FocusEvidence = {
  matched: boolean;
  reason: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function asTokenPattern(term: string): RegExp {
  const body = escapeRegExp(term.trim()).replace(/\s+/g, "[\\s\\-_]*").replace(/\\\+/g, "\\+");
  return new RegExp(`(?:^|[^A-Za-z0-9+])${body}(?:[^A-Za-z0-9+]|$)`, "i");
}

function textHasTerm(text: string, term: string): boolean {
  if (!term.trim()) return false;
  return asTokenPattern(term).test(text);
}

function specificSkillPresent(skill: string, haystack: string): boolean {
  const key = skill.trim().toLowerCase();
  if (textHasTerm(haystack, skill)) return true;
  for (const alias of SKILL_ALIASES[key] ?? []) {
    if (textHasTerm(haystack, alias)) return true;
  }
  for (const [canonical, aliases] of Object.entries(SKILL_ALIASES)) {
    if (aliases.includes(key) && (textHasTerm(haystack, canonical) || aliases.some((a) => textHasTerm(haystack, a)))) {
      return true;
    }
  }
  return false;
}

function genericFocusEvidence(skill: string, cv: StructuredCv, text: string): FocusEvidence | null {
  const key = skill.trim().toLowerCase();
  if (key === "projects" || key === "project") {
    const ok = cv.projects.length > 0;
    return { matched: ok, reason: ok ? `${cv.projects.length} project${cv.projects.length === 1 ? "" : "s"} listed` : "No projects section" };
  }
  if (key === "internships" || key === "internship") {
    const ok = cv.internships.length > 0;
    return { matched: ok, reason: ok ? `${cv.internships.length} internship${cv.internships.length === 1 ? "" : "s"} listed` : "No internships detected" };
  }
  if (key === "technical skills" || key === "tech skills" || key === "technical skill") {
    const ok = cv.skills.length >= 3;
    return { matched: ok, reason: ok ? `${cv.skills.length} skills listed` : "Too few technical skills listed" };
  }
  if (key === "communication" || key === "communication skills") {
    const ok = Boolean(cv.summary) || /communicat|present|stakeholder|wrote|writing|debate|public speaking|leadership/i.test(text);
    return { matched: ok, reason: ok ? "Communication evidence on the CV" : "Little communication evidence" };
  }
  if (key === "problem solving" || key === "problem-solving") {
    const ok = cv.projects.length > 0 || /problem|optimiz|debugg|analys|designed|architect|reduced|improved/i.test(text);
    return { matched: ok, reason: ok ? "Problem-solving evidence in projects or outcomes" : "No clear problem-solving evidence" };
  }
  if (key === "education") {
    const ok = cv.education.length > 0;
    return { matched: ok, reason: ok ? "Education section present" : "Education missing" };
  }
  return null;
}

export function matchGoalFocusSkills(params: {
  focusSkills: string[];
  structured: StructuredCv;
  text: string;
}): { matched: string[]; missing: string[] } {
  const haystack = [
    params.text,
    params.structured.skills.join(" "),
    params.structured.projects.join(" "),
    params.structured.experience.join(" "),
    params.structured.internships.join(" "),
  ].join("\n");

  const matched: string[] = [];
  const missing: string[] = [];
  for (const skill of params.focusSkills.map((s) => s.trim()).filter(Boolean)) {
    const generic = genericFocusEvidence(skill, params.structured, params.text);
    const hit = generic ? generic.matched : specificSkillPresent(skill, haystack);
    if (hit) matched.push(skill);
    else missing.push(skill);
  }
  return { matched, missing };
}

export function focusSkillCoverage(matched: number, total: number): number {
  if (total <= 0) return 100;
  return Math.round((matched / total) * 100);
}
