/**
 * Extract structured metadata from plain resume text.
 * All functions are synchronous, regex/heuristic-based.
 */

export interface ResumeMetadata {
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  companies: string[];
  skills: string[];          // technical skills extracted from the skills section
  degree: string | null;    // e.g. "B.Tech in Computer Science"
  college: string | null;   // institution name only — validated against AISHE
  profileSummary: string | null;
}

// ── Text normalisation ────────────────────────────────────────────────────────
//
// PDFs often parse into flowing text where section headers appear as
//   "…prev content  SECTION HEADER  next content…"
// with no real newlines — only 2+ spaces acting as separators.
// We insert real newlines before each detectable section header so that the
// rest of the parser can work line-by-line.

const INLINE_SECTION_HEADERS =
  /(WORK\s+EXPERIENCE|WORK\s+HISTORY|EMPLOYMENT(?:\s+HISTORY)?|PROFESSIONAL\s+EXPERIENCE|CAREER\s+(?:HISTORY|SUMMARY)|EXPERIENCE|INTERNSHIP(?:S)?|EDUCATION(?:AL(?:\s+BACKGROUND|\s+QUALIFICATIONS?)?)?|ACADEMICS?(?:\s+BACKGROUND)?|QUALIFICATION(?:S)?|TECHNICAL\s+SKILLS?|CORE\s+(?:SKILLS?|COMPETENCIES)|KEY\s+SKILLS?|SKILLS?|PROJECT(?:S)?(?:\s+EXPERIENCE)?|CERTIFICATION(?:S)?|ACHIEVEMENT(?:S)?|PROFESSIONAL\s+(?:SUMMARY|PROFILE)|EXECUTIVE\s+SUMMARY|SUMMARY|PROFILE|ABOUT\s*ME|CAREER\s+OBJECTIVE|OBJECTIVE|OVERVIEW|REFERENCE(?:S)?|LANGUAGE(?:S)?|PUBLICATION(?:S)?|AWARD(?:S)?|INTEREST(?:S)?|HOBBIES)/g;

function normalizeResumeText(raw: string): string {
  // 1. Collapse Windows line endings
  let text = raw.replace(/\r\n/g, "\n");

  // 2. For each ALL-CAPS (or title-case) section header that is preceded by
  //    2+ spaces (i.e. it's "inline"), insert a double newline before it.
  //    The header must also be followed by 2+ spaces or a newline.
  text = text.replace(
    new RegExp(`[ \\t]{2,}(${INLINE_SECTION_HEADERS.source})(?=[ \\t]{2,}|\\n)`, "g"),
    "\n\n$1\n"
  );

  // 3. Also handle ALL-CAPS headers sitting at the start of a line but
  //    immediately followed by inline content with only spaces separating them.
  //    e.g. "WORK EXPERIENCE  Associate Consultant | …"
  text = text.replace(
    new RegExp(`^(${INLINE_SECTION_HEADERS.source})[ \\t]{2,}`, "gm"),
    "$1\n"
  );

  // 4. Collapse runs of 3+ spaces to a single space (residual from PDF columns)
  text = text.replace(/[ \t]{3,}/g, "  ");

  return text;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const YEAR_RE   = /\b(19|20)\d{2}\b/;
const DATE_WORD = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|present|current|till\s*date|to\s*date)\b/i;

function hasDate(s: string) {
  return YEAR_RE.test(s) || DATE_WORD.test(s);
}

function cleanToken(s: string) {
  return s.replace(/^[\s,|•·–\-]+|[\s,|•·–\-]+$/g, "").trim();
}

// ── Phone ─────────────────────────────────────────────────────────────────────

const PHONE_PATTERNS = [
  /(?:\+91[\s\-]?)?[6-9]\d{9}\b/,
  /\+\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,5}[\s\-]?\d{4,6}/,
  /\(?\d{3}\)?[\s\-]\d{3}[\s\-]\d{4}/,
];

export function extractPhoneFromResumeText(text: string): string | null {
  const lines = text.split("\n").slice(0, 50);
  for (const line of lines) {
    for (const re of PHONE_PATTERNS) {
      const m = line.match(re);
      if (m) {
        const cleaned = m[0].replace(/\s+/g, " ").trim();
        if (cleaned.replace(/\D/g, "").length >= 8) return cleaned;
      }
    }
  }
  return null;
}

