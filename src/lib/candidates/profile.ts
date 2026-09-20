import type { StructuredCv } from "../assessment/types";

export function normalizeCandidateEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase() || null;
  return normalized && normalized.includes("@") ? normalized : null;
}

export function mergeUniqueStringArrays(existing: string[], incoming: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const item of [...existing, ...incoming]) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(trimmed);
  }
  return merged;
}

function preferNonEmpty(existing: string | null | undefined, incoming: string | null | undefined): string | null {
  const next = incoming?.trim();
  if (next) return next;
  const current = existing?.trim();
  return current || null;
}

export function parseDegreeAndCollege(education: string[]): { degree: string | null; college: string | null } {
  const line = education[0]?.trim() ?? "";
  if (!line) return { degree: null, college: null };
  const parts = line.split(",").map((p) => p.trim()).filter(Boolean);
  const degree = parts[0] || null;
  const college =
    parts.find((p) => /\b(university|college|institute|iit|nit|bits|school)\b/i.test(p)) ??
    parts[1] ??
    null;
  return { degree, college };
}

export function companiesFromCv(structured: StructuredCv): string[] {
  const lines = [...structured.internships, ...structured.experience];
  const companies: string[] = [];
  for (const line of lines) {
    const at = line.match(/\bat\s+([^,|–—-]{2,60})/i);
    if (at?.[1]) {
      companies.push(at[1].trim());
      continue;
    }
    const first = line.split(/[,|–—-]/)[0]?.trim() ?? "";
    if (first && first.length < 60 && !/^(intern|internship|project)\b/i.test(first)) {
      companies.push(first);
    }
  }
  return mergeUniqueStringArrays([], companies).slice(0, 8);
}

export function profileFromStructured(structured: StructuredCv): {
  displayName: string;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  degree: string | null;
  college: string | null;
  profileSummary: string | null;
  skills: string[];
  companies: string[];
  yearsExperience: number;
} {
  const { degree, college } = parseDegreeAndCollege(structured.education);
  return {
    displayName: structured.name?.trim() || "Unknown",
    email: normalizeCandidateEmail(structured.email),
    phone: structured.phone?.trim() || null,
    linkedinUrl: structured.linkedinUrl,
    githubUrl: structured.githubUrl,
    degree,
    college,
    profileSummary: structured.summary?.trim() || null,
    skills: structured.skills.slice(0, 24),
    companies: companiesFromCv(structured),
    yearsExperience: structured.internships.length + structured.experience.length,
  };
}

export function mergeProfile<T extends {
  display_name: string;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  degree: string | null;
  college: string | null;
  profile_summary: string | null;
  skills: string[];
  companies: string[];
  goals: string[];
  years_experience: number;
}>(existing: T, incoming: ReturnType<typeof profileFromStructured> & { goalTitle?: string }): T {
  const nameMissing = !existing.display_name?.trim() || existing.display_name.trim() === "Unknown";
  return {
    ...existing,
    display_name: nameMissing && incoming.displayName !== "Unknown" ? incoming.displayName : existing.display_name,
    email: preferNonEmpty(existing.email, incoming.email),
    phone: preferNonEmpty(existing.phone, incoming.phone),
    linkedin_url: preferNonEmpty(existing.linkedin_url, incoming.linkedinUrl),
    github_url: preferNonEmpty(existing.github_url, incoming.githubUrl),
    degree: preferNonEmpty(existing.degree, incoming.degree),
    college: preferNonEmpty(existing.college, incoming.college),
    profile_summary: preferNonEmpty(existing.profile_summary, incoming.profileSummary),
    skills: mergeUniqueStringArrays(existing.skills, incoming.skills),
    companies: mergeUniqueStringArrays(existing.companies, incoming.companies),
    goals: incoming.goalTitle
      ? mergeUniqueStringArrays(existing.goals, [incoming.goalTitle])
      : existing.goals,
    years_experience: Math.max(existing.years_experience, incoming.yearsExperience),
  };
}
