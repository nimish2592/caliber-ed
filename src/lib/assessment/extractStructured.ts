import type { DimensionKey, StructuredCv } from "./types";

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[\s\-]?)?(?:\(?\d{2,4}\)?[\s\-]?)?\d{3,5}[\s\-]?\d{4,6}/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9_\-%.]+)/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_\-]+)/i;
const URL_RE = /https?:\/\/[^\s)]+/gi;

const SECTION_DEFS: Array<{ key: DimensionKey | "summary" | "extracurricular"; pattern: RegExp }> = [
  { key: "summary", pattern: /^(summary|professional summary|profile|objective|career objective|about me|overview)$/i },
  { key: "education", pattern: /^(education|academic|academics|qualification|qualifications|scholastic)$/i },
  { key: "experience", pattern: /^(experience|work experience|employment|work history|professional experience|career history)$/i },
  { key: "internships", pattern: /^(internship|internships|industrial training|training)$/i },
  { key: "skills", pattern: /^(skills|technical skills|core skills|key skills|competencies|technologies)$/i },
  { key: "projects", pattern: /^(projects?|academic projects?|personal projects?)$/i },
  { key: "achievements", pattern: /^(achievements?|awards?|honou?rs?|accomplishments?)$/i },
  { key: "certifications", pattern: /^(certifications?|certificates?|licenses?)$/i },
  { key: "extracurricular", pattern: /^(extracurricular|activities|leadership|volunteer|volunteering|positions of responsibility)$/i },
];

function normalizeText(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n").replace(/[ \t]{3,}/g, "  ");
  const headers =
    /(SUMMARY|PROFESSIONAL SUMMARY|PROFILE|OBJECTIVE|EDUCATION|ACADEMIC|SKILLS|TECHNICAL SKILLS|EXPERIENCE|WORK EXPERIENCE|INTERNSHIP|INTERNSHIPS|PROJECTS|PROJECT|ACHIEVEMENTS|ACHIEVEMENT|CERTIFICATIONS|CERTIFICATION|EXTRACURRICULAR|ACTIVITIES)/g;
  text = text.replace(new RegExp(`\\s+(${headers.source})\\s+`, "g"), "\n$1\n");
  return text.trim();
}

function looksLikeName(line: string): boolean {
  if (!line || line.length > 60 || /@/.test(line) || /\d{5,}/.test(line)) return false;
  if (/^(curriculum vitae|resume|cv)$/i.test(line)) return false;
  const words = line.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 5 && words.every((w) => /^[A-Za-z][A-Za-z.'\-]*$/.test(w));
}

function extractEmail(text: string): string | null {
  const matches = text.match(EMAIL_RE) ?? [];
  for (const match of matches) {
    const email = match.toLowerCase();
    if (!/example|youremail|yourname/.test(email)) return email;
  }
  return null;
}

function splitSections(text: string): Record<string, string> {
  const lines = normalizeText(text).split("\n").map((l) => l.trim());
  const sections: Record<string, string[]> = { header: [] };
  let current = "header";

  for (const line of lines) {
    const compact = line.replace(/[:.]$/, "").trim();
    const def = SECTION_DEFS.find((item) => item.pattern.test(compact) && compact.length < 48);
    if (def) {
      current = def.key;
      sections[current] ??= [];
      continue;
    }
    sections[current] ??= [];
    if (line) sections[current].push(line);
  }

  return Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, v.join("\n")]));
}

function bullets(block: string): string[] {
  return block
    .split("\n")
    .map((l) => l.replace(/^[\s•\-–*]+/, "").trim())
    .filter((l) => l.length > 8)
    .slice(0, 12);
}

function skillsFrom(text: string): string[] {
  const known = [
    "Python", "Java", "JavaScript", "TypeScript", "React", "Node.js", "SQL", "Excel",
    "Power BI", "Tableau", "AWS", "Azure", "Git", "Figma", "C++", "HTML", "CSS",
    "Machine Learning", "Data Analysis", "Communication", "Leadership",
  ];
  const found: string[] = [];
  for (const skill of known) {
    const re = new RegExp(`(?<![A-Za-z])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z])`, "i");
    if (re.test(text) && !found.includes(skill)) found.push(skill);
  }
  return found.slice(0, 20);
}

export function extractStructuredCv(text: string): StructuredCv {
  const sections = splitSections(text);
  const header = sections.header ?? text.slice(0, 800);
  const headerLines = header.split("\n").map((l) => l.trim()).filter(Boolean);

  const name = headerLines.find(looksLikeName) ?? null;
  const linkedin = text.match(LINKEDIN_RE);
  const github = text.match(GITHUB_RE);
  const otherLinks = [...text.matchAll(URL_RE)]
    .map((m) => m[0])
    .filter((u) => !/linkedin\.com|github\.com/i.test(u))
    .slice(0, 6);

  const internships = bullets(sections.internships ?? "");
  const experienceBlock = sections.experience ?? "";
  const internFromExperience = experienceBlock
    .split("\n")
    .filter((l) => /intern/i.test(l))
    .map((l) => l.replace(/^[\s•\-–*]+/, "").trim())
    .filter(Boolean);

  const presentSections: DimensionKey[] = [];
  const maybeAdd = (key: DimensionKey, content: string) => {
    if (content.trim().length > 12) presentSections.push(key);
  };
  maybeAdd("education", sections.education ?? "");
  maybeAdd("skills", sections.skills ?? "");
  maybeAdd("experience", experienceBlock);
  if (internships.length || internFromExperience.length) presentSections.push("internships");
  maybeAdd("projects", sections.projects ?? "");
  maybeAdd("achievements", sections.achievements ?? "");
  maybeAdd("certifications", sections.certifications ?? "");
  maybeAdd("formatting", header);
  maybeAdd("completeness", text);

  const skillList = [
    ...skillsFrom(sections.skills || text),
    ...(sections.skills ?? "")
      .split(/[,•|\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 32),
  ];
  const uniqueSkills = [...new Set(skillList)].slice(0, 24);

  return {
    name,
    email: extractEmail(text),
    phone: header.match(PHONE_RE)?.[0] ?? null,
    summary: (sections.summary ?? "").slice(0, 400) || null,
    linkedinUrl: linkedin ? `https://linkedin.com/in/${linkedin[1]}` : null,
    githubUrl: github ? `https://github.com/${github[1]}` : null,
    otherLinks,
    education: bullets(sections.education ?? ""),
    experience: bullets(experienceBlock).filter((l) => !/intern/i.test(l)),
    internships: [...internships, ...internFromExperience].slice(0, 10),
    skills: uniqueSkills,
    projects: bullets(sections.projects ?? ""),
    achievements: bullets(sections.achievements ?? ""),
    certifications: bullets(sections.certifications ?? ""),
    extracurricular: bullets(sections.extracurricular ?? ""),
    presentSections: [...new Set(presentSections)],
  };
}