// ── LinkedIn / GitHub ─────────────────────────────────────────────────────────

const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9_\-%.]+)\/?/i;
const GITHUB_RE   = /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9_\-]+)\/?/i;

export function extractLinkedInFromResumeText(text: string): string | null {
  const m = text.match(LINKEDIN_RE);
  if (!m) return null;
  return `https://linkedin.com/in/${m[1]}`;
}

export function extractGitHubFromResumeText(text: string): string | null {
  const m = text.match(GITHUB_RE);
  if (!m) return null;
  const u = m[1];
  if (!u || u.toLowerCase() === "github") return null;
  return `https://github.com/${u}`;
}

// ── Profile summary ───────────────────────────────────────────────────────────

const SUMMARY_HEADERS =
  /^(summary|professional\s+summary|profile|about\s*me|objective|career\s+objective|overview|about|executive\s+summary|professional\s+profile|career\s+summary)/i;

export function extractProfileSummaryFromResumeText(text: string): string | null {
  const lines = normalizeResumeText(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  for (let i = 0; i < Math.min(lines.length, 80); i++) {
    if (SUMMARY_HEADERS.test(lines[i]) && lines[i].length < 60) {
      const body: string[] = [];
      for (let j = i + 1; j < Math.min(lines.length, i + 15); j++) {
        const l = lines[j];
        if (/^(skills|education|experience|work|employment|project|certif|language|technical)/i.test(l) && l.length < 60) break;
        body.push(l);
        if (body.join(" ").length > 280) break;
      }
      const summary = body.join(" ").trim().slice(0, 300);
      if (summary.length > 30) return summary;
    }
  }
  return null;
}

// ── Companies ─────────────────────────────────────────────────────────────────

const EXP_HEADERS =
  /^(experience|work\s+experience|employment(?:\s+history)?|work\s+history|professional\s+experience|career\s+history|internship(?:s)?|positions?\s+held)/i;

const EXP_SECTION_END =
  /^(education|academic|qualification|skills|technical\s+skills|core\s+competencies|key\s+skills|projects?|certif|language|publication|award|interest|reference|achievement|volunteer|extra.?curricular|hobbies)/i;

const COMPANY_SUFFIXES =
  /\b(pvt\.?\s*ltd|pvt|ltd|llc|inc\.?|corp\.?|technologies|solutions|systems|consulting|consultancy|services|software|labs?|studio|ventures|group|india|global|digital|tech|innovations|infotech|enterprises|associates|partners|co\.?|gmbh|plc|foundation|holdings|limited)\b/i;

const JOB_TITLE_WORDS =
  /\b(engineer|developer|designer|manager|lead|senior|junior|associate(?!\s+at)|analyst|architect|director|vp|president|intern|officer|executive|head|principal|staff|full.?stack|front.?end|back.?end|data\s+scientist|devops|scrum|agile|product\s+(?:manager|lead|owner)|program\s+manager|technical\s+lead|software\s+(?:engineer|developer)|hardware|qa|tester)\b/i;

/**
 * City / location names that appear as standalone lines in resumes
 * (e.g. after the company name) and must never be treated as companies.
 */
const LOCATION_BLOCKLIST = new Set([
  // India metros & Tier 1
  "mumbai","delhi","bengaluru","bangalore","hyderabad","chennai","kolkata",
  "pune","ahmedabad","surat","jaipur","lucknow",
  // NCR
  "gurugram","gurgaon","noida","faridabad","ghaziabad","newdelhi","new delhi",
  // Tier 2
  "chandigarh","indore","bhopal","nagpur","visakhapatnam","patna",
  "vadodara","ludhiana","agra","nashik","meerut","rajkot",
  "varanasi","srinagar","aurangabad","ranchi","allahabad","prayagraj",
  "coimbatore","vijayawada","madurai","raipur","kochi","bhubaneswar",
  "thiruvananthapuram","guwahati","dehradun","mysuru","mysore","jabalpur",
  "jodhpur","tiruchirappalli","mangaluru","mangalore","kolhapur","solapur",
  "kota","bikaner","ajmer","udaipur","jamshedpur","siliguri","asansol",
  "warangal","guntur","nellore","tirupati","pondicherry","puducherry","salem",
  "erode","thrissur","kozhikode","calicut","shimla","jammu","panaji",
  "navi mumbai","thane","secunderabad",
  // Common abroad
  "remote","bangalore karnataka","pune maharashtra",
]);

function isJobTitle(s: string): boolean {
  return JOB_TITLE_WORDS.test(s) && !COMPANY_SUFFIXES.test(s);
}

function isLikelyCompany(segment: string): boolean {
  const s = segment.trim();
  if (!s || s.length < 2 || s.length > 100) return false;
  if (hasDate(s)) return false;
  if (/^\d/.test(s)) return false;
  // Must start with an uppercase letter — this filters out sentence fragments
  // like "and high-availability systems." even when they contain company-suffix words
  if (!/^[A-Z]/.test(s)) return false;
  if (isJobTitle(s)) return false;
  // Has explicit company suffix, OR is a short proper-noun phrase (≤5 capitalised words)
  const words = s.split(/\s+/);
  const capWords = words.filter((w) => /^[A-Z]/.test(w)).length;
  return COMPANY_SUFFIXES.test(s) || (capWords >= Math.ceil(words.length * 0.5) && words.length <= 5);
}

function extractCompanyFromInlineLine(line: string): string | null {
  // "Title at Company" pattern
  const atMatch = line.match(/\bat\s+([A-Z][^\n,|–\-()]{2,60})/);
  if (atMatch) {
    const co = cleanToken(atMatch[1]);
    if (isLikelyCompany(co)) return co;
  }

  // Split by common separators
  const SEPS = /[|,–•·]/;
  if (SEPS.test(line)) {
    const segments = line.split(SEPS).map(cleanToken).filter(Boolean);
    // First pass: find a clearly non-date, non-title segment
    for (const seg of segments) {
      if (!hasDate(seg) && isLikelyCompany(seg) && !isJobTitle(seg)) return seg;
    }
    // Second pass: relax — any segment with a company suffix that starts uppercase
    for (const seg of segments) {
      if (!hasDate(seg) && COMPANY_SUFFIXES.test(seg) && /^[A-Z]/.test(seg)) return cleanToken(seg);
    }
  }
  return null;
}

export function extractCompaniesFromResumeText(text: string): string[] {
  const normalized = normalizeResumeText(text);
  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);
  const companies: string[] = [];

  const addCompany = (name: string) => {
    const n = cleanToken(name);
    const lower = n.toLowerCase();
    if (
      n && n.length > 1 && n.length < 80 &&
      !isJobTitle(n) &&                                             // never add a job title
      !/^(software|tech|digital|global|india|remote)$/i.test(n) && // never add a bare generic word
      !LOCATION_BLOCKLIST.has(lower) &&                             // never add a city/location name
      // Reject single-word entries that look like city names (end in common Indian city suffixes)
      !/\b(nagar|puram|abad|pura|pur|ganj|wadi|wada|garh|khand|palli)\b/i.test(n) &&
      !companies.find((c) => c.toLowerCase() === lower) &&
      companies.length < 10
    ) {
      companies.push(n);
    }
  };

  let inExpSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (EXP_HEADERS.test(line) && line.length < 70) { inExpSection = true; continue; }
    if (inExpSection && EXP_SECTION_END.test(line) && line.length < 70) { inExpSection = false; continue; }
    if (!inExpSection) continue;

    // Skip plain bullet points
    if (/^[•·*>#]+\s/.test(line) && !COMPANY_SUFFIXES.test(line)) continue;

    // Case 1: inline separators → parse segments
    if (/[|,–•·]/.test(line) || / at /i.test(line)) {
      const co = extractCompanyFromInlineLine(line);
      if (co) addCompany(co);
      continue;
    }

    // Case 2: standalone line that looks like a company
    const nextLine = lines[i + 1] ?? "";
    const prevLine = lines[i - 1] ?? "";
    if (
      line.length >= 2 && line.length <= 80 &&
      !hasDate(line) && !isJobTitle(line) &&
      /^[A-Z]/.test(line) &&
      line.split(/\s+/).length <= 7 &&
      // Reject lines whose every word is a common role/adjective (e.g. "Senior Software Developer")
      !/^(senior|junior|lead|principal|staff|associate|trainee|chief|head)\s/i.test(line)
    ) {
      if (COMPANY_SUFFIXES.test(line) || hasDate(nextLine) || hasDate(prevLine)) {
        addCompany(line);
      }
    }

    // Case 3: look backwards from each UNAMBIGUOUS legal-entity suffix.
    // e.g. "Built distributed systems. Nitor Infotech Pvt. Ltd." → "Nitor Infotech Pvt. Ltd."
    // Only use suffixes that cannot appear inside a job title (no "software", "tech", "solutions" etc.)
    if (COMPANY_SUFFIXES.test(line)) {
      const UNAMBIGUOUS_SUFFIX_RE =
        /\b(pvt\.?\s*ltd\.?|ltd\.?|llc|inc\.?|corp\.?|gmbh|plc|holdings?|limited|infotech|innovations?|enterprises?|associates?|consultancy|partners?)\b/gi;
      for (const sfx of line.matchAll(UNAMBIGUOUS_SUFFIX_RE)) {
        const before = line.slice(0, sfx.index!).trimEnd();
        // Find the last run of capitalised words immediately before the suffix
        const capSeq = before.match(/([A-Z][A-Za-z0-9&]*(?:\s+[A-Z][A-Za-z0-9&.]*){0,6})\s*$/);
        if (capSeq) {
          const candidate = cleanToken(capSeq[1] + " " + sfx[0]);
          // Reject if the constructed name itself looks like a job title
          if (!JOB_TITLE_WORDS.test(candidate)) {
            addCompany(candidate);
          }
        }
      }
    }
  }

  // ── Raw text fallback ────────────────────────────────────────────────────────
  // If nothing found, scan raw text for pipe-delimited segments that look like companies.
  if (companies.length === 0) {
    for (const segment of text.split(/[|\n]/).map(cleanToken)) {
      if (segment.length < 3 || segment.length > 80) continue;
      if (!COMPANY_SUFFIXES.test(segment)) continue;
      if (!/^[A-Z]/.test(segment)) continue;
      if (hasDate(segment) || isJobTitle(segment)) continue;
      addCompany(segment);
    }
  }

  return companies;
}

// ── College ───────────────────────────────────────────────────────────────────

const EDU_HEADERS =
  /^(education(?:al(?:\s+background|\s+qualifications?)?)?|academics?(?:\s+background)?|qualifications?|schooling|educational?\s+(?:background|qualifications?|details?)|studies)/i;

/** Explicit institution-type keywords */
const COLLEGE_KEYWORDS =
  /\b(university|college|institute(?:s|d)?|iit(?:\s+[a-z]+)?|iim(?:\s+[a-z]+)?|nit(?:\s+[a-z]+)?|bits(?:\s+[a-z]+)?|nift|xlri|iisc|iiit(?:\s+[a-z]+)?|school\s+of|academy|polytechnic|deemed|autonomous|faculty\s+of)\b/i;

/** Broader institutional patterns (no explicit "college/university" needed) */
const INSTITUTION_PATTERNS =
  /\b(engineering|management|sciences?|(?:arts?\s+(?:and|&)\s+)?science|commerce|law|medical|dental|pharmacy|nursing|technology\s+(?:and|&)|campus)\b/i;

export const DEGREE_KEYWORDS =
  /\b(b\.?\s*tech|b\.?\s*e\.?|b\.?\s*sc\.?|b\.?\s*com\.?|b\.?\s*a\.?|m\.?\s*tech|m\.?\s*e\.?|m\.?\s*sc\.?|m\.?\s*b\.?\s*a\.?|ph\.?\s*d\.?|diploma|bachelor(?:\s+of\s+\w+)?|master(?:\s+of\s+\w+)?|degree|post\s*graduate|graduate)\b/i;

/** Returns true if a text segment looks like an institution name */
function isInstitutionSegment(s: string): boolean {
  if (!s || s.length < 4 || s.length > 180) return false;
  if (hasDate(s)) return false;
  if (/^\d/.test(s)) return false;
  if (!/^[A-Z]/.test(s)) return false;
  return COLLEGE_KEYWORDS.test(s) || INSTITUTION_PATTERNS.test(s);
}

/**
 * Given a line that may contain mixed degree + institution + date info,
 * attempt to extract just the institution name.
 *
 * Handles:
 *   "B.Tech  Ramdeobaba College of Engineering  2014-2018"   (double-space separated)
 *   "B.Tech | IIT Delhi | 2019"                              (pipe separated)
 *   "Bachelor of Technology from Anna University, 2020"      ("from" keyword)
 *   "M.Tech, Computer Science, VIT University"               (comma separated)
 */
function pickInstitutionFromLine(line: string): string | null {
  // ① "from X" or "at X" pattern
  const fromMatch = line.match(/\b(?:from|at)\s+([A-Z][^,|–\-\n()]{4,120})/i);
  if (fromMatch) {
    const candidate = cleanToken(fromMatch[1].replace(/\s*\d{4}.*$/, ""));
    if (candidate.length > 5 && (isInstitutionSegment(candidate) || candidate.length > 15)) {
      return candidate;
    }
  }

  // ② Split by double-spaces first (common in PDF-extracted text)
  const doubleSpaceSegs = line.split(/\s{2,}/).map(cleanToken).filter(Boolean);
  if (doubleSpaceSegs.length > 1) {
    for (const seg of doubleSpaceSegs) {
      if (!DEGREE_KEYWORDS.test(seg) && !hasDate(seg) && isInstitutionSegment(seg)) return seg;
    }
    // Relax: any non-degree, non-date, capitalised segment ≥ 10 chars
    for (const seg of doubleSpaceSegs) {
      if (!DEGREE_KEYWORDS.test(seg) && !hasDate(seg) && seg.length >= 10 && /^[A-Z]/.test(seg)) {
        return seg;
      }
    }
  }

  // ③ Split by pipe / comma
  if (/[|,]/.test(line)) {
    const segs = line.split(/[|,]/).map(cleanToken).filter(Boolean);
    for (const seg of segs) {
      if (!DEGREE_KEYWORDS.test(seg) && !hasDate(seg) && isInstitutionSegment(seg)) return seg;
    }
    // Relax
    for (const seg of segs) {
      if (!DEGREE_KEYWORDS.test(seg) && !hasDate(seg) && seg.length >= 8 && /^[A-Z]/.test(seg)) {
        return seg;
      }
    }
  }

  // ④ If the line itself (stripped of leading degree + trailing date) looks like an institution
  const stripped = line
    .replace(DEGREE_KEYWORDS, "")
    .replace(/\b\d{4}\s*[-–]\s*(?:\d{4}|present|current)\b/gi, "")
    .replace(/\b\d{4}\b/g, "")
    .trim();
  const strippedClean = cleanToken(stripped);
  if (strippedClean.length >= 8 && isInstitutionSegment(strippedClean)) return strippedClean;

  return null;
}

export function extractCollegeFromResumeText(text: string): string | null {
  const normalized = normalizeResumeText(text);
  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);
  let inEduSection = false;

  // ── Pass 1: inside detected education section ──────────────────────────────
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (EDU_HEADERS.test(line) && line.length < 70) { inEduSection = true; continue; }
    if (inEduSection && EXP_SECTION_END.test(line) && line.length < 70 && !EDU_HEADERS.test(line)) {
      inEduSection = false; continue;
    }
    if (!inEduSection) continue;

    // Line contains institution keywords → try to isolate the institution part
    if (COLLEGE_KEYWORDS.test(line) || INSTITUTION_PATTERNS.test(line)) {
      // If it also has a degree keyword, it's a mixed line — extract institution portion
      if (DEGREE_KEYWORDS.test(line)) {
        const inst = pickInstitutionFromLine(line);
        if (inst) return inst;
        // Fall through: return the whole line minus degree/date noise
        const stripped = cleanToken(
          line
            .replace(DEGREE_KEYWORDS, "")
            .replace(/\b\d{4}\s*[-–]\s*(?:\d{4}|present|current)\b/gi, "")
            .replace(/\b\d{4}\b/g, "")
        );
        if (stripped.length > 5) return stripped;
      }
      // Pure institution line
      if (line.length > 5 && line.length < 200) return cleanToken(line);
    }

    // Line is a degree line → look ahead AND within for institution
    if (DEGREE_KEYWORDS.test(line)) {
      // Within the same line
      const inst = pickInstitutionFromLine(line);
      if (inst) return inst;

      // Next 3 lines
      for (let k = i + 1; k <= i + 3 && k < lines.length; k++) {
        const next = lines[k];
        if (!next) continue;
        // Stop if we've hit another section header
        if (EXP_SECTION_END.test(next) && next.length < 60) break;
        if (DEGREE_KEYWORDS.test(next)) {
          // Another degree line — extract institution from it
          const ni = pickInstitutionFromLine(next);
          if (ni) return ni;
          continue;
        }
        if (isInstitutionSegment(next) && next.length > 5 && next.length < 180) return cleanToken(next);
        // Capitalised short-to-medium line right after degree = likely institution
        if (/^[A-Z]/.test(next) && !hasDate(next) && next.length >= 8 && next.length < 120 &&
            next.split(/\s+/).length <= 10) {
          return cleanToken(next);
        }
      }
    }
  }

  // ── Pass 2: full normalised text (outside education section too) ───────────
  for (const line of lines) {
    if ((COLLEGE_KEYWORDS.test(line) || INSTITUTION_PATTERNS.test(line)) &&
        line.length > 5 && line.length < 200) {
      if (DEGREE_KEYWORDS.test(line)) {
        const inst = pickInstitutionFromLine(line);
        if (inst) return inst;
      } else {
        return cleanToken(line);
      }
    }
  }

  // ── Pass 3: raw text — degree-adjacent institution search ─────────────────
  // Find every occurrence of a degree keyword in the raw text and look for a
  // capitalised institution-like phrase within 200 chars after it.
  const rawDegreeMatches = text.matchAll(
    /\b(?:b\.?tech|b\.?e\.?|b\.?sc|b\.?com|m\.?tech|m\.?e\.?|m\.?sc|m\.?b\.?a|ph\.?d|diploma|bachelor(?:\s+of\s+\w+)?|master(?:\s+of\s+\w+)?)\b/gi
  );
  for (const dm of rawDegreeMatches) {
    const after = text.slice(dm.index! + dm[0].length, dm.index! + dm[0].length + 250);
    // Try "from X" or "at X"
    const fromM = after.match(/\s*(?:from|at|–|-|,|:|\|)\s*([A-Z][^,|–\-\n()]{4,120})/);
    if (fromM) {
      const seg = cleanToken(fromM[1].replace(/\s*\d{4}.*$/, ""));
      if (seg.length >= 6 && (isInstitutionSegment(seg) || seg.split(/\s+/).length >= 3)) {
        return seg;
      }
    }
  }

  // ── Pass 4: raw text — any line with college keyword ──────────────────────
  for (const rawLine of text.split("\n").map((l) => l.trim())) {
    if (COLLEGE_KEYWORDS.test(rawLine) && rawLine.length > 5) {
      if (DEGREE_KEYWORDS.test(rawLine)) {
        const inst = pickInstitutionFromLine(rawLine);
        if (inst) return inst;
      } else if (rawLine.length < 200) {
        return cleanToken(rawLine);
      }
    }
  }

  return null;
}

