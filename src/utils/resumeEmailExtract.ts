/** Extract candidate email from resume plain text (header/contact block). */

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

const SKIP_DOMAINS = new Set([
  "example.com",
  "yourname.com",
  "youremail.com",
  "email.com",
  "domain.com",
  "company.com",
  "gmail.com.example",
  "test.com",
]);

function isLikelyPersonalEmail(email: string): boolean {
  const lower = email.toLowerCase();
  const domain = lower.split("@")[1] ?? "";

  if (SKIP_DOMAINS.has(domain)) return false;

  if (
    lower.includes("example") ||
    lower.includes("youremail") ||
    lower.includes("yourname") ||
    lower.includes("@test.")
  ) {
    return false;
  }

  return true;
}

/** Extract the first real email address from resume text (searches header lines first). */
export function extractEmailFromResumeText(text: string): string | null {
  if (!text?.trim()) return null;

  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);

  const headerLines = lines.slice(0, 40);
  for (const line of headerLines) {
    const matches = line.match(EMAIL_REGEX);
    if (!matches) continue;
    for (const match of matches) {
      const email = match.toLowerCase().trim();
      if (isLikelyPersonalEmail(email)) return email;
    }
  }

  const allMatches = normalized.match(EMAIL_REGEX);
  if (!allMatches) return null;
  for (const match of allMatches) {
    const email = match.toLowerCase().trim();
    if (isLikelyPersonalEmail(email)) return email;
  }

  return null;
}
