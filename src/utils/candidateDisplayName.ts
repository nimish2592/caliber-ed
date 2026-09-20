const PLACEHOLDER_NAMES = new Set(["unknown", "candidate", "unknown candidate", "there"]);

function isPlaceholderCandidateName(name: string): boolean {
  return PLACEHOLDER_NAMES.has(name.trim().toLowerCase());
}

/** Title-case a person name while preserving hyphenated parts. */
export function formatPersonName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";

  return trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((word) =>
      word
        .split("-")
        .map((part) => {
          if (!part) return part;
          if (/^mc[a-z]/i.test(part)) {
            return `Mc${part.slice(2, 3).toUpperCase()}${part.slice(3).toLowerCase()}`;
          }
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join("-"),
    )
    .join(" ");
}

export function normalizeNameToken(value: string): string {
  return value.toLowerCase().replace(/[\s._+-]/g, "");
}

export function nameLooksLikeEmailLocalPart(name: string, email: string | null | undefined): boolean {
  if (!email?.includes("@")) return false;
  const local = normalizeNameToken(email.split("@")[0] ?? "");
  const normalized = normalizeNameToken(name);
  if (!normalized || !local) return false;
  return normalized === local;
}

/** Detect handles like grv4697, user123, or other email-derived tokens. */
export function looksLikeEmailUsername(name: string, email?: string | null): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (email && nameLooksLikeEmailLocalPart(trimmed, email)) return true;

  const compact = trimmed.replace(/\s/g, "");
  if (!compact.includes(" ") && /\d/.test(compact)) return true;
  if (/[a-zA-Z]+\d{2,}|\d+[a-zA-Z]{2,}/.test(compact)) return true;

  return false;
}

export function isUsableStoredCandidateName(name: string, email?: string | null): boolean {
  if (!name.trim() || isPlaceholderCandidateName(name)) return false;
  return !looksLikeEmailUsername(name, email);
}

/** Pick the best stored name from resume / directory fields (never from email). */
export function pickBestStoredCandidateName(
  resumeName: string | null | undefined,
  directoryName: string | null | undefined,
  email?: string | null,
): string {
  for (const candidate of [resumeName, directoryName]) {
    const trimmed = candidate?.trim();
    if (trimmed && isUsableStoredCandidateName(trimmed, email)) {
      return formatPersonName(trimmed);
    }
  }

  const fallback = resumeName?.trim() || directoryName?.trim();
  return fallback ? formatPersonName(fallback) : "";
}

function looksLikePersonNameLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;
  if (trimmed.includes("@")) return false;
  if (/^(resume|curriculum|cv)$/i.test(trimmed)) return false;
  if (/^(phone|email|mobile|contact)\b/i.test(trimmed)) return false;
  if (/^(\+?\d[\d\s().-]{6,}|https?:|www\.)/i.test(trimmed)) return false;
  if ((trimmed.match(/\d/g) || []).length > 2) return false;

  const letters = (trimmed.match(/[a-zA-Z]/g) || []).length;
  return letters >= 3 && letters >= trimmed.length * 0.5;
}

/** Best-effort name extraction from resume header / contact block. */
export function extractCandidateNameFromResumeText(text: string): string | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 1 && line.length < 80);

  const emailIdx = lines.findIndex((line) => /@/.test(line) && /\.[a-z]{2,}/i.test(line));
  if (emailIdx > 0) {
    const previous = lines[emailIdx - 1];
    if (previous && looksLikePersonNameLine(previous)) {
      return formatPersonName(previous);
    }
  }

  const first = lines[0];
  if (first && looksLikePersonNameLine(first)) {
    return formatPersonName(first);
  }

  return null;
}

/** Resolve a professional candidate name for outreach copy. Never derives from email. */
export function resolveOutreachCandidateName(params: {
  name?: string | null;
  fallbackNames?: (string | null | undefined)[];
  email?: string | null;
  resumeText?: string | null;
}): string {
  const email = params.email?.trim() || null;
  const candidates = [params.name, ...(params.fallbackNames ?? [])]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];

  for (const rawName of candidates) {
    if (isUsableStoredCandidateName(rawName, email)) {
      return formatPersonName(rawName);
    }
  }

  const fromResume = params.resumeText?.trim()
    ? extractCandidateNameFromResumeText(params.resumeText)
    : null;
  if (fromResume && isUsableStoredCandidateName(fromResume, email)) {
    return fromResume;
  }

  return "there";
}

export function outreachFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed || trimmed === "there") return "there";
  return trimmed.split(/\s+/)[0] ?? trimmed;
}