// ── Degree ────────────────────────────────────────────────────────────────────
//
// Extracts the qualification/degree string (e.g. "B.Tech in Computer Science",
// "Master of Business Administration") — separate from the institution name.

const DEGREE_DISPLAY_RE =
  /\b((?:bachelor(?:'s)?|master(?:'s)?|b\.?\s*tech|b\.?\s*e\.?|b\.?\s*sc\.?|b\.?\s*com\.?|b\.?\s*a\.?|m\.?\s*tech|m\.?\s*e\.?|m\.?\s*sc\.?|m\.?\s*b\.?\s*a\.?|ph\.?\s*d\.?|diploma|post\s*graduate|graduate)(?:\s+(?:of|in|of\s+\w+(?:\s+\w+)?|in\s+\w+(?:\s+\w+)?))?(?:\s*[-–(]\s*[A-Za-z &/,]+[)]?)?)/gi;

/** Extract "B.Tech in Computer Science" style degree strings from the education section */
export function extractDegreeFromResumeText(text: string): string | null {
  const normalized = normalizeResumeText(text);
  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);
  let inEduSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (EDU_HEADERS.test(line) && line.length < 70) { inEduSection = true; continue; }
    if (inEduSection && EXP_SECTION_END.test(line) && line.length < 70 && !EDU_HEADERS.test(line)) {
      inEduSection = false; continue;
    }
    if (!inEduSection) continue;

    const matches = [...line.matchAll(DEGREE_DISPLAY_RE)];
    if (matches.length > 0) {
      // Take the longest / most descriptive degree match
      const best = matches.reduce((a, b) => (a[0].length >= b[0].length ? a : b));
      const deg = cleanToken(best[0]);
      if (deg.length >= 3) return deg;
    }
  }

  // Fallback: search whole text for a degree keyword
  const allMatches = [...text.matchAll(DEGREE_DISPLAY_RE)];
  if (allMatches.length > 0) {
    const best = allMatches.reduce((a, b) => (a[0].length >= b[0].length ? a : b));
    const deg = cleanToken(best[0]);
    if (deg.length >= 3) return deg;
  }

  return null;
}

