import type { DimensionKey, StructuredCv } from "./types";

export const QUALITY_CHECK_KEYS = ["formatting", "english", "spacing", "readability", "ats"] as const;
export type QualityCheckKey = (typeof QUALITY_CHECK_KEYS)[number];

export type QualityCheckScore = { score: number; evidence: string };
export type QualityChecks = Record<QualityCheckKey, QualityCheckScore>;

export const QUALITY_CHECK_LABELS: Record<QualityCheckKey, string> = {
  formatting: "Formatting",
  english: "English",
  spacing: "Spacing",
  readability: "Readability",
  ats: "ATS checks",
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function linesOf(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trimEnd());
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function approxSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 1;
  const groups = w.match(/[aeiouy]+/g);
  let n = groups?.length ?? 1;
  if (w.endsWith("e") && n > 1) n -= 1;
  return Math.max(1, n);
}

export function scoreQualityChecks(cv: StructuredCv, text: string): QualityChecks {
  return {
    formatting: scoreFormatting(cv, text),
    english: scoreEnglish(text, cv),
    spacing: scoreSpacing(text),
    readability: scoreReadability(text),
    ats: scoreAts(cv, text),
  };
}

export function scoreFormatting(cv: StructuredCv, text: string): QualityCheckScore {
  let score = 48;
  const notes: string[] = [];
  if (cv.name) { score += 10; notes.push("name"); }
  if (cv.email) { score += 10; notes.push("email"); }
  if (cv.phone) { score += 6; notes.push("phone"); }
  if (cv.linkedinUrl || cv.githubUrl) { score += 6; notes.push("link"); }
  if (cv.presentSections.length >= 5) { score += 8; notes.push("clear headings"); }
  if (text.length > 400 && text.length < 9000) score += 8;
  if (text.length < 250) score -= 18;
  const headingLike = (text.match(/^(education|skills|projects|experience|internship)/gim) ?? []).length;
  if (headingLike >= 3) score += 4;
  return {
    score: clamp(score),
    evidence: notes.length ? `Structure includes ${notes.join(", ")}.` : "Contact block or section headings are incomplete.",
  };
}

export function scoreEnglish(text: string, cv: StructuredCv): QualityCheckScore {
  let score = 76;
  const notes: string[] = [];
  const typos = text.match(
    /\b(teh|recieve|occured|seperate|definately|enviroment|managment|experiance|acheivement|untill|wich|becuase|adress|langauge)\b/gi,
  );
  if (typos?.length) {
    score -= Math.min(18, typos.length * 6);
    notes.push(`${typos.length} likely spelling issue${typos.length === 1 ? "" : "s"}`);
  }
  if (/\b(u r|pls|plz|thx|gonna|wanna|kinda|idk)\b/i.test(text)) {
    score -= 10;
    notes.push("informal wording");
  }
  if (/\b(\w+)\s+\1\b/i.test(text)) {
    score -= 6;
    notes.push("repeated words");
  }
  const lines = linesOf(text).filter((l) => l.trim().length > 8);
  const shouting = lines.filter((l) => l === l.toUpperCase() && /[A-Z]/.test(l)).length;
  if (lines.length && shouting / lines.length > 0.12) {
    score -= 10;
    notes.push("too much ALL CAPS");
  }
  if (cv.summary && cv.summary.length > 40) score += 6;
  if (!/[.!?]/g.test(text) && wordCount(text) > 80) {
    score -= 8;
    notes.push("almost no sentence punctuation");
  }
  return {
    score: clamp(score),
    evidence: notes.length ? `English issues: ${notes.join("; ")}.` : "Language looks professional, with few obvious errors.",
  };
}

export function scoreSpacing(text: string): QualityCheckScore {
  let score = 82;
  const notes: string[] = [];
  if (/\n{4,}/.test(text)) {
    score -= 14;
    notes.push("large empty gaps");
  }
  if (/[^\n]{240,}/.test(text)) {
    score -= 12;
    notes.push("overlong unbroken lines");
  }
  const doubleSpaces = text.match(/ {3,}/g)?.length ?? 0;
  if (doubleSpaces > 10) {
    score -= 8;
    notes.push("uneven spaces");
  }
  const newlineRatio = (text.match(/\n/g)?.length ?? 0) / Math.max(text.length, 1);
  if (newlineRatio < 0.008) {
    score -= 16;
    notes.push("text looks cramped");
  } else if (newlineRatio > 0.14) {
    score -= 8;
    notes.push("too much vertical space");
  }
  if (!notes.length) notes.push("Line breaks look consistent");
  return { score: clamp(score), evidence: notes.join("; ") + "." };
}