// ── Skills ────────────────────────────────────────────────────────────────────
//
// Scan the full resume text for a curated list of known tech skills.
// Sorted longest-first so multi-word skills (e.g. "React Native") match
// before their sub-strings (e.g. "React").

const KNOWN_SKILLS: string[] = [
  // ── Languages ──────────────────────────────────────────────────────────────
  "TypeScript", "JavaScript", "Python", "Java", "C#", "C++", "Golang", "Go",
  "Kotlin", "Swift", "Rust", "Scala", "Ruby", "PHP", "R", "MATLAB", "Dart",
  "Elixir", "Haskell", "Perl", "Shell", "Bash", "PowerShell", "Groovy",
  // ── Web / Frontend ─────────────────────────────────────────────────────────
  "React Native", "Next.js", "Nuxt.js", "Nuxt", "React", "Angular",
  "Vue.js", "Vue", "Svelte", "Ember.js",
  "Tailwind CSS", "Bootstrap", "Material UI", "Ant Design", "Chakra UI",
  "HTML5", "CSS3", "HTML", "CSS", "SASS", "SCSS", "Webpack", "Vite",
  "Redux", "Zustand", "MobX", "GraphQL", "Apollo",
  // ── Backend / Frameworks ───────────────────────────────────────────────────
  "Node.js", "Express.js", "Express", "NestJS", "Fastify",
  "Django", "Flask", "FastAPI", "Celery",
  "Spring Boot", "Spring", "Hibernate", "Struts",
  "ASP.NET Core", "ASP.NET", ".NET Core", ".NET",
  "Laravel", "Symfony", "CodeIgniter",
  "Ruby on Rails", "Rails", "Sinatra",
  "gRPC", "REST API", "RESTful", "WebSockets", "WebSocket",
  "Microservices", "Event-Driven Architecture",
  // ── Databases ─────────────────────────────────────────────────────────────
  "PostgreSQL", "MySQL", "Microsoft SQL Server", "SQL Server", "Oracle DB",
  "MongoDB", "Mongoose", "Cassandra", "DynamoDB", "Cosmos DB",
  "Redis", "Memcached", "Elasticsearch", "OpenSearch",
  "SQLite", "MariaDB", "CockroachDB", "Supabase", "Firebase", "PlanetScale",
  "SQL", "NoSQL",
  // ── Cloud ──────────────────────────────────────────────────────────────────
  "Amazon Web Services", "AWS", "Microsoft Azure", "Azure",
  "Google Cloud Platform", "GCP", "Google Cloud",
  "Heroku", "Vercel", "Netlify", "DigitalOcean", "Cloudflare",
  "AWS Lambda", "AWS EC2", "AWS S3", "AWS RDS", "AWS EKS",
  "Azure DevOps", "Azure Functions",
  // ── DevOps / Infrastructure ────────────────────────────────────────────────
  "Kubernetes", "Docker", "Helm", "Terraform", "Ansible", "Puppet", "Chef",
  "Jenkins", "GitHub Actions", "GitLab CI", "CircleCI", "Travis CI",
  "CI/CD", "ArgoCD", "Flux", "Prometheus", "Grafana", "Datadog",
  "Nginx", "Apache", "Linux", "Unix",
  // ── Data / ML / AI ────────────────────────────────────────────────────────
  "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "XGBoost", "LightGBM",
  "Hugging Face", "LangChain", "OpenAI", "LLM", "RAG", "NLP",
  "Apache Spark", "Spark", "Hadoop", "Kafka", "Flink", "Airflow",
  "dbt", "Databricks", "Snowflake", "BigQuery", "Redshift",
  "Pandas", "NumPy", "Matplotlib", "Seaborn",
  "Power BI", "Tableau", "Looker", "Metabase",
  // ── Mobile ────────────────────────────────────────────────────────────────
  "Flutter", "SwiftUI", "Jetpack Compose", "Android", "iOS",
  "Xamarin", "Ionic", "Capacitor", "Expo",
  // ── Messaging / Event Streaming ────────────────────────────────────────────
  "RabbitMQ", "Apache Kafka", "SQS", "SNS", "Pub/Sub", "NATS",
  "ActiveMQ", "Azure Service Bus",
  // ── Testing ────────────────────────────────────────────────────────────────
  "Jest", "Mocha", "Chai", "Cypress", "Playwright", "Selenium",
  "JUnit", "TestNG", "Pytest", "xUnit", "NUnit",
  // ── Architecture / Patterns ────────────────────────────────────────────────
  "Clean Architecture", "Domain-Driven Design", "DDD",
  "CQRS", "Event Sourcing", "Hexagonal Architecture",
  "Design Patterns", "SOLID", "TDD", "BDD",
  // ── Tools ─────────────────────────────────────────────────────────────────
  "Git", "GitHub", "GitLab", "Bitbucket",
  "JIRA", "Confluence", "Notion", "Slack",
  "Figma", "Sketch", "Adobe XD",
  "Postman", "Swagger", "OpenAPI",
  "VS Code", "IntelliJ", "Eclipse", "Xcode",
];

// Build regex map once at module load — longest patterns first
const SKILLS_REGEX_MAP: Array<{ skill: string; re: RegExp }> = [...KNOWN_SKILLS]
  .sort((a, b) => b.length - a.length)
  .map((skill) => ({
    skill,
    re: new RegExp(
      `(?<![A-Za-z0-9])${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s.\\-]+")}(?![A-Za-z0-9])`,
      "i"
    ),
  }));

/**
 * Scan the full resume text for known technical skills.
 * Returns up to 25 unique skills ordered by first occurrence.
 */
export function extractSkillsFromResumeText(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();

  for (const { skill, re } of SKILLS_REGEX_MAP) {
    if (found.length >= 25) break;
    if (re.test(text) && !found.some((s) => s.toLowerCase() === skill.toLowerCase())) {
      // Only skip if an already-found skill is a strict superset of the candidate
      // e.g. skip "React" if "React Native" is already in the list
      const superseded = found.some(
        (s) => s.toLowerCase().includes(skill.toLowerCase()) && s.length > skill.length
      );
      if (!superseded) {
        // Remove any existing entry that is a strict subset of this new skill
        const subsetIdx = found.findIndex(
          (s) => skill.toLowerCase().includes(s.toLowerCase()) && skill.length > s.length
        );
        if (subsetIdx !== -1) found.splice(subsetIdx, 1);
        found.push(skill);
      }
    }
  }

  // Sort by position of first occurrence so most prominent skills come first
  return found.sort((a, b) => {
    const ia = lower.indexOf(a.toLowerCase());
    const ib = lower.indexOf(b.toLowerCase());
    return ia - ib;
  });
}

// ── Combined extractor ────────────────────────────────────────────────────────

export function extractResumeMetadata(text: string): ResumeMetadata {
  return {
    phone: extractPhoneFromResumeText(text),
    linkedinUrl: extractLinkedInFromResumeText(text),
    githubUrl: extractGitHubFromResumeText(text),
    companies: extractCompaniesFromResumeText(text),
    skills: extractSkillsFromResumeText(text),
    degree: extractDegreeFromResumeText(text),
    college: extractCollegeFromResumeText(text),
    profileSummary: extractProfileSummaryFromResumeText(text),
  };
}