export function scoreReadability(text: string): QualityCheckScore {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 3);
  const nWords = words.length;
  const nSent = Math.max(sentences.length, 1);
  const avg = nWords / nSent;
  const syllables = words.reduce((s, w) => s + approxSyllables(w), 0);
  const flesch = 206.835 - 1.015 * avg - 84.6 * (syllables / Math.max(nWords, 1));

  let score = 70;
  const notes: string[] = [];
  if (nWords < 140) {
    score -= 18;
    notes.push("too little content to scan");
  } else if (nWords > 1400) {
    score -= 10;
    notes.push("longer than a typical 1-page student CV");
  } else {
    score += 8;
  }
  if (avg > 28) {
    score -= 14;
    notes.push("sentences are too long");
  } else if (avg >= 8 && avg <= 22) {
    score += 10;
    notes.push("sentence length is easy to scan");
  }
  if (flesch >= 50) score += 6;
  else if (flesch < 30) {
    score -= 8;
    notes.push("wording is dense");
  }
  const shortBullets = linesOf(text).filter((l) => l.length > 12 && l.length < 140).length;
  if (shortBullets >= 8) score += 6;
  return {
    score: clamp(score),
    evidence: notes[0] ? `${notes[0][0].toUpperCase()}${notes[0].slice(1)}. ~${nWords} words.` : `Readable layout, about ${nWords} words.`,
  };
}

export function scoreAts(cv: StructuredCv, text: string): QualityCheckScore {
  let score = 38;
  const notes: string[] = [];
  if (cv.name) { score += 12; notes.push("name"); }
  if (cv.email) { score += 14; notes.push("email"); }
  if (cv.phone) { score += 8; notes.push("phone"); }
  const headings = ["education", "skills", "experience", "projects", "internship"].filter((h) =>
    new RegExp(`\\b${h}`, "i").test(text),
  );
  if (headings.length >= 3) { score += 12; notes.push("standard headings"); }
  if (/\b20\d{2}\b/.test(text)) { score += 8; notes.push("dates"); }
  if (cv.skills.length >= 4) { score += 8; notes.push("keyword skills"); }
  if (text.replace(/\s+/g, "").length < 200) {
    score -= 22;
    notes.push("little extractable text (possible image/scanned CV)");
  }
  if ((text.match(/\|/g) ?? []).length > 18) {
    score -= 10;
    notes.push("table/column characters that parsers often skip");
  }
  const tinyLines = linesOf(text).filter((l) => l.trim().length > 0 && l.trim().length <= 2).length;
  if (tinyLines > 25) {
    score -= 8;
    notes.push("fragmented columns");
  }
  return {
    score: clamp(score),
    evidence: notes.length
      ? `ATS signals: ${notes.join("; ")}.`
      : "Add a parseable name, email, and standard headings for ATS systems.",
  };
}

export function qualityAverage(checks: QualityChecks): number {
  const total = QUALITY_CHECK_KEYS.reduce((sum, key) => sum + checks[key].score, 0);
  return Math.round(total / QUALITY_CHECK_KEYS.length);
}

export function recommendationsForQuality(checks: QualityChecks): Array<{
  priority: "high" | "medium" | "optional";
  title: string;
  detail: string;
  dimension: QualityCheckKey;
}> {
  const recs: Array<{
    priority: "high" | "medium" | "optional";
    title: string;
    detail: string;
    dimension: QualityCheckKey;
  }> = [];
  if (checks.ats.score < 70) {
    recs.push({
      priority: checks.ats.score < 50 ? "high" : "medium",
      dimension: "ats",
      title: "Make the CV easier for ATS parsers to read",
      detail: "Use a single-column layout, standard headings (Education, Skills, Projects), and a plain-text email and phone at the top. Avoid tables, text boxes, and scanned images.",
    });
  }
  if (checks.english.score < 70) {
    recs.push({
      priority: checks.english.score < 50 ? "high" : "medium",
      dimension: "english",
      title: "Tighten English and professional wording",
      detail: "Fix spelling, drop informal phrases, and keep bullets in consistent past or present tense. Read the CV out loud once before submitting.",
    });
  }
  if (checks.readability.score < 70) {
    recs.push({
      priority: "medium",
      dimension: "readability",
      title: "Improve scanability",
      detail: "Keep bullets to one or two lines, lead with a verb, and stay close to one page. Dense paragraphs are harder for recruiters and parsers to scan.",
    });
  }
  if (checks.spacing.score < 70) {
    recs.push({
      priority: "medium",
      dimension: "spacing",
      title: "Balance spacing and alignment",
      detail: "Use consistent margins and a single blank line between sections. Remove large empty gaps and cramped lines that wrap awkwardly.",
    });
  }
  if (checks.formatting.score < 70) {
    recs.push({
      priority: "medium",
      dimension: "formatting",
      title: "Standardize the header and section headings",
      detail: "Put name, email, phone, and LinkedIn on the first lines. Use the same heading style for Education, Skills, Projects, and Internships.",
    });
  }
  return recs;
}

export function qualityChecksFromDimensions(
  dimensions: Array<{ key: string; score: number; evidence: string }>,
  fallback?: QualityChecks,
): QualityChecks {
  const pick = (key: QualityCheckKey): QualityCheckScore => {
    const found = dimensions.find((d) => d.key === key);
    if (found) return { score: found.score, evidence: found.evidence };
    return fallback?.[key] ?? { score: 0, evidence: "" };
  };
  return {
    formatting: pick("formatting"),
    english: pick("english"),
    spacing: pick("spacing"),
    readability: pick("readability"),
    ats: pick("ats"),
  };
}

export function isQualityCheckKey(key: string): key is QualityCheckKey {
  return (QUALITY_CHECK_KEYS as readonly string[]).includes(key);
}

export function isContentDimension(key: DimensionKey): boolean {
  return !isQualityCheckKey(key);
}
